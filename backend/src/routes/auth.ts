import { Router } from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  completeSetup,
  checkUsername,
  refreshToken,
  deleteAccount,
  requestPasswordReset,
  resetPassword
} from '@/controllers/authController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validate
} from '@/middleware/validation';
import {
  authLimiter,
  passwordResetLimiter,
  registrationLimiter
} from '@/middleware/security';

const router = Router();

router.post('/register',
  registrationLimiter,
  validate(validateRegistration),
  register
);

router.post('/login',
  authLimiter,
  validate(validateLogin),
  login
);

router.get('/check-username/:username',
  authLimiter,
  checkUsername
);

// Password reset routes (public, rate-limited)
router.post('/forgot-password',
  passwordResetLimiter,
  requestPasswordReset
);

router.post('/reset-password',
  passwordResetLimiter,
  resetPassword
);

router.post('/refresh-token',
  authLimiter,
  refreshToken
);

router.use((req, res, next) => {
  if (req.path.startsWith('/google/')) {
    return next();
  }
  return authenticate(req, res, next);
});

router.post('/logout', logout);

router.get('/profile', getProfile);

router.put('/profile',
  validate(validateProfileUpdate),
  updateProfile
);

router.post('/complete-setup',
  validate(validateProfileUpdate),
  completeSetup
);

router.delete('/account',
  authenticate,
  deleteAccount
);

export default router;