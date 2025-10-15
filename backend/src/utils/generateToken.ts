import jwt from 'jsonwebtoken';
import { JWTPayload, IUser } from '@/types';
import { AppError } from './AppError';
import { appLogger } from '@/services/logger';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export const generateAccessToken = (user: IUser): string => {
  try {
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = (jwt.sign as any)(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
      issuer: 'studentlens-backend',
      audience: 'studentlens-frontend',
      subject: user.id
    });

    appLogger.debug('Access token generated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      expiresIn: JWT_EXPIRE
    });

    return token;
  } catch (error: any) {
    appLogger.error('Failed to generate access token', error, {
      userId: user.id,
      email: user.email
    });
    throw AppError.internal('Failed to generate authentication token');
  }
};

export const generateRefreshToken = (user: IUser): string => {
  try {
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = (jwt.sign as any)(payload, JWT_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRE,
      issuer: 'studentlens-backend',
      audience: 'studentlens-frontend',
      subject: user.id
    });

    appLogger.debug('Refresh token generated', {
      userId: user.id,
      email: user.email,
      expiresIn: JWT_REFRESH_EXPIRE
    });

    return token;
  } catch (error: any) {
    appLogger.error('Failed to generate refresh token', error, {
      userId: user.id,
      email: user.email
    });
    throw AppError.internal('Failed to generate refresh token');
  }
};

export const generateTokenPair = (user: IUser): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'studentlens-backend',
      audience: 'studentlens-frontend'
    }) as JWTPayload;

    appLogger.debug('Token verified successfully', {
      userId: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    return decoded;
  } catch (error: any) {
    appLogger.warn('Token verification failed', {
      error: error.message,
      tokenType: error.name
    });

    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized('Token has expired');
    }

    if (error.name === 'JsonWebTokenError') {
      throw AppError.unauthorized('Invalid token');
    }

    if (error.name === 'NotBeforeError') {
      throw AppError.unauthorized('Token not active');
    }

    throw AppError.unauthorized('Token verification failed');
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error: any) {
    appLogger.warn('Token decode failed', { error: error.message });
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return null;

    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
};

export const getTimeUntilExpiration = (token: string): number | null => {
  try {
    const expirationDate = getTokenExpiration(token);
    if (!expirationDate) return null;

    const now = new Date();
    const timeUntilExpiration = expirationDate.getTime() - now.getTime();

    return Math.max(0, timeUntilExpiration);
  } catch (error) {
    return null;
  }
};

export const refreshAccessToken = (refreshToken: string): string => {
  try {
    const decoded = verifyToken(refreshToken);

    const newPayload: JWTPayload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    const newAccessToken = (jwt.sign as any)(newPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE,
      issuer: 'studentlens-backend',
      audience: 'studentlens-frontend',
      subject: decoded.id
    });

    appLogger.info('Access token refreshed', {
      userId: decoded.id,
      email: decoded.email
    });

    return newAccessToken;
  } catch (error: any) {
    appLogger.warn('Failed to refresh access token', {
      error: error.message
    });
    throw AppError.unauthorized('Invalid refresh token');
  }
};

const revokedTokens = new Set<string>();

export const revokeToken = (token: string): void => {
  try {
    const decoded = decodeToken(token);
    if (decoded) {
      revokedTokens.add(token);
      appLogger.info('Token revoked', {
        userId: decoded.id,
        email: decoded.email
      });
    }
  } catch (error: any) {
    appLogger.warn('Failed to revoke token', { error: error.message });
  }
};

export const isTokenRevoked = (token: string): boolean => {
  return revokedTokens.has(token);
};

setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  const tokensToRemove: string[] = [];

  for (const token of revokedTokens) {
    const decoded = decodeToken(token);
    if (decoded && decoded.exp && decoded.exp < now) {
      tokensToRemove.push(token);
    }
  }

  tokensToRemove.forEach(token => revokedTokens.delete(token));

  if (tokensToRemove.length > 0) {
    appLogger.debug('Cleaned up expired revoked tokens', {
      count: tokensToRemove.length
    });
  }
}, 60 * 60 * 1000); // Clean every hour

export const validateTokenStructure = (token: string): boolean => {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

export const getTokenInfo = (token: string): {
  header: any;
  payload: JWTPayload | null;
  isValid: boolean;
  isExpired: boolean;
  timeUntilExpiration: number | null;
} => {
  try {
    const header = jwt.decode(token, { complete: true })?.header;
    const payload = decodeToken(token);
    const isValid = validateTokenStructure(token);
    const isExpired = isTokenExpired(token);
    const timeUntilExpiration = getTimeUntilExpiration(token);

    return {
      header,
      payload,
      isValid,
      isExpired,
      timeUntilExpiration
    };
  } catch (error) {
    return {
      header: null,
      payload: null,
      isValid: false,
      isExpired: true,
      timeUntilExpiration: null
    };
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTimeUntilExpiration,
  refreshAccessToken,
  revokeToken,
  isTokenRevoked,
  validateTokenStructure,
  getTokenInfo
};