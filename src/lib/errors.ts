/**
 * Centralized error handling utilities for API routes
 * 
 * This module provides consistent error handling across the application,
 * with proper logging, error categorization, and user-friendly messages.
 */

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/**
 * Error types for categorization
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_SERVER_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Log error with context information
 */
export function logError(error: unknown, context: string): void {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppError) {
    console.error(`[${timestamp}] [${context}] ${error.type}:`, {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [${context}] Error:`, {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } else {
    console.error(`[${timestamp}] [${context}] Unknown error:`, error);
  }
}

/**
 * Convert Prisma errors to AppError
 */
export function handlePrismaError(error: unknown): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        // Unique constraint violation
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';
        return new AppError(
          ErrorType.CONFLICT,
          `Запись с таким ${field} уже существует`,
          409,
          { code: error.code, field }
        );
      
      case 'P2025':
        // Record not found
        return new AppError(
          ErrorType.NOT_FOUND,
          'Запись не найдена',
          404,
          { code: error.code }
        );
      
      case 'P2003':
        // Foreign key constraint failed
        return new AppError(
          ErrorType.VALIDATION,
          'Связанная запись не существует',
          400,
          { code: error.code }
        );
      
      case 'P2014':
        // Required relation violation
        return new AppError(
          ErrorType.VALIDATION,
          'Невозможно удалить запись из-за связанных данных',
          400,
          { code: error.code }
        );
      
      default:
        return new AppError(
          ErrorType.DATABASE,
          'Ошибка базы данных',
          500,
          { code: error.code, message: error.message }
        );
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      ErrorType.VALIDATION,
      'Некорректные данные для базы данных',
      400,
      { message: error.message }
    );
  }
  
  return new AppError(
    ErrorType.DATABASE,
    'Неизвестная ошибка базы данных',
    500
  );
}

/**
 * Convert Zod validation errors to AppError
 */
export function handleZodError(error: ZodError): AppError {
  const errorMessages = error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
  
  return new AppError(
    ErrorType.VALIDATION,
    errorMessages,
    400,
    { errors: error.errors }
  );
}

/**
 * Helper to include details only in development mode
 */
function includeDetailsInDev(details: unknown): { details?: unknown } {
  return process.env.NODE_ENV === 'development' && details 
    ? { details } 
    : {};
}

/**
 * Handle all errors and return appropriate NextResponse
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  logError(error, context);
  
  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        type: error.type,
        ...includeDetailsInDev(error.details),
      },
      { status: error.statusCode }
    );
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const appError = handleZodError(error);
    return NextResponse.json(
      {
        error: appError.message,
        type: appError.type,
        ...includeDetailsInDev(appError.details),
      },
      { status: appError.statusCode }
    );
  }
  
  // Handle Prisma errors
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientValidationError
  ) {
    const appError = handlePrismaError(error);
    return NextResponse.json(
      {
        error: appError.message,
        type: appError.type,
        ...includeDetailsInDev(appError.details),
      },
      { status: appError.statusCode }
    );
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        type: ErrorType.INTERNAL,
        ...includeDetailsInDev({ message: error.message, stack: error.stack }),
      },
      { status: 500 }
    );
  }
  
  // Unknown error type
  return NextResponse.json(
    {
      error: 'Неизвестная ошибка',
      type: ErrorType.INTERNAL,
    },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API routes
 * 
 * Usage:
 * export const GET = asyncHandler('GET /api/users', async (request) => {
 *   // Your handler code
 * });
 */
export function asyncHandler(
  context: string,
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

/**
 * Common error creators
 */

export function notFoundError(resource: string): AppError {
  return new AppError(
    ErrorType.NOT_FOUND,
    `${resource} не найден`,
    404
  );
}

export function unauthorizedError(message = 'Требуется авторизация'): AppError {
  return new AppError(
    ErrorType.AUTHENTICATION,
    message,
    401
  );
}

export function forbiddenError(message = 'Недостаточно прав для выполнения операции'): AppError {
  return new AppError(
    ErrorType.AUTHORIZATION,
    message,
    403
  );
}

export function validationError(message: string, details?: unknown): AppError {
  return new AppError(
    ErrorType.VALIDATION,
    message,
    400,
    details
  );
}

export function conflictError(message: string, details?: unknown): AppError {
  return new AppError(
    ErrorType.CONFLICT,
    message,
    409,
    details
  );
}

export function internalError(message = 'Внутренняя ошибка сервера', details?: unknown): AppError {
  return new AppError(
    ErrorType.INTERNAL,
    message,
    500,
    details
  );
}
