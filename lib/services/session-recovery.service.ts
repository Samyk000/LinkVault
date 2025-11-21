/**
 * @file lib/services/session-recovery.service.ts
 * @description Simplified session recovery logic for authentication
 * @created 2025-01-21
 */

import { authService } from '@/lib/services/auth';
import { AuthUser } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';
import { AUTH_CONSTANTS } from '@/constants/auth.constants';

/**
 * Attempts to recover an existing user session
 * Uses a simplified 1 primary + 1 fallback strategy instead of the previous 3 strategies
 * 
 * @returns {Promise<AuthUser | null>} The authenticated user or null if no session exists
 */
export async function recoverSession(): Promise<AuthUser | null> {
    try {
        // OPTIMIZATION: Skip session recovery on login page - no session expected
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
            logger.debug('Skipping session recovery on login page');
            return null;
        }

        // OPTIMIZATION: Skip if user recently logged out
        if (typeof window !== 'undefined') {
            const logoutMarker = localStorage.getItem('user_logged_out') || sessionStorage.getItem('user_logged_out');
            if (logoutMarker) {
                const logoutTime = parseInt(logoutMarker);
                const now = Date.now();

                if (now - logoutTime < AUTH_CONSTANTS.POST_LOGOUT_COOLDOWN) {
                    logger.debug('Skipping session recovery - user recently logged out');
                    return null;
                }
            }
        }

        // PRIMARY STRATEGY: Get session from Supabase with retry
        const maxRetries = AUTH_CONSTANTS.MAX_RETRIES;
        let lastError: any = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const { data: { session }, error } = await authService.getSupabaseClient().auth.getSession();

                if (!error && session?.user) {
                    logger.debug(`Session recovered successfully (attempt ${attempt + 1})`);
                    const user = await authService.getCurrentUser();
                    return user;
                }

                lastError = error;

                // Wait before retry
                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTH_CONSTANTS.RETRY_DELAY));
                }
            } catch (err) {
                lastError = err;
                logger.warn(`Session recovery attempt ${attempt + 1} failed:`, err);

                if (attempt < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, AUTH_CONSTANTS.RETRY_DELAY));
                }
            }
        }

        // FALLBACK STRATEGY: Try getUser() as last resort
        if (lastError) {
            logger.debug('Primary session recovery failed, trying fallback');
            try {
                const { data: { user }, error } = await authService.getSupabaseClient().auth.getUser();

                if (!error && user) {
                    logger.debug('Session recovered via fallback strategy');
                    return user;
                }
            } catch (fallbackError) {
                logger.debug('Fallback session recovery also failed:', fallbackError);
            }
        }

        // No session found - this is expected after logout or on login page
        logger.debug('No session to recover - user needs to sign in');
        return null;

    } catch (error) {
        logger.error('Session recovery error:', error);
        return null;
    }
}

/**
 * Validates if a session is still active
 * @returns {Promise<boolean>} True if session is valid
 */
export async function validateSession(): Promise<boolean> {
    try {
        const { data: { session }, error } = await authService.getSupabaseClient().auth.getSession();
        return !error && !!session;
    } catch (error) {
        logger.error('Session validation error:', error);
        return false;
    }
}

/**
 * Mark that user has logged out to prevent automatic session recovery
 */
export function markUserLoggedOut(): void {
    if (typeof window !== 'undefined') {
        const timestamp = Date.now().toString();
        localStorage.setItem('user_logged_out', timestamp);
        sessionStorage.setItem('user_logged_out', timestamp);
        logger.debug('User marked as logged out');
    }
}

/**
 * Clear the logout marker (called on successful login)
 */
export function clearLogoutMarker(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('user_logged_out');
        sessionStorage.removeItem('user_logged_out');
        logger.debug('Logout marker cleared');
    }
}
