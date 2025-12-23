const { body, param, query, validationResult } = require('express-validator');
type ValidationChain = any;
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';

export const sanitizeString = (value: any): string => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

export const sanitizeHTML = (value: any): string => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    appLogger.warn('Validation failed', {
      endpoint: req.originalUrl,
      method: req.method,
      errors: errorMessages,
      userId: (req as any).user?.id
    });

    const errorMessage = errorMessages.map(err => `${err.field}: ${err.message}`).join(', ');
    throw AppError.badRequest(`Validation failed: ${errorMessage}`);
  }

  next();
};

export const validateRegistration: ValidationChain[] = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString)
    .custom(async (value) => {
      const reservedUsernames = ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp'];
      if (reservedUsernames.includes(value.toLowerCase())) {
        throw new Error('This username is reserved');
      }
      return true;
    }),

  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .custom(async (value) => {
      const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
      const domain = value.split('@')[1]?.toLowerCase();
      if (disposableDomains.includes(domain)) {
        throw new Error('Disposable email addresses are not allowed');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
    .custom((value) => {
      const commonPasswords = ['password123', '12345678', 'qwerty123'];
      if (commonPasswords.includes(value.toLowerCase())) {
        throw new Error('Password is too common');
      }
      return true;
    }),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('role')
    .optional()
    .isIn(['Student', 'Writer', 'Editor', 'Teacher', 'Owner'] as UserRole[])
    .withMessage('Invalid role specified'),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .customSanitizer(sanitizeHTML),

  body('profileImage')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Profile image must be a valid URL')
    .isLength({ max: 2048 })
    .withMessage('Profile image URL too long')
];

export const validateLogin: ValidationChain[] = [
  body('login')
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Login must be between 3 and 255 characters')
    .customSanitizer(sanitizeString),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password length invalid')
];

export const validateProfileUpdate: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes')
    .customSanitizer(sanitizeString),

  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .customSanitizer(sanitizeHTML),

  body('profileImage')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('Profile image must be a valid URL or empty');
      }
      return true;
    })
    .isLength({ max: 2048 })
    .withMessage('Profile image URL too long')
];

export const validatePasswordChange: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

export const validateRoleUpdate: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid user ID format')
    .customSanitizer(sanitizeString),

  body('role')
    .isIn(['Student', 'Writer', 'Editor', 'Teacher', 'Owner'] as UserRole[])
    .withMessage('Invalid role specified')
    .custom((value, { req }) => {
      const currentUser = (req as any).user;
      if (currentUser && currentUser.id === req.params?.id && value === 'Owner') {
        throw new Error('Cannot change your own role to Owner');
      }
      return true;
    })
];

export const validateUserId: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid user ID format')
    .customSanitizer(sanitizeString)
];

export const validateUserQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('role')
    .optional()
    .isIn(['all', 'Student', 'Writer', 'Editor', 'Teacher', 'Owner'])
    .withMessage('Invalid role filter'),

  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters')
    .customSanitizer(sanitizeString),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'username', 'email', 'role'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

export const validateApiKey: ValidationChain[] = [
  body('apiKey')
    .optional()
    .isLength({ min: 32, max: 256 })
    .withMessage('API key must be between 32 and 256 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('API key contains invalid characters')
];

export const validateFileUpload = (fieldName: string, maxSize: number = 5 * 1024 * 1024) => [
  body(fieldName)
    .optional()
    .custom((value, { req }) => {
      const file = (req as any).files?.[fieldName];
      if (!file) return true;

      if (file.size > maxSize) {
        throw new Error(`File size cannot exceed ${Math.round(maxSize / 1024 / 1024)}MB`);
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (fieldName === 'profileImage' && !allowedTypes.includes(file.mimetype)) {
        throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
      }

      return true;
    })
];

export const validateIPAddress = (ip: string): boolean => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

export const validateBusinessRules = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as any).user;
  const method = req.method;
  const endpoint = req.originalUrl;

  appLogger.debug('Business rule validation', {
    userId: user?.id,
    method,
    endpoint,
    userRole: user?.role
  });

  if (method === 'DELETE' && endpoint.includes('/users/')) {
    const targetUserId = req.params.id;
    if (user && user.id === targetUserId) {
      throw AppError.badRequest('Cannot delete your own account');
    }

    if (user && !['Teacher', 'Owner'].includes(user.role)) {
      throw AppError.forbidden('Insufficient privileges to delete users');
    }
  }

  if (method === 'PUT' && endpoint.includes('/role')) {
    
    if (req.body.role === 'Owner' && user && user.role !== 'Owner') {
      throw AppError.forbidden('Only Owners can assign the Owner role');
    }
  }

  next();
};

export const validate = (validations: ValidationChain[]) => {
  return [
    ...validations,
    handleValidationErrors
  ];
};

export const validateCreatePost: ValidationChain[] = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .customSanitizer(sanitizeString),

  body('content')
    .notEmpty()
    .withMessage('Content is required')
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be between 10 and 50,000 characters')
    .customSanitizer(sanitizeHTML),

  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters')
    .customSanitizer(sanitizeString),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Category can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(sanitizeString),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),

  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(sanitizeString),

  body('status')
    .optional()
    .isIn(['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'])
    .withMessage('Status must be one of: draft, pending_editor, pending_reviewer, published, archived'),

  body('featuredImage')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('Featured image must be a valid URL or empty');
      }
      return true;
    })
    .isLength({ max: 2048 })
    .withMessage('Featured image URL cannot exceed 2048 characters')
];

export const validateUpdatePost: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Post ID is required'),

  body('title')
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters')
    .customSanitizer(sanitizeString),

  body('content')
    .optional()
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be between 10 and 50,000 characters')
    .customSanitizer(sanitizeHTML),

  body('excerpt')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters')
    .customSanitizer(sanitizeString),

  body('category')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Category can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(sanitizeString),

  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),

  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/)
    .withMessage('Tags can only contain letters, numbers, spaces, and hyphens')
    .customSanitizer(sanitizeString),

  body('status')
    .optional()
    .isIn(['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'])
    .withMessage('Status must be one of: draft, pending_editor, pending_reviewer, published, archived'),

  body('featuredImage')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(value)) {
        throw new Error('Featured image must be a valid URL or empty');
      }
      return true;
    })
    .isLength({ max: 2048 })
    .withMessage('Featured image URL cannot exceed 2048 characters')
];

export const validatePostId: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Post ID is required')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid post ID format')
];

export const validatePostIdParam: ValidationChain[] = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Invalid post ID format')
];

export const validatePostQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be a positive integer between 1 and 1000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('status')
    .optional()
    .isIn(['draft', 'pending_editor', 'pending_reviewer', 'published', 'archived'])
    .withMessage('Status must be one of: draft, pending_editor, pending_reviewer, published, archived'),

  query('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category must be between 1 and 50 characters')
    .customSanitizer(sanitizeString),

  query('authorId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Author ID must be between 1 and 100 characters')
    .customSanitizer(sanitizeString)
];

export const validateCreateApplication: ValidationChain[] = [
  body('reason')
    .notEmpty()
    .withMessage('Reason for applying is required')
    .isLength({ min: 50, max: 1000 })
    .withMessage('Reason must be between 50 and 1000 characters')
    .customSanitizer(sanitizeHTML),

  body('writingSample')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Writing sample cannot exceed 5000 characters')
    .customSanitizer(sanitizeHTML)
];

export const validateReviewApplication: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Application ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid application ID format')
    .customSanitizer(sanitizeString),

  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected')
];

export const validateCreateComment: ValidationChain[] = [
  body('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid post ID format')
    .customSanitizer(sanitizeString),

  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
    .customSanitizer(sanitizeHTML),

  body('parentId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid parent comment ID format')
    .customSanitizer(sanitizeString)
];

export const validateUpdateComment: ValidationChain[] = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid comment ID format')
    .customSanitizer(sanitizeString),

  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters')
    .customSanitizer(sanitizeHTML)
];

export const validateCommentId: ValidationChain[] = [
  param('commentId')
    .notEmpty()
    .withMessage('Comment ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid comment ID format')
    .customSanitizer(sanitizeString)
];