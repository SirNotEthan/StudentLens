import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { appLogger } from '@/services/logger';
import { AppError } from '@/utils/AppError';

export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

      appLogger.logSecurityEvent('rate_limit_exceeded', {
        ip: clientIp,
        endpoint: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.id
      }, req);

      res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req: Request) => {
      return req.path === '/api/health';
    }
  });
};

export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 1000 : 100, // 1000 requests in dev, 100 in production
  'Too many requests from this IP, please try again after 15 minutes.'
);

export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 100 : 5, // 100 attempts in dev, 5 in production
  'Too many authentication attempts, please try again after 15 minutes.'
);

export const passwordResetLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 requests per hour
  'Too many password reset attempts, please try again after 1 hour.'
);

export const registrationLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3, // 3 registrations per hour per IP
  'Too many registration attempts, please try again after 1 hour.'
);

export const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  process.env.NODE_ENV === 'development' ? 2000 : 200, // 2000 requests in dev, 200 in production
  'API rate limit exceeded, please try again later.'
);

export const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  'Upload rate limit exceeded, please try again after 1 hour.'
);

export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // In development, allow connections to localhost on various ports
  const connectSrc = process.env.NODE_ENV === 'development'
    ? "'self' http://localhost:3000 http://localhost:5173 ws://localhost:*"
    : "'self'";

  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'"
  ].join('; '));

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  res.removeHeader('X-Powered-By');

  next();
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  appLogger.info('Request started', {
    method: req.method,
    url: req.originalUrl,
    ip: clientIp,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  });

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;

    appLogger.logAccess(req, res, responseTime);

    if (responseTime > 1000) {
      appLogger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        ip: clientIp,
        userId: (req as any).user?.id
      });
    }
  });

  next();
};

const blacklistedIPs = new Set<string>();

// Initialize whitelisted IPs from environment variable or use defaults for development
const getWhitelistedIPs = (): Set<string> => {
  const defaultIPs = ['127.0.0.1', '::1'];
  const envIPs = process.env.ADMIN_WHITELIST_IPS;

  if (envIPs) {
    // Parse comma-separated IPs from environment variable
    const ips = envIPs.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    return new Set([...defaultIPs, ...ips]);
  }

  return new Set(defaultIPs);
};

const whitelistedIPs = getWhitelistedIPs();

export const ipFilter = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

  if (blacklistedIPs.has(clientIp)) {
    appLogger.logSecurityEvent('blacklisted_ip_attempt', {
      ip: clientIp,
      endpoint: req.originalUrl,
      method: req.method
    }, req);

    throw AppError.forbidden('Access denied');
  }

  // Only enforce IP whitelist for admin routes if ADMIN_IP_WHITELIST_ENABLED is true
  const ipWhitelistEnabled = process.env.ADMIN_IP_WHITELIST_ENABLED === 'true';

  if (ipWhitelistEnabled && req.originalUrl.includes('/admin/') && !whitelistedIPs.has(clientIp)) {
    appLogger.logSecurityEvent('non_whitelisted_admin_access', {
      ip: clientIp,
      endpoint: req.originalUrl,
      method: req.method
    }, req);

    throw AppError.forbidden('Admin access not allowed from this IP');
  }

  next();
};

export const blacklistIP = (ip: string): void => {
  blacklistedIPs.add(ip);
  appLogger.logSecurityEvent('ip_blacklisted', { ip });
};

export const removeFromBlacklist = (ip: string): void => {
  blacklistedIPs.delete(ip);
  appLogger.logSecurityEvent('ip_removed_from_blacklist', { ip });
};

const suspiciousActivities = new Map<string, {
  count: number;
  firstSeen: number;
  lastSeen: number;
  activities: string[];
}>();

export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction): void => {
  const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window

  const suspiciousPatterns = [
    /\.\./g, // Directory traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /\bor\s+1\s*=\s*1\b/gi, // SQL injection
    /\bexec\b/gi, // Command injection
    /\beval\b/gi, // Code injection
  ];

  const requestData = JSON.stringify({
    url: req.originalUrl,
    query: req.query,
    body: req.body,
    headers: req.headers
  });

  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(requestData));

  if (hasSuspiciousPattern) {
    const activity = suspiciousActivities.get(clientIp) || {
      count: 0,
      firstSeen: now,
      lastSeen: now,
      activities: []
    };

    if (now - activity.firstSeen > windowMs) {
      activity.count = 0;
      activity.firstSeen = now;
      activity.activities = [];
    }

    activity.count++;
    activity.lastSeen = now;
    activity.activities.push(req.originalUrl);

    suspiciousActivities.set(clientIp, activity);

    appLogger.logSecurityEvent('suspicious_activity_detected', {
      ip: clientIp,
      endpoint: req.originalUrl,
      method: req.method,
      pattern: 'multiple_patterns',
      count: activity.count,
      activities: activity.activities
    }, req);

    if (activity.count >= 5) {
      blacklistIP(clientIp);
      appLogger.logSecurityEvent('auto_blacklisted_suspicious_activity', {
        ip: clientIp,
        count: activity.count,
        activities: activity.activities
      }, req);

      throw AppError.forbidden('Suspicious activity detected. Access denied.');
    }
  }

  next();
};

setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour

  for (const [ip, activity] of suspiciousActivities.entries()) {
    if (now - activity.lastSeen > windowMs) {
      suspiciousActivities.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In production, only allow the production client URL
    // In development, allow localhost origins
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.CLIENT_URL].filter(Boolean)
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          process.env.CLIENT_URL
        ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      appLogger.logSecurityEvent('cors_violation', {
        origin,
        allowedOrigins,
        environment: process.env.NODE_ENV
      });
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ]
};

export const limitRequestSize = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);

    if (contentLength > maxSize) {
      appLogger.logSecurityEvent('oversized_request', {
        ip: req.ip,
        contentLength,
        maxSize,
        endpoint: req.originalUrl
      }, req);

      throw AppError.badRequest(`Request too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    next();
  };
};

export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.get('User-Agent');

  if (!userAgent) {
    appLogger.logSecurityEvent('missing_user_agent', {
      ip: req.ip,
      endpoint: req.originalUrl
    }, req);

  }

  const maliciousAgents = [
    /sqlmap/i,
    /nikto/i,
    /masscan/i,
    /nessus/i,
    /openvas/i
  ];

  if (userAgent && maliciousAgents.some(pattern => pattern.test(userAgent))) {
    appLogger.logSecurityEvent('malicious_user_agent', {
      ip: req.ip,
      userAgent,
      endpoint: req.originalUrl
    }, req);

    throw AppError.forbidden('Access denied');
  }

  next();
};