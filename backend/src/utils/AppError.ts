import { AppError as IAppError } from '@/types';

export class AppError extends Error implements IAppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad Request'): AppError {
    return new AppError(message, 400);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, 403);
  }

  static notFound(message: string = 'Not Found'): AppError {
    return new AppError(message, 404);
  }

  static conflict(message: string = 'Conflict'): AppError {
    return new AppError(message, 409);
  }

  static unprocessableEntity(message: string = 'Unprocessable Entity'): AppError {
    return new AppError(message, 422);
  }

  static tooManyRequests(message: string = 'Too Many Requests'): AppError {
    return new AppError(message, 429);
  }

  static internal(message: string = 'Internal Server Error'): AppError {
    return new AppError(message, 500, false);
  }

  static serviceUnavailable(message: string = 'Service Unavailable'): AppError {
    return new AppError(message, 503);
  }
}