/**
 * @file lib/services/session-recovery.service.ts
 * @description Fast session recovery logic for authentication
 * @created 2025-01-21
 * @updated 2025-12-04 - Simplified for faster recovery
 */

import { authService } from '@/lib/services/auth';
import { AuthUser } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';

// Short cooldown - just 5 seconds to prevent rapid retries
const LOGOUT_COOLDOWN = 5000;

/**
 * Fast session recovery - single attempt, no retries
 * @returns {Promise<AuthUser | null>} The authenticated user or null
 */
export async function recoverSession(): Promise<AuthUser | null> {
    try {
        // Skip on login/signup pages
        if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (path.startsWith('/login') || path.startsWith('/signup')) {
                return null;
            }

            // Skip if just logged out (short 5s cooldown)
            const logoutMarker = localStorage.getItem('user_logged_out');
            if (logoutMarker) {
                const logoutTime = parseInt(logoutMarker);
                if (Date.now() - logoutTime < LOGOUT_COOLDOWN) {
                    return null;
                }
                // Clear old marker
                localStorage.removeItem('user_logged_out');
                sessionStorage.removeItem('user_logged_out');
            }
        }

        // Single fast attempt - no retries
        const { data: { session }, error } = await authService.getSupabaseClient().auth.getSession();

        if (error || !session?.user) {
            return null;
        }

        // Return basic user immediately, profile/settings loaded separately
        return await authService.getCurrentUser();
    } catch (error) {
        logger.warn('Session recovery failed:', error);
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
