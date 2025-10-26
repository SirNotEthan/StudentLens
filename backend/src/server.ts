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

// Redis setup with fallback to in-memory sessions
let redisClient: ReturnType<typeof createClient> | null = null;
let sessionStore: any = null;

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
} catch (error) {
  appLogger.warn('Redis client initialization failed, will use memory store', error);
  redisClient = null;
}

// Determine if secure cookies should be used (HTTPS)
// In production, use HTTPS (secure cookies) unless explicitly disabled
const useSecureCookies = process.env.SECURE_COOKIES === 'false'
  ? false
  : (process.env.NODE_ENV === 'production' || process.env.SECURE_COOKIES === 'true');

// Session configuration (will be set up after Redis connection attempt)
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

// Initialize session with memory store by default
// This will be updated in startServer if Redis is available
console.log('INIT: Setting up session middleware...');
try {
  app.use(session(sessionConfig));
  console.log('INIT: ✅ Session middleware added');
} catch (error) {
  console.error('INIT: ❌ Session middleware failed:', error);
  throw error;
}

console.log('INIT: Setting up Passport middleware...');
try {
  app.use(passport.initialize());
  console.log('INIT: ✅ Passport initialized');
} catch (error) {
  console.error('INIT: ❌ Passport initialize failed:', error);
  throw error;
}

try {
  app.use(passport.session());
  console.log('INIT: ✅ Passport session added');
} catch (error) {
  console.error('INIT: ❌ Passport session failed:', error);
  throw error;
}

console.log('INIT: ✅ All middleware initialized successfully');
appLogger.info('Session and Passport middleware initialized (will attempt Redis connection on startup)');

console.log('INIT: Setting up health check route...');
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
      redis: redisClient ? 'connected' : 'not configured'
    }
  };

  // Always return 200 OK if the server is running
  // Report service status but don't fail the health check
  res.json(healthCheck);
});
console.log('INIT: ✅ Health check route configured');

console.log('INIT: Setting up API routes...');
app.use('/api/auth', googleAuthRoutes);
console.log('INIT: - Google auth routes added');
app.use('/api/auth', authRoutes);
console.log('INIT: - Auth routes added');
app.use('/api/users', userRoutes);
console.log('INIT: - User routes added');
app.use('/api/applications', applicationRoutes);
console.log('INIT: - Application routes added');
app.use('/api/posts', postRoutes);
console.log('INIT: - Post routes added');
app.use('/api/comments', commentRoutes);
console.log('INIT: ✅ All API routes configured');

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

console.log('INIT: Setting up static file serving...');
// Serve static frontend files (for production builds)
// In production, the frontend dist is copied to the public directory
const publicPath = path.join(__dirname, 'public');
console.log(`INIT: Public path: ${publicPath}`);
appLogger.info('Static files directory', { publicPath });

// Serve static files
app.use(express.static(publicPath, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
console.log('INIT: ✅ Static file middleware added');

console.log('INIT: Setting up SPA fallback route...');
// SPA fallback - serve index.html for any non-API route
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return next();
  }

  // Serve index.html for all other routes (SPA routing)
  const indexPath = path.join(publicPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      appLogger.warn('Failed to serve index.html', { error: err.message, path: indexPath });
      next(); // Fall through to 404 handler
    }
  });
});
console.log('INIT: ✅ SPA fallback route configured');

console.log('INIT: Setting up error handlers...');
app.use(notFoundHandler);
console.log('INIT: - Not found handler added');

app.use(errorHandler);
console.log('INIT: ✅ Error handlers configured');

console.log('INIT: Configuring PORT...');
const PORT = parseInt(process.env.PORT || '5000', 10);
console.log(`INIT: PORT = ${PORT}`);

// Log port configuration for debugging
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

    // Try to connect to Redis with timeout
    let redisConnected = false;
    console.log('STARTUP: Checking Redis client...');
    if (redisClient) {
      console.log('STARTUP: Redis client exists, attempting connection...');
      try {
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
        console.log('STARTUP: Redis connection successful');
      } catch (error) {
        appLogger.warn('Failed to connect to Redis, falling back to memory store for sessions', error);
        console.log('STARTUP: Redis connection failed (using memory store)');
        redisClient = null;
        redisConnected = false;
      }
    } else {
      console.log('STARTUP: No Redis client configured');
    }

    // Log session store status
    if (!redisConnected) {
      appLogger.warn('Using in-memory session store (sessions will not persist across restarts)');
      console.log('STARTUP: Using memory-based sessions');
    } else {
      appLogger.warn('Redis connected but session middleware already initialized with memory store');
      console.log('STARTUP: Redis available but using memory store (middleware already initialized)');
    }

    // Check Appwrite connection (non-fatal)
    console.log('STARTUP: Checking Appwrite connection...');
    const appwriteConnected = await checkAppwriteConnection();
    console.log(`STARTUP: Appwrite connection ${appwriteConnected ? 'successful' : 'failed'}`);
    if (!appwriteConnected) {
      appLogger.warn('Warning: Failed to connect to Appwrite. Some features may not work correctly.');
      appLogger.warn('Server will start anyway. Check your Appwrite configuration.');
    } else {
      appLogger.info('Connected to Appwrite successfully');
    }

    // Start the server
    console.log('STARTUP: Preparing to start HTTP server...');
    console.log(`STARTUP: Port = ${PORT}, Host = 0.0.0.0`);

    appLogger.info('Attempting to start HTTP server...', {
      port: PORT,
      host: '0.0.0.0'
    });

    console.log('STARTUP: Calling app.listen()...');
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('STARTUP: HTTP server listen callback triggered');
      appLogger.info('✅ Server started successfully', {
        port: PORT,
        host: '0.0.0.0',
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
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
      console.log('==========================================\n');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        appLogger.error(`❌ Port ${PORT} is already in use!`, error);
        console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
        console.error('This should not happen in App Platform.');
        console.error('Check your configuration.\n');
        process.exit(1);
      } else {
        appLogger.error('❌ Server error:', error);
        console.error('\n❌ SERVER ERROR:', error);
        process.exit(1);
      }
    });

    const gracefulShutdown = async (signal: string) => {
      appLogger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        appLogger.info('HTTP server closed');
      });

      // Close Redis connection if it exists
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

    // Ensure Redis connection is closed on error
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