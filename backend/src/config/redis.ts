import { createClient, RedisClientType } from 'redis';
import { appLogger } from '@/services/logger';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const getRedisClient = (): RedisClientType | null => redisClient;
export const isRedisConnected = (): boolean => isConnected;

export const initRedis = async (): Promise<RedisClientType | null> => {
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
    }) as RedisClientType;

    redisClient.on('error', (err) => {
      appLogger.warn('Redis Client Error (non-fatal)', err);
    });

    redisClient.on('connect', () => {
      isConnected = true;
      appLogger.info('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      appLogger.info('Redis Client Ready');
    });

    redisClient.on('end', () => {
      isConnected = false;
    });

    redisClient.on('reconnecting', () => {
      appLogger.warn('Redis Client Reconnecting');
    });

    appLogger.info('Attempting to connect to Redis...');

    await Promise.race([
      redisClient.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 10000))
    ]);

    isConnected = true;
    appLogger.info('Connected to Redis successfully');
    return redisClient;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      appLogger.error('CRITICAL: Redis connection failed in production environment', error);
      throw error;
    }

    appLogger.warn('Failed to connect to Redis, falling back to in-memory stores', error);
    redisClient = null;
    isConnected = false;
    return null;
  }
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      appLogger.info('Redis connection closed');
    } catch (error) {
      appLogger.error('Error closing Redis connection', error);
    }
  }
  redisClient = null;
  isConnected = false;
};
