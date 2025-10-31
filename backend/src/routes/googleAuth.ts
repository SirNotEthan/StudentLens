import { Router, Request, Response } from 'express';
import passport from '@/config/passport';
import jwt from 'jsonwebtoken';
import { appLogger } from '@/services/logger';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, JWTPayload } from '@/types';

const router = Router();

// Debug endpoint to check OAuth configuration
router.get('/google/debug', (req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;
  const clientUrl = process.env.CLIENT_URL;

  // Manually construct OAuth URL to test
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ];

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId || '')}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl || '')}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&access_type=offline` +
    `&prompt=select_account`;

  res.json({
    configured: !!(clientId && callbackUrl),
    clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET',
    callbackUrl: callbackUrl || 'NOT SET',
    clientUrl: clientUrl || 'NOT SET',
    scopes: scopes,
    manualOAuthUrl: oauthUrl,
    message: 'Try the manualOAuthUrl in your browser to test OAuth directly'
  });
});

// Manual OAuth test (bypasses Passport entirely)
router.get('/google/test-manual', (req: Request, res: Response): void => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    res.status(500).json({ error: 'OAuth not configured' });
    return;
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'openid'
  ].join(' ');

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline`;

  console.log('MANUAL OAUTH: Redirecting to:', oauthUrl);
  res.redirect(oauthUrl);
});

router.get('/google/signup',
  (req: Request, res: Response, next: any) => {
    appLogger.info('Google OAuth signup initiated', {
      ip: req.ip,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      clientUrl: process.env.CLIENT_URL
    });

    console.log('GOOGLE_AUTH: Signup route hit');
    console.log('GOOGLE_AUTH: GOOGLE_CALLBACK_URL =', process.env.GOOGLE_CALLBACK_URL);

    (req.session as any).oauthIntent = 'signup';
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    accessType: 'offline'
  })
);

router.get('/google/signin',
  (req: Request, res: Response, next: any) => {
    appLogger.info('Google OAuth signin initiated', {
      ip: req.ip,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      clientUrl: process.env.CLIENT_URL
    });

    console.log('GOOGLE_AUTH: Signin route hit');
    console.log('GOOGLE_AUTH: GOOGLE_CALLBACK_URL =', process.env.GOOGLE_CALLBACK_URL);

    (req.session as any).oauthIntent = 'signin';
    next();
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline'
  })
);

router.get('/google/callback',
  (req: Request, res: Response, next: any) => {
    console.log('GOOGLE_AUTH: Callback route hit');
    console.log('GOOGLE_AUTH: Query params:', req.query);
    console.log('GOOGLE_AUTH: Full callback URL:', req.protocol + '://' + req.get('host') + req.originalUrl);

    appLogger.info('Google OAuth callback received', {
      query: req.query,
      fullUrl: req.protocol + '://' + req.get('host') + req.originalUrl
    });

    next();
  },
  passport.authenticate('google', { session: false }),
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as any;
    const requestedIntent = (req.session as any)?.oauthIntent || 'signin';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    console.log('GOOGLE_AUTH: Authentication complete, user:', user ? user.id : 'none');

    if (!user) {
      appLogger.error('Google OAuth callback: No user returned');
      return res.redirect(`${clientUrl}/login?error=oauth_failed`);
    }

    try {
      const userCreationTime = new Date(user.createdAt).getTime();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const isNewUser = userCreationTime > fiveMinutesAgo;

      const actualIntent = isNewUser ? 'signup' : 'login';

      const payload: JWTPayload = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      const token = (jwt.sign as any)(
        payload,
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      await user.updateLastLogin();

      appLogger.logAuth(actualIntent === 'signup' ? 'register' : 'login', user.id, {
        provider: 'google',
        requestedIntent,
        actualIntent,
        isNewUser,
        ip: req.ip
      }, req);

      delete (req.session as any).oauthIntent;

      const redirectUrl = `${clientUrl}/auth/callback?token=${token}`;

      appLogger.info('Google OAuth successful', {
        userId: user.id,
        requestedIntent,
        actualIntent,
        isNewUser,
        redirectUrl: redirectUrl.split('?')[0] // Log URL without token
      });

      res.redirect(redirectUrl);
    } catch (error: any) {
      appLogger.error('Google OAuth token generation failed', error);
      res.redirect(`${clientUrl}/login?error=token_generation_failed`);
    }
  })
);

router.get('/google/profile', catchAsync(async (req: Request, res: Response): Promise<void> => {
  appLogger.info('Google profile route accessed', { ip: req.ip });

  const response: ApiResponse = {
    success: true,
    message: 'Google OAuth is now implemented',
    data: {
      endpoints: {
        signup: '/api/auth/google/signup',
        signin: '/api/auth/google/signin',
        callback: '/api/auth/google/callback'
      },
      status: 'active'
    }
  };

  res.json(response);
}));

export default router;