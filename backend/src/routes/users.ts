import { Router } from 'express';
const { body } = require('express-validator');
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  updateUserRole,
  updateUserStreak,
  getProfile,
  updateProfile,
  getPublicProfile
} from '@/controllers/userController';
import {
  authenticate,
  authorize,
  authorizeRole,
  requireOwnershipOrAdmin
} from '@/middleware/auth';
import {
  validateRoleUpdate,
  validateUserId,
  validateProfileUpdate,
  validateUserQuery,
  validateBusinessRules,
  validate
} from '@/middleware/validation';
import { apiLimiter } from '@/middleware/security';

const router = Router();

router.use(authenticate);

router.use(apiLimiter);

router.get('/profile', getProfile);
router.put('/profile',
  validate(validateProfileUpdate),
  updateProfile
);

router.get('/profile/:username', getPublicProfile);

router.get('/',
  authorize('manage_users'),
  validate(validateUserQuery),
  getUsers
);

router.get('/statistics',
  authorize('manage_users'),
  getUserStats
);

router.get('/:id',
  validate(validateUserId),
  requireOwnershipOrAdmin(),
  getUser
);

router.put('/:id',
  validate([...validateUserId, ...validateProfileUpdate]),
  requireOwnershipOrAdmin(),
  validateBusinessRules,
  updateUser
);

router.delete('/:id',
  validate(validateUserId),
  authorizeRole('Teacher', 'Owner'),
  validateBusinessRules,
  deleteUser
);

router.put('/:id/role',
  validate(validateRoleUpdate),
  authorize('manage_roles'),
  validateBusinessRules,
  updateUserRole
);

router.put('/:id/streak',
  validate([
    ...validateUserId,
    body('streak')
      .isInt({ min: 0, max: 10000 })
      .withMessage('Streak must be a number between 0 and 10000')
  ]),
  requireOwnershipOrAdmin(),
  updateUserStreak
);

export default router;