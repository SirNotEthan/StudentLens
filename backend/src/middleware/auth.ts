import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { AuthenticatedRequest, JWTPayload, Permission, UserRole } from '@/types';
import { AppError } from '@/utils/AppError';
import { appLogger } from '@/services/logger';
import { catchAsync } from '@/middleware/errorHandler';
import { isTokenRevoked } from '@/utils/generateToken';

const authAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_AUTH_ATTEMPTS = 5;
const AUTH_WINDOW = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of authAttempts.entries()) {
    if (now - data.lastAttempt > AUTH_WINDOW) {
      authAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const isRateLimited = (ip: string): boolean => {
  const attempts = authAttempts.get(ip);
  if (!attempts) return false;

  const now = Date.now();
  if (now - attempts.lastAttempt > AUTH_WINDOW) {
    authAttempts.delete(ip);
    return false;
  }

  return attempts.count >= MAX_AUTH_ATTEMPTS;
};

const recordFailedAttempt = (ip: string): void => {
  const now = Date.now();
  const current = authAttempts.get(ip) || { count: 0, lastAttempt: 0 };

  if (now - current.lastAttempt > AUTH_WINDOW) {
    current.count = 1;
  } else {
    current.count++;
  }

  current.lastAttempt = now;
  authAttempts.set(ip, current);
};

const clearFailedAttempts = (ip: string): void => {
  authAttempts.delete(ip);
};

const extractToken = (req: AuthenticatedRequest): string | null => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  if (req.query?.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

const validateTokenStructure = (token: string): boolean => {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

export const authenticate = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  try {
    if (isRateLimited(clientIp)) {
      appLogger.logSecurityEvent('auth_rate_limited', { ip: clientIp }, req);
      throw AppError.tooManyRequests('Too many authentication attempts. Please try again later.');
    }

    const token = extractToken(req);
    if (!token) {
      recordFailedAttempt(clientIp);
      appLogger.logAuth('failed_login', undefined, { reason: 'no_token', ip: clientIp }, req);
      throw AppError.unauthorized('Access denied. No token provided.');
    }

    if (!validateTokenStructure(token)) {
      recordFailedAttempt(clientIp);
      appLogger.logSecurityEvent('invalid_token_structure', { ip: clientIp }, req);
      throw AppError.unauthorized('Invalid token format.');
    }

    // Check if token has been revoked (e.g., after logout)
    if (await isTokenRevoked(token)) {
      recordFailedAttempt(clientIp);
      appLogger.logSecurityEvent('revoked_token_used', { ip: clientIp }, req);
      throw AppError.unauthorized('Token has been revoked.');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    if (!decoded.id || !decoded.email) {
      recordFailedAttempt(clientIp);
      appLogger.logSecurityEvent('invalid_token_payload', { ip: clientIp, payload: decoded }, req);
      throw AppError.unauthorized('Invalid token payload.');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      recordFailedAttempt(clientIp);
      appLogger.logAuth('failed_login', decoded.id, { reason: 'user_not_found', ip: clientIp }, req);
      throw AppError.unauthorized('Invalid token. User not found.');
    }

    if (!user.isActive) {
      recordFailedAttempt(clientIp);
      appLogger.logAuth('failed_login', user.id, { reason: 'user_inactive', ip: clientIp }, req);
      throw AppError.unauthorized('Account is inactive.');
    }

    clearFailedAttempts(clientIp);

    (req as any).user = {
      ...user,
      userId: user.id,
      hasPermission: (permission: Permission) => user.hasPermission(permission),
      canAccess: (resource: string, action: string) => user.canAccess(resource, action),
      updatePrefs: (prefs: any) => user.updatePrefs(prefs),
      completeSetup: (setupData: any) => user.completeSetup(setupData),
      deleteAccount: () => user.deleteAccount(),
      fixUserDataConsistency: () => user.fixUserDataConsistency(),
      toJSON: () => user.toJSON()
    };

    const duration = Date.now() - startTime;
    appLogger.logPerformance('authenticate', duration, { userId: user.id });
    appLogger.setContext({
      userId: user.id,
      role: user.role,
      ip: clientIp
    });

    next();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    appLogger.logPerformance('authenticate', duration, { error: true, ip: clientIp });

    if (error.name === 'JsonWebTokenError') {
      recordFailedAttempt(clientIp);
      appLogger.logSecurityEvent('invalid_jwt', { ip: clientIp, error: error.message }, req);
      throw AppError.unauthorized('Invalid token.');
    }

    if (error.name === 'TokenExpiredError') {
      recordFailedAttempt(clientIp);
      appLogger.logAuth('failed_login', undefined, { reason: 'token_expired', ip: clientIp }, req);
      throw AppError.unauthorized('Token expired.');
    }

    if (error.name === 'NotBeforeError') {
      recordFailedAttempt(clientIp);
      appLogger.logSecurityEvent('premature_token', { ip: clientIp }, req);
      throw AppError.unauthorized('Token not active.');
    }

    throw error;
  }
});

export const optionalAuth = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    if (!validateTokenStructure(token)) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    if (!decoded.id || !decoded.email) {
      return next();
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return next();
    }

    (req as any).user = {
      ...user,
      userId: user.id,
      canAccess: (resource: string, action: string) => user.canAccess(resource, action),
      hasPermission: (permission: Permission) => user.hasPermission(permission),
      hasRole: (role: UserRole) => user.role === role,
      updatePrefs: (prefs: any) => user.updatePrefs(prefs),
      completeSetup: (setupData: any) => user.completeSetup(setupData),
      deleteAccount: () => user.deleteAccount(),
      fixUserDataConsistency: () => user.fixUserDataConsistency(),
      toJSON: () => user.toJSON()
    };

    appLogger.setContext({
      userId: user.id,
      role: user.role
    });

    next();
  } catch (error: any) {
    next();
  }
});

export const authorizePermission = (permission: Permission) => {
  return authorize(permission);
};

export const authorize = (...permissions: Permission[]) => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      appLogger.logSecurityEvent('unauthorized_access_attempt', {
        permissions,
        endpoint: req.originalUrl
      }, req);
      throw AppError.unauthorized('Authentication required.');
    }

    const hasPermission = permissions.some(permission =>
      req.user.hasPermission(permission)
    );

    if (!hasPermission) {
      appLogger.logSecurityEvent('insufficient_permissions', {
        required: permissions,
        userPermissions: req.user.permissions,
        userId: req.user.id,
        endpoint: req.originalUrl
      }, req);

      throw AppError.forbidden('Access denied. Insufficient permissions.');
    }

    appLogger.debug('Authorization successful', {
      userId: req.user.id,
      permissions,
      endpoint: req.originalUrl
    });

    next();
  });
};

export const authorizeRole = (...roles: UserRole[]) => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      appLogger.logSecurityEvent('unauthorized_access_attempt', {
        roles,
        endpoint: req.originalUrl
      }, req);
      throw AppError.unauthorized('Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      appLogger.logSecurityEvent('insufficient_role', {
        required: roles,
        userRole: req.user.role,
        userId: req.user.id,
        endpoint: req.originalUrl
      }, req);

      throw AppError.forbidden('Access denied. Insufficient role privileges.');
    }

    appLogger.debug('Role authorization successful', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRoles: roles,
      endpoint: req.originalUrl
    });

    next();
  });
};

export const checkResourceAccess = (resource: string, action: string) => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      appLogger.logSecurityEvent('unauthorized_resource_access', {
        resource,
        action,
        endpoint: req.originalUrl
      }, req);
      throw AppError.unauthorized('Authentication required.');
    }

    if (!req.user.canAccess(resource, action)) {
      appLogger.logSecurityEvent('insufficient_resource_access', {
        resource,
        action,
        userId: req.user.id,
        userRole: req.user.role,
        userPermissions: req.user.permissions,
        endpoint: req.originalUrl
      }, req);

      throw AppError.forbidden(`Access denied. Cannot ${action} ${resource}.`);
    }

    appLogger.debug('Resource access authorized', {
      userId: req.user.id,
      resource,
      action,
      endpoint: req.originalUrl
    });

    next();
  });
};

export const requireOwnershipOrAdmin = (resourceIdParam: string = 'id') => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      throw AppError.unauthorized('Authentication required.');
    }

    const resourceUserId = req.params[resourceIdParam];
    const isOwner = req.user.id === resourceUserId;
    const isAdmin = req.user.hasPermission('manage_users');

    if (!isOwner && !isAdmin) {
      appLogger.logSecurityEvent('unauthorized_resource_ownership', {
        userId: req.user.id,
        resourceUserId,
        endpoint: req.originalUrl
      }, req);

      throw AppError.forbidden('Access denied. You can only access your own resources.');
    }

    appLogger.debug('Ownership/admin authorization successful', {
      userId: req.user.id,
      resourceUserId,
      isOwner,
      isAdmin
    });

    next();
  });
};