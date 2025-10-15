import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User } from '@/models/User';
import { appLogger } from '@/services/logger';
import { UserRole } from '@/types';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!
}, async (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
  try {
    appLogger.info('Google OAuth profile received', {
      googleId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName
    });

    const googleId = profile.id;
    const email = profile.emails?.[0]?.value || '';

    appLogger.info('Google OAuth attempt', {
      googleId: googleId,
      email: email,
      profileName: profile.displayName
    });

    const existingUser = await User.findByGoogleId(googleId);
    if (existingUser) {
      appLogger.info('Existing Google user found - login', {
        userId: existingUser.id,
        email: existingUser.email,
        isDeleted: existingUser.prefs?.isDeleted || false
      });
      await existingUser.ensureDatabaseRecord();
      return done(null, existingUser);
    }

    appLogger.info('No existing Google user found, checking email');

    const emailUser = await User.findByEmail(email);
    if (emailUser) {
      appLogger.info('Found existing user with same email - linking accounts', {
        userId: emailUser.id,
        email: emailUser.email,
        isDeleted: emailUser.prefs?.isDeleted || false
      });
      await emailUser.updatePrefs({
        googleId: profile.id,
        provider: 'google'
      });
      await emailUser.ensureDatabaseRecord();
      appLogger.info('Linked Google account to existing email user - login', {
        userId: emailUser.id,
        email: emailUser.email
      });
      return done(null, emailUser);
    }

    appLogger.info('No existing user found - creating new user');

    const firstName = profile.name?.givenName || '';
    const lastName = profile.name?.familyName || '';
    const profileImage = profile.photos?.[0]?.value || '';

    if (!email) {
      appLogger.error('No email provided by Google OAuth');
      return done(new Error('No email provided by Google OAuth'), null);
    }

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
      needsSetup: true, // Google users need to confirm their profile details
      password: undefined // No password for OAuth users
    });

    appLogger.info('New Google user created - signup', {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
      createdAt: newUser.createdAt
    });

    return done(null, newUser);
  } catch (error: any) {
    appLogger.error('Google OAuth error', error);
    return done(error, null);
  }
}));

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