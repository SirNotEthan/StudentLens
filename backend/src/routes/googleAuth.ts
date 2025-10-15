import { Router, Request, Response } from 'express';
import passport from '@/config/passport';
import jwt from 'jsonwebtoken';
import { appLogger } from '@/services/logger';
import { AppError } from '@/utils/AppError';
import { catchAsync } from '@/middleware/errorHandler';
import { ApiResponse, JWTPayload } from '@/types';

const router = Router();

router.get('/google/signup', catchAsync(async (req: Request, res: Response): Promise<void> => {
  appLogger.info('Google OAuth signup initiated', { ip: req.ip });

  (req.session as any).oauthIntent = 'signup';

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account' // Force account selection for signup
  })(req, res);
}));

router.get('/google/signin', catchAsync(async (req: Request, res: Response): Promise<void> => {
  appLogger.info('Google OAuth signin initiated', { ip: req.ip });

  (req.session as any).oauthIntent = 'signin';

  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res);
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as any;
    const requestedIntent = (req.session as any)?.oauthIntent || 'signin';
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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