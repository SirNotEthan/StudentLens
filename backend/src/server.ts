console.log('='.repeat(50));
console.log('LOADING: server.ts is being loaded');
console.log('='.repeat(50));

import 'dotenv/config';
console.log('LOADING: dotenv loaded');

import express, { Application } from 'express';
console.log('LOADING: express loaded');

import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
console.log('LOADING: middleware packages loaded');

import passport from '@/config/passport';
console.log('LOADING: passport loaded');

import { appLogger } from '@/services/logger';
console.log('LOADING: logger loaded');

import { checkAppwriteConnection } from '@/config/appwrite';
console.log('LOADING: appwrite config loaded');

import path from 'path';
console.log('LOADING: path loaded');

import {
  errorHandler,
  notFoundHandler,
  handleUncaughtException,
  handleUnhandledRejection
} from '@/middleware/errorHandler';
console.log('LOADING: error handlers loaded');
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
console.log('LOADING: security middleware loaded');

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
import versionRoutes from '@/routes/version';
console.log('LOADING: all routes loaded');

import { EnvironmentVariables } from '@/types';
console.log('LOADING: types loaded');

console.log('LOADING: All imports complete!');
console.log('='.repeat(50));

handleUncaughtException();
handleUnhandledRejection();
console.log('INIT: Exception handlers registered');

const requiredEnvVars: (keyof EnvironmentVariables)[] = [
  'JWT_SECRET',
  'SESSION_SECRET'
];

if (process.env.NODE_ENV === 'production') {
  requiredEnvVars.push('REDIS_URL');
}

console.log('INIT: Checking required environment variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`INIT: ❌ Missing required environment variables: ${missingVars.join(', ')}`);
  appLogger.error('Missing required environment variables', new Error(`Missing: ${missingVars.join(', ')}`));
  process.exit(1);
}
console.log('INIT: ✅ All required environment variables present');

console.log('INIT: Creating Express application...');
const app: Application = express();
console.log('INIT: ✅ Express app created');

app.set('trust proxy', 1);
console.log('INIT: Trust proxy configured');

app.use(securityHeaders);

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
  
  crossOriginOpenerPolicy: false,
  
  originAgentCluster: false
};

app.use(helmet(helmetConfig));

console.log('INIT: Setting up static file serving (early)...');
const publicPath = path.join(__dirname, 'public');
console.log(`INIT: Public path: ${publicPath}`);
console.log(`INIT: __dirname: ${__dirname}`);
console.log(`INIT: process.cwd(): ${process.cwd()}`);

const fs = require('fs');
const publicExists = fs.existsSync(publicPath);
console.log(`INIT: Public directory exists: ${publicExists}`);

if (publicExists) {
  try {
    const files = fs.readdirSync(publicPath);
    console.log(`INIT: Files in public directory: ${files.join(', ')}`);

    const indexExists = fs.existsSync(path.join(publicPath, 'index.html'));
    console.log(`INIT: index.html exists: ${indexExists}`);

    const assetsPath = path.join(publicPath, 'assets');
    const assetsExists = fs.existsSync(assetsPath);
    console.log(`INIT: Assets directory exists: ${assetsExists}`);

    if (assetsExists) {
      const assetFiles = fs.readdirSync(assetsPath);
      console.log(`INIT: Files in assets directory: ${assetFiles.join(', ')}`);
    }
  } catch (err: any) {
    console.error(`INIT: Error reading public directory: ${err.message}`);
  }
} else {
  console.error(`INIT: ⚠️ WARNING: Public directory does not exist at ${publicPath}`);
}

appLogger.info('Static files directory', { publicPath, exists: publicExists });

app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  index: false  
}));
console.log('INIT: ✅ Static file middleware added (early in chain)');

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

let redisClient: ReturnType<typeof createClient> | null = null;
let sessionStore: any = null;

const useSecureCookies = process.env.SECURE_COOKIES === 'false'
  ? false
  : (process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true');

console.log('INIT: Note - Session and Passport middleware will be initialized after Redis connection attempt');
console.log('INIT: This ensures Redis store is used if available');
appLogger.info('Session middleware initialization deferred until Redis connection attempt');

console.log('INIT: Routes will be configured after session middleware is initialized in startServer()');

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
console.log('INIT: ✅ API docs route configured');

console.log('INIT: SPA fallback route will be configured in startServer() after API routes');
console.log('INIT: Error handlers will be configured in startServer() after all routes');

console.log('INIT: Configuring PORT...');
const PORT = parseInt(process.env.PORT || '5000', 10);
console.log(`INIT: PORT = ${PORT}`);

appLogger.info('Port Configuration', {
  envPort: process.env.PORT,
  parsedPort: PORT,
  portSource: process.env.PORT ? 'environment variable' : 'default (5000)'
});
console.log('INIT: ✅ PORT configured');

console.log('='.repeat(50));
console.log('INIT: All initialization complete!');
console.log('INIT: App is fully configured and ready to start');
console.log('='.repeat(50));

const startServer = async (): Promise<void> => {
  try {
    console.log('\n' + '='.repeat(50));
    console.log('STARTUP: Beginning server initialization');
    console.log('='.repeat(50));

    appLogger.info('Starting server initialization...', {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      environment: process.env.NODE_ENV
    });

    console.log('STARTUP: Logger initialized');

    let redisConnected = false;
    console.log('STARTUP: Attempting Redis connection...');

    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
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
        appLogger.warn('Redis Client Error (non-fatal)', err);
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

      console.log('STARTUP: Redis client created, attempting connection...');
      appLogger.info('Attempting to connect to Redis...');

      await Promise.race([
        redisClient.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 10000))
      ]);

      redisConnected = true;
      sessionStore = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 86400
      });
      appLogger.info('Connected to Redis successfully - using Redis for sessions');
      console.log('STARTUP: ✅ Redis connection successful');
    } catch (error) {
      
      if (process.env.NODE_ENV === 'production') {
        appLogger.error('❌ CRITICAL: Redis connection failed in production environment', error);
        console.error('STARTUP: ❌ Redis connection failed in PRODUCTION');
        console.error('STARTUP: Redis is required for production deployments');
        console.error('STARTUP: Please ensure REDIS_URL is correctly configured');
        throw error; 
      }

      appLogger.warn('Failed to connect to Redis, falling back to memory store for sessions', error);
      console.log('STARTUP: ⚠️ Redis connection failed, using in-memory session store (development only)');
      redisClient = null;
      redisConnected = false;
      sessionStore = null;
    }

    console.log('STARTUP: Configuring session middleware...');
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
        return require('crypto').randomBytes(32).toString('hex');
      }
    };

    if (sessionStore) {
      sessionConfig.store = sessionStore;
      appLogger.info('Session middleware configured with Redis store');
      console.log('STARTUP: ✅ Session configured with Redis store');
    } else {
      appLogger.warn('⚠️ PRODUCTION WARNING: Using in-memory session store (sessions will not persist across restarts or scale across instances)');
      console.log('STARTUP: ⚠️ Session configured with memory store (NOT suitable for production)');
    }

    app.use(session(sessionConfig));
    console.log('STARTUP: ✅ Session middleware initialized');

    console.log('STARTUP: Setting up Passport middleware...');
    app.use(passport.initialize());
    console.log('STARTUP: ✅ Passport initialized');

    app.use(passport.session());
    console.log('STARTUP: ✅ Passport session configured');

    appLogger.info('Session and Passport middleware initialized successfully');

    console.log('STARTUP: Setting up health check route...');
    app.get('/api/health', async (req, res): Promise<void> => {
      const appwriteConnected = await checkAppwriteConnection();

      const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          appwrite: appwriteConnected ? 'connected' : 'disconnected',
          redis: redisConnected ? 'connected' : 'not configured'
        }
      };

      res.json(healthCheck);
    });
    console.log('STARTUP: ✅ Health check route configured');

    console.log('STARTUP: Setting up API routes...');
    app.use('/api/auth', googleAuthRoutes);
    console.log('STARTUP: - Google auth routes added');
    app.use('/api/auth', authRoutes);
    console.log('STARTUP: - Auth routes added');
    app.use('/api/users', userRoutes);
    console.log('STARTUP: - User routes added');
    app.use('/api/applications', applicationRoutes);
    console.log('STARTUP: - Application routes added');
    app.use('/api/posts', postRoutes);
    console.log('STARTUP: - Post routes added');
    app.use('/api/comments', commentRoutes);
    console.log('STARTUP: - Comment routes added');
    app.use('/api/analytics', analyticsRoutes);
    console.log('STARTUP: - Analytics routes added');
    app.use('/api/settings', settingsRoutes);
    console.log('STARTUP: - Settings routes added');
    app.use('/api/wordle', wordleRoutes);
    console.log('STARTUP: - Wordle routes added');
    app.use('/api/spelling-bee', spellingBeeRoutes);
    console.log('STARTUP: - Spelling Bee routes added');
    app.use('/api/strands', strandsRoutes);
    console.log('STARTUP: - Strands routes added');
    app.use('/api/version', versionRoutes);
    console.log('STARTUP: - Version routes added');
    console.log('STARTUP: ✅ All API routes configured');

    console.log('STARTUP: Setting up SPA fallback route...');
    
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
    console.log('STARTUP: ✅ SPA fallback route configured');

    console.log('STARTUP: Setting up error handlers...');
    app.use(notFoundHandler);
    console.log('STARTUP: - Not found handler added');
    app.use(errorHandler);
    console.log('STARTUP: ✅ Error handlers configured');

    console.log('STARTUP: Checking Appwrite connection...');
    const appwriteConnected = await checkAppwriteConnection();
    console.log(`STARTUP: Appwrite connection ${appwriteConnected ? 'successful' : 'failed'}`);
    if (!appwriteConnected) {
      appLogger.warn('Warning: Failed to connect to Appwrite. Some features may not work correctly.');
      appLogger.warn('Server will start anyway. Check your Appwrite configuration.');
    } else {
      appLogger.info('Connected to Appwrite successfully');
    }

    console.log('STARTUP: Preparing to start HTTP server...');
    console.log(`STARTUP: Port = ${PORT}`);

    appLogger.info('Attempting to start HTTP server...', {
      port: PORT
    });

    console.log('STARTUP: Calling app.listen()...');
    const server = app.listen(PORT, () => {
      console.log('STARTUP: HTTP server listen callback triggered');
      appLogger.info('✅ Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
        redis: redisConnected ? 'connected' : 'not available (using memory store)',
        appwrite: appwriteConnected ? 'connected' : 'connection failed (check config)'
      });

      appLogger.info('Environment Configuration', {
        nodeEnv: process.env.NODE_ENV,
        appwriteEndpoint: process.env.APPWRITE_ENDPOINT,
        clientUrl: process.env.CLIENT_URL,
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      console.log('\n==========================================');
      console.log('🚀 SERVER IS RUNNING');
      console.log('==========================================');
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log('==========================================\n');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        appLogger.error(`Port ${PORT} is already in use!`, error);
        console.error(`\nERROR: Port ${PORT} is already in use!`);
        console.error('This should not happen in App Platform.');
        console.error('Check your configuration.\n');
        process.exit(1);
      } else {
        appLogger.error('Server error:', error);
        console.error('\nSERVER ERROR:', error);
        process.exit(1);
      }
    });

    const gracefulShutdown = async (signal: string) => {
      appLogger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        appLogger.info('HTTP server closed');
      });

      if (redisClient && redisConnected) {
        try {
          await redisClient.quit();
          appLogger.info('Redis connection closed');
        } catch (error) {
          appLogger.error('Error closing Redis connection', error);
        }
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
    console.error('\n==========================================');
    console.error('❌ FATAL ERROR: Failed to start server');
    console.error('==========================================');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('==========================================\n');

    appLogger.error('Fatal error during server startup', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno
    });

    if (redisClient) {
      try {
        await redisClient.quit();
        appLogger.info('Redis connection closed after error');
      } catch (redisError) {
        appLogger.error('Error closing Redis connection during startup failure', redisError);
      }
    }

    console.error('Exiting with code 1...\n');
    process.exit(1);
  }
};

console.log('\n' + '='.repeat(50));
console.log('MAIN: Calling startServer()...');
console.log('='.repeat(50) + '\n');

startServer().catch((error) => {
  console.error('\n' + '='.repeat(50));
  console.error('MAIN: startServer() threw an error');
  console.error('='.repeat(50));
  console.error(error);
  process.exit(1);
});

export default app;