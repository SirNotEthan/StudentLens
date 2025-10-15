import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/AppError';
import { ApiResponse } from '@/types';
import { appLogger } from '@/services/logger';

const handleAppwriteError = (error: any): AppError => {
  if (error.code === 401) {
    return AppError.unauthorized('Invalid API credentials');
  }
  if (error.code === 404) {
    return AppError.notFound('Resource not found');
  }
  if (error.code === 409) {
    return AppError.conflict('Resource already exists');
  }
  return AppError.internal(`Appwrite error: ${error.message}`);
};

const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return AppError.unauthorized('Invalid token');
  }
  if (error.name === 'TokenExpiredError') {
    return AppError.unauthorized('Token expired');
  }
  return AppError.unauthorized('Authentication failed');
};

const handleValidationError = (error: any): AppError => {
  const message = Object.values(error.errors || {}).map((val: any) => val.message).join(', ');
  return AppError.badRequest(`Validation failed: ${message}`);
};

const handleDuplicateFieldError = (error: any): AppError => {
  const field = Object.keys(error.keyValue || {})[0];
  const message = field ? `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` : 'Duplicate field value';
  return AppError.conflict(message);
};

const handleCastError = (): AppError => {
  return AppError.badRequest('Invalid ID format');
};

const normalizeError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error.name === 'CastError') {
    return handleCastError();
  }

  if (error.code === 11000) {
    return handleDuplicateFieldError(error);
  }

  if (error.name === 'ValidationError') {
    return handleValidationError(error);
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return handleJWTError(error);
  }

  if (error.type === 'appwrite_exception' || error.code) {
    return handleAppwriteError(error);
  }

  return AppError.internal(error.message || 'Something went wrong');
};

const logError = (error: AppError, req: Request): void => {
  const errorContext = {
    message: error.message,
    statusCode: error.statusCode,
    stack: error.stack,
    isOperational: error.isOperational,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
  };

  if (error.statusCode >= 500) {
    appLogger.error('Server Error', error, errorContext);
  } else if (error.statusCode >= 400) {
    appLogger.warn('Client Error', errorContext);
  }
};

const sendErrorResponse = (error: AppError, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && {
      error: error.message,
      stack: error.stack,
    }),
  };

  res.status(error.statusCode).json(response);
};

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = normalizeError(err);

  logError(error, req);

  sendErrorResponse(error, res);
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = AppError.notFound(`Route ${req.originalUrl} not found`);
  next(error);
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    appLogger.error('Uncaught Exception! Shutting down...', err);
    process.exit(1);
  });
};

export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    appLogger.error('Unhandled Rejection! Shutting down...', new Error(reason), {
      promise: promise.toString(),
    });
    process.exit(1);
  });
};