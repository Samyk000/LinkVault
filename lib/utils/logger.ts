/**
 * @file lib/utils/logger.ts
 * @description Production-safe logging utility
 * @created 2025-01-01
 * @updated 2025-12-26 - Fixed production warning logging
 */

/**
 * Production-safe logger that only logs in development
 */
export const logger = {
  /**
   * Log debug information (development only)
   */
  debug: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },

  /**
   * Log information (development only)
   */
  info: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },

  /**
   * Log warnings (always logged in production for visibility)
   * FIXED: Warnings were being silently dropped in production
   */
  warn: (...args: unknown[]): void => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    } else {
      // FIXED: Log warnings in production with timestamp for debugging
      console.warn('[WARN]', new Date().toISOString(), ...args);
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      // errorTrackingService.captureMessage(args[0]?.toString(), 'warning');
    }
  },

  /**
   * Log errors (always logged, sent to error tracking in production)
   */
  error: (...args: unknown[]): void => {
    // Always log errors, but format differently in production
    if (process.env.NODE_ENV === 'development') {
      console.error(...args);
    } else {
      // In production, send to error tracking service
      console.error('[ERROR]', new Date().toISOString(), ...args);
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      // errorTrackingService.captureException(args[0]);
    }
  },

  /**
   * Log group (development only)
   */
  group: (label: string): void => {
    if (process.env.NODE_ENV === 'development') {
      console.group(label);
    }
  },

  /**
   * End log group (development only)
   */
  groupEnd: (): void => {
    if (process.env.NODE_ENV === 'development') {
      console.groupEnd();
    }
  },
};

