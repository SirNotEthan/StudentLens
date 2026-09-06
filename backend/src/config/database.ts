import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { appLogger } from '@/services/logger';

declare global {
  // eslint-disable-next-line no-var
  var studentLensPrisma: PrismaClient | undefined;
}

export const prisma =
  global.studentLensPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.studentLensPrisma = prisma;
}

export const checkDatabaseConnection = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) {
    appLogger.warn('DATABASE_URL is not set; local PostgreSQL is disabled');
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    appLogger.info('Local PostgreSQL health check passed');
    return true;
  } catch (error) {
    appLogger.error('Local PostgreSQL health check failed', error as Error);
    return false;
  }
};
