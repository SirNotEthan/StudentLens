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
  deleteAccount
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
  checkUsername
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

router.post('/refresh-token',
  refreshToken
);

router.delete('/account',
  authenticate,
  deleteAccount
);

export default router;