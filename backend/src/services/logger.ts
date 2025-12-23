import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { LogLevel, LoggerContext } from '@/types';

const logsDir = path.join(process.cwd(), 'logs');

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { service: 'studentlens-backend' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),

    new DailyRotateFile({
      filename: path.join(logsDir, 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

class Logger {
  private context: LoggerContext = {};

  setContext(context: Partial<LoggerContext>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  private formatMessage(message: string, meta?: any): { message: string; meta: any } {
    const combinedMeta = { ...this.context, ...meta };
    return { message, meta: combinedMeta };
  }

  error(message: string, error?: Error | any, meta?: any): void {
    const formatted = this.formatMessage(message, { ...meta, error: error?.stack || error });
    logger.error(formatted.message, formatted.meta);
  }

  warn(message: string, meta?: any): void {
    const formatted = this.formatMessage(message, meta);
    logger.warn(formatted.message, formatted.meta);
  }

  info(message: string, meta?: any): void {
    const formatted = this.formatMessage(message, meta);
    logger.info(formatted.message, formatted.meta);
  }

  debug(message: string, meta?: any): void {
    const formatted = this.formatMessage(message, meta);
    logger.debug(formatted.message, formatted.meta);
  }

  logAccess(req: any, res: any, responseTime: number): void {
    const accessLog = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    };

    logger.info('HTTP Request', accessLog);
  }

  logSecurityEvent(event: string, details: any, req?: any): void {
    const securityLog = {
      event,
      details,
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      userId: req?.user?.id,
      timestamp: new Date().toISOString(),
      severity: 'high'
    };

    logger.warn(`SECURITY: ${event}`, securityLog);
  }

  logAuth(event: 'login' | 'logout' | 'register' | 'failed_login' | 'failed_registration' | 'failed_password_change', userId?: string, details?: any, req?: any): void {
    const authLog = {
      event,
      userId,
      details,
      ip: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };

    if (event === 'failed_login') {
      logger.warn(`AUTH: ${event}`, authLog);
    } else {
      logger.info(`AUTH: ${event}`, authLog);
    }
  }

  logDatabase(operation: string, collection: string, details?: any, error?: Error): void {
    const dbLog = {
      operation,
      collection,
      details,
      error: error?.message,
      timestamp: new Date().toISOString(),
    };

    if (error) {
      logger.error(`DB ERROR: ${operation} on ${collection}`, dbLog);
    } else {
      logger.debug(`DB: ${operation} on ${collection}`, dbLog);
    }
  }

  logPerformance(operation: string, duration: number, details?: any): void {
    const perfLog = {
      operation,
      duration,
      details,
      timestamp: new Date().toISOString(),
    };

    if (duration > 1000) { 
      logger.warn(`SLOW OPERATION: ${operation}`, perfLog);
    } else {
      logger.debug(`PERFORMANCE: ${operation}`, perfLog);
    }
  }
}

export const appLogger = new Logger();
export { Logger };
export default logger;