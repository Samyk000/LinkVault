/**
 * @file lib/errors/app-error.ts
 * @description Custom error classes for standardized error handling
 * @created 2025-01-01
 */

/**
 * Base application error class with error context
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get error details for logging/debugging
   */
  getDetails(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      ...(this.originalError && {
        originalError: {
          name: this.originalError.name,
          message: this.originalError.message,
          stack: this.originalError.stack,
        },
      }),
    };
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return this.getDetails();
  }
}

/**
 * Database operation error
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, 'DATABASE_ERROR', context, originalError);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'User not authenticated',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_ERROR', context);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    field?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      { field, ...context }
    );
  }
}

/**
 * Cache operation error
 */
export class CacheError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message, 'CACHE_ERROR', context, originalError);
  }
}

/**
 * Network/API error
 */
export class NetworkError extends AppError {
  constructor(
    message: string,
    statusCode?: number,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(
      message,
      'NETWORK_ERROR',
      { statusCode, ...context },
      originalError
    );
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${resource} not found${identifier ? `: ${identifier}` : ''}`,
      'NOT_FOUND_ERROR',
      { resource, identifier, ...context }
    );
  }
}

/**
 * Permission error
 */
export class PermissionError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    context?: Record<string, unknown>
  ) {
    super(message, 'PERMISSION_ERROR', context);
  }
}

