import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User } from '@/models/User';
import { appLogger } from '@/services/logger';
import { UserRole } from '@/types';

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  appLogger.info('Configuring Google OAuth Strategy', {
    callbackUrl: process.env.GOOGLE_CALLBACK_URL
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (_accessToken: string, _refreshToken: string, profile: Profile, done: any) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value || '';

      appLogger.info('Google OAuth attempt', {
        googleId,
        email,
        profileName: profile.displayName
      });

      // 1. Check if user already linked via Google ID
      const existingUser = await User.findByGoogleId(googleId);
      if (existingUser) {
        appLogger.info('Existing Google user found - login', {
          userId: existingUser.id,
          email: existingUser.email
        });
        await existingUser.ensureDatabaseRecord();
        return done(null, existingUser);
      }

      // 2. Check if an account with this email already exists
      const emailUser = await User.findByEmail(email);
      if (emailUser) {
        // Only auto-link if the existing account was ALSO created via Google (provider='google')
        // or if the account has no password set (was a Google-only account that somehow lost its googleId).
        // Do NOT auto-link email/password accounts — this prevents account takeover.
        if (emailUser.provider === 'google') {
          appLogger.info('Linking Google account to existing Google-provider user', {
            userId: emailUser.id,
            email: emailUser.email
          });
          await emailUser.updatePrefs({
            googleId: profile.id,
            provider: 'google'
          });
          await emailUser.ensureDatabaseRecord();
          return done(null, emailUser);
        }

        // For email/password accounts, reject the linking to prevent account takeover
        appLogger.logSecurityEvent('google_oauth_email_conflict', {
          email,
          existingProvider: emailUser.provider,
          googleId
        });
        return done(null, false, {
          message: 'An account with this email already exists. Please log in with your password first, then link your Google account from settings.'
        });
      }

      // 3. Create new user
      if (!email) {
        appLogger.error('No email provided by Google OAuth');
        return done(new Error('No email provided by Google OAuth'), null);
      }

      const firstName = profile.name?.givenName || '';
      const lastName = profile.name?.familyName || '';
      const profileImage = profile.photos?.[0]?.value || '';

      const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      let username = baseUsername;
      let counter = 1;

      while (await User.findByUsername(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const newUser = await User.create({
        email,
        username,
        firstName,
        lastName,
        role: 'Student' as UserRole,
        profileImage,
        provider: 'google',
        googleId: profile.id,
        isActive: true,
        needsSetup: true,
        password: undefined
      });

      appLogger.info('New Google user created - signup', {
        userId: newUser.id,
        email: newUser.email,
        username: newUser.username
      });

      return done(null, newUser);
    } catch (error: any) {
      appLogger.error('Google OAuth error', error);
      return done(error, null);
    }
  }));

  appLogger.info('Google OAuth strategy configured');
} else {
  appLogger.warn('Google OAuth is not configured - missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
