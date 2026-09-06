import 'dotenv/config';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import RedisStore from 'connect-redis';
import passport from '@/config/passport';
import { appLogger } from '@/services/logger';
import { checkAppwriteConnection } from '@/config/appwrite';
import { checkDatabaseConnection } from '@/config/database';
import { initRedis, isRedisConnected, closeRedis } from '@/config/redis';
import crypto from 'crypto';
import path from 'path';

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

import swaggerUi from 'swagger-ui-express';
import openApiSpec from '@/docs/openapi';

import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import googleAuthRoutes from '@/routes/googleAuth';
import applicationRoutes from '@/routes/applications';
import postRoutes from '@/routes/posts';
import commentRoutes from '@/routes/comments';
import analyticsRoutes from '@/routes/analytics';
import settingsRoutes from '@/routes/settings';
import wordleRoutes from '@/routes/wordle';
import spellingBeeRoutes from '@/routes/spellingBee';
import strandsRoutes from '@/routes/strands';
import sudokuRoutes from '@/routes/sudoku';
import contactRoutes from '@/routes/contact';
import versionRoutes from '@/routes/version';

import { EnvironmentVariables } from '@/types';

handleUncaughtException();
handleUnhandledRejection();
const requiredEnvVars: (keyof EnvironmentVariables)[] = [
  'JWT_SECRET',
  'SESSION_SECRET'
];

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('REDIS_URL');
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  appLogger.error('Missing required environment variables', new Error(`Missing: ${missingVars.join(', ')}`));
  process.exit(1);
}

const app: Application = express();
app.set('trust proxy', 1);

app.use(securityHeaders);


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
  
  crossOriginOpenerPolicy: false,
  
  originAgentCluster: false
};

app.use(helmet(helmetConfig));

const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  index: false
}));

app.use(requestLogger);

app.use(ipFilter);
app.use(detectSuspiciousActivity);

app.use(generalLimiter);

app.use(cors(corsOptions));

app.use(limitRequestSize(25 * 1024 * 1024));

app.use(validateUserAgent);

app.use(express.json({
  limit: '25mb',
  verify: (_req, _res, buf) => {
    (_req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000
}));

let sessionStore: any = null;

const useSecureCookies = process.env.SECURE_COOKIES === 'false'
  ? false
  : (process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true');

appLogger.info('Session middleware initialization deferred until Redis connection attempt');

app.use('/api/docs', (_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:"
  );
  next();
});
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'StudentLens API',
  swaggerOptions: { persistAuthorization: true }
}));
const PORT = parseInt(process.env.PORT || '5000', 10);

appLogger.info('Port Configuration', {
  envPort: process.env.PORT,
  parsedPort: PORT,
  portSource: process.env.PORT ? 'environment variable' : 'default (5000)'
});

const startServer = async (): Promise<void> => {
  try {
    appLogger.info('Starting server initialization...', {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      environment: process.env.NODE_ENV
    });

    const redisClient = await initRedis();
    const redisConnected = isRedisConnected();

    if (redisClient) {
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400
      });
      appLogger.info('Using Redis for sessions, token revocation, and security tracking');
    }

    const sessionConfig: any = {
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
        return crypto.randomBytes(32).toString('hex');
      }
    };

    if (sessionStore) {
      sessionConfig.store = sessionStore;
      appLogger.info('Session middleware configured with Redis store');
    } else if (process.env.NODE_ENV === 'production') {
      appLogger.warn('Using in-memory session store — sessions will not persist across restarts');
    }

    app.use(session(sessionConfig));
    app.use(passport.initialize());
    app.use(passport.session());

    appLogger.info('Session and Passport middleware initialized (sessions used for OAuth flow only)');

    app.get('/api/health', async (_req, res): Promise<void> => {
      const appwriteConnected = await checkAppwriteConnection();
      const postgresConnected = await checkDatabaseConnection();

      const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        databaseProvider: process.env.DATABASE_PROVIDER || 'appwrite',
        services: {
          appwrite: appwriteConnected ? 'connected' : 'disconnected',
          postgres: postgresConnected ? 'connected' : 'not configured',
          redis: redisConnected ? 'connected' : 'not configured'
        }
      };

      res.json(healthCheck);
    });

    app.use('/api/auth', googleAuthRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/applications', applicationRoutes);
    app.use('/api/posts', postRoutes);
    app.use('/api/comments', commentRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/wordle', wordleRoutes);
    app.use('/api/spelling-bee', spellingBeeRoutes);
    app.use('/api/strands', strandsRoutes);
    app.use('/api/sudoku', sudokuRoutes);
    app.use('/api/version', versionRoutes);
    app.use('/api/contact', contactRoutes);

    app.use((req, res, next) => {
      
      if (req.path.startsWith('/api')) {
        return next();
      }

      const pathParts = req.path.split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      if (lastSegment.includes('.')) {
        
        return next();
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return next();
      }

      if (res.headersSent) {
        return next();
      }

      const indexPath = path.join(publicPath, 'index.html');

      res.sendFile(indexPath, (err) => {
        if (err) {
          appLogger.warn('Failed to serve index.html', { error: err.message, path: indexPath });
          if (!res.headersSent) {
            next(); 
          }
        }
      });
    });

    app.use(notFoundHandler);
    app.use(errorHandler);

    const appwriteConnected = await checkAppwriteConnection();
    const postgresConnected = await checkDatabaseConnection();
    if (!appwriteConnected) {
      appLogger.warn('Warning: Failed to connect to Appwrite. Some features may not work correctly.');
      appLogger.warn('Server will start anyway. Check your Appwrite configuration.');
    } else {
      appLogger.info('Connected to Appwrite successfully');
    }

    appLogger.info('Attempting to start HTTP server...', {
      port: PORT
    });

    const server = app.listen(PORT, () => {
      appLogger.info('✅ Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        redis: redisConnected ? 'connected' : 'not available (using memory store)',
        appwrite: appwriteConnected ? 'connected' : 'connection failed (check config)',
        postgres: postgresConnected ? 'connected' : 'not configured',
        databaseProvider: process.env.DATABASE_PROVIDER || 'appwrite'
      });

      appLogger.info('Environment Configuration', {
        nodeEnv: process.env.NODE_ENV,
        appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
        clientUrl: process.env.CLIENT_URL,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        logLevel: process.env.LOG_LEVEL || 'info'
      });

    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        appLogger.error(`Port ${PORT} is already in use!`, error);
        process.exit(1);
      } else {
        appLogger.error('Server error:', error);
        process.exit(1);
      }
    });

    const gracefulShutdown = async (signal: string) => {
      appLogger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        appLogger.info('HTTP server closed');
      });

      await closeRedis();

      setTimeout(() => {
        appLogger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);

      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error: any) {
    appLogger.error('Fatal error during server startup', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });

    await closeRedis();

    process.exit(1);
  }
};

startServer().catch((error) => {
  appLogger.error('Fatal error: startServer() threw an error', error);
  process.exit(1);
});

export default app;
