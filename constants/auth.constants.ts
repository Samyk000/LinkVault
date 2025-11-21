/**
 * @file constants/auth.constants.ts
 * @description Authentication-related constants for consistent configuration
 * @created 2025-01-21
 */

export const AUTH_CONSTANTS = {
    /**
     * Interval for periodic session validation (milliseconds)
     * Reduced from 30s to 120s to conserve mobile battery
     */
    SESSION_CHECK_INTERVAL: 120000, // 2 minutes

    /**
     * Timeout for auth initialization (milliseconds)
     * Reduced from 35s/15s to 8s for faster feedback
     */
    INIT_TIMEOUT: 8000, // 8 seconds

    /**
     * Delay between retry attempts (milliseconds)
     */
    RETRY_DELAY: 500, // 500ms

    /**
     * Maximum number of retry attempts for session verification
     */
    MAX_RETRIES: 2,

    /**
     * Duration to wait after logout before allowing session recovery (milliseconds)
     */
    POST_LOGOUT_COOLDOWN: 300000, // 5 minutes

    /**
     * Timeout for network requests (milliseconds)
     */
    FETCH_TIMEOUT: 15000, // 15 seconds
} as const;

/**
 * User-friendly error messages for common auth errors
 */
export const AUTH_ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
    EMAIL_NOT_CONFIRMED: 'Please verify your email address before signing in. Check your inbox for a verification link.',
    TOO_MANY_REQUESTS: 'Too many login attempts. Please wait a few minutes and try again.',
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    SESSION_NOT_ESTABLISHED: 'Session not established. Please try again.',
    OFFLINE: 'You are currently offline. Please check your internet connection and try again.',
    UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    INIT_TIMEOUT: 'Authentication is taking longer than expected. Please refresh the page or try logging in again.',
} as const;
