import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import passport from '@/config/passport';
import { appLogger } from '@/services/logger';
import { checkAppwriteConnection } from '@/config/appwrite';

import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
} from '@/middleware/errorHandler';
import {
  generalLimiter,
  securityHeaders,
  requestLogger,
  ipFilter,
  detectSuspiciousActivity,
  corsOptions,
  limitRequestSize,
  validateUserAgent
} from '@/middleware/security';

import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import googleAuthRoutes from '@/routes/googleAuth';
import applicationRoutes from '@/routes/applications';
import postRoutes from '@/routes/posts';
import commentRoutes from '@/routes/comments';

import { EnvironmentVariables } from '@/types';

handleUncaughtException();
handleUnhandledRejection();

const requiredEnvVars: (keyof EnvironmentVariables)[] = [
  'JWT_SECRET',
  'SESSION_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  appLogger.error('Missing required environment variables', new Error(`Missing: ${missingVars.join(', ')}`));
  process.exit(1);
}

const app: Application = express();

app.set('trust proxy', 1);

app.use(securityHeaders);

// Configure helmet based on environment and protocol
const isProduction = process.env.NODE_ENV === 'production';
const helmetConfig: any = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  // Disable COOP and COEP for HTTP, as they're only meant for HTTPS
  crossOriginOpenerPolicy: false,
  // Only enable origin agent cluster for HTTPS
  originAgentCluster: false
};

app.use(helmet(helmetConfig));

app.use(requestLogger);

app.use(ipFilter);
app.use(detectSuspiciousActivity);

app.use(generalLimiter);

app.use(cors(corsOptions));

app.use(limitRequestSize(10 * 1024 * 1024)); 

app.use(validateUserAgent);

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000
}));

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        appLogger.error('Redis: Too many reconnection attempts, giving up');
        return new Error('Too many retries');
      }
      const delay = Math.min(retries * 100, 3000);
      appLogger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    }
  }
});

redisClient.on('error', (err) => {
  appLogger.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  appLogger.info('Redis Client Connected');
});

redisClient.on('ready', () => {
  appLogger.info('Redis Client Ready');
});

redisClient.on('reconnecting', () => {
  appLogger.warn('Redis Client Reconnecting');
});

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'sess:',
  ttl: 86400
});

// Determine if secure cookies should be used (HTTPS)
// In production, use HTTPS (secure cookies) unless explicitly disabled
const useSecureCookies = process.env.SECURE_COOKIES === 'false'
  ? false
  : (process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true');

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  name: 'sessionId',
  cookie: {
    secure: useSecureCookies,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: useSecureCookies ? 'strict' : 'lax'
  },
  genid: () => {
    return require('crypto').randomBytes(32).toString('hex');
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', async (req, res): Promise<void> => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      appwrite: await checkAppwriteConnection()
    }
  };

  if (!healthCheck.services.appwrite) {
    res.status(503).json({
      ...healthCheck,
      status: 'Service Unavailable'
    });
    return;
  }

  res.json(healthCheck);
});

app.use('/api/auth', googleAuthRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

app.get('/api/docs', (req, res): void => {
  res.json({
    name: 'StudentLens Backend API',
    version: '1.0.0',
    description: 'Backend API for StudentLens application',
    endpoints: {
      auth: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'POST /api/auth/refresh-token': 'Refresh access token',
        'GET /api/auth/check-username/:username': 'Check username availability',
        'PUT /api/auth/change-password': 'Change password',
        'POST /api/auth/complete-setup': 'Complete user setup',
        'GET /api/auth/google/signup': 'Google OAuth signup (placeholder)',
        'GET /api/auth/google/callback': 'Google OAuth callback (placeholder)'
      },
      users: {
        'GET /api/users': 'Get all users (admin)',
        'GET /api/users/statistics': 'Get user statistics (admin)',
        'GET /api/users/profile': 'Get current user profile',
        'PUT /api/users/profile': 'Update current user profile',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user',
        'DELETE /api/users/:id': 'Delete user (admin)',
        'PUT /api/users/:id/role': 'Update user role (admin)',
        'PUT /api/users/:id/streak': 'Update user streak'
      },
      system: {
        'GET /api/health': 'Health check',
        'GET /api/docs': 'API documentation'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    features: {
      security: ['Rate limiting', 'Input validation', 'CORS protection', 'Security headers'],
      logging: ['Request logging', 'Performance monitoring', 'Security events', 'Error tracking'],
      validation: ['Comprehensive input validation', 'Business rule validation', 'Type safety'],
      auth: ['JWT tokens', 'Role-based access', 'Permission-based access', 'Token refresh']
    }
  });
});

app.use(notFoundHandler);

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async (): Promise<void> => {
  try {
    // Connect to Redis
    await redisClient.connect();
    appLogger.info('Connected to Redis successfully');

    const appwriteConnected = await checkAppwriteConnection();
    if (!appwriteConnected) {
      appLogger.error('Failed to connect to Appwrite. Server will not start.');
      await redisClient.quit();
      process.exit(1);
    }

    // const server = app.listen(PORT, () => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      appLogger.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });

      appLogger.info('Environment Configuration', {
        nodeEnv: process.env.NODE_ENV,
        appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
        clientUrl: process.env.CLIENT_URL,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        logLevel: process.env.LOG_LEVEL || 'info'
      });
    });

    const gracefulShutdown = async (signal: string) => {
      appLogger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        appLogger.info('HTTP server closed');
      });

      // Close Redis connection
      try {
        await redisClient.quit();
        appLogger.info('Redis connection closed');
      } catch (error) {
        appLogger.error('Error closing Redis connection', error);
      }

      setTimeout(() => {
        appLogger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: any) {
    appLogger.error('Failed to start server', error);
    // Ensure Redis connection is closed on error
    try {
      await redisClient.quit();
    } catch (redisError) {
      appLogger.error('Error closing Redis connection during startup failure', redisError);
    }
    process.exit(1);
  }
};

startServer();

export default app;