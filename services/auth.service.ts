/**
 * @file services/auth.service.ts
 * @description Authentication service
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

const supabase = createClient();

/**
 * Authentication service
 * Handles all authentication-related operations
 */
export const authService = {
  /**
   * Signs in a user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<User>} Authenticated user
   * @throws {Error} When authentication fails
   */
  async signIn(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      logger.error('Sign in error:', {
        error: error.message,
        email,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    if (!data.user) {
      const error = new Error('No user data returned from authentication');
      logger.error('Sign in error:', {
        error: error.message,
        email,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    logger.info('User signed in successfully', { userId: data.user.id });
    return data.user;
  },
  
  /**
   * Signs up a new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<User>} Registered user
   * @throws {Error} When registration fails
   */
  async signUp(email: string, password: string): Promise<User> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      logger.error('Sign up error:', {
        error: error.message,
        email,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    if (!data.user) {
      const error = new Error('No user data returned from registration');
      logger.error('Sign up error:', {
        error: error.message,
        email,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    logger.info('User signed up successfully', { userId: data.user.id });
    return data.user;
  },
  
  /**
   * Signs out the current user with comprehensive session clearing
   * @returns {Promise<void>}
   * @throws {Error} When sign out fails
   */
  async signOut(): Promise<void> {
    try {
      // Clear all authentication-related storage first
      if (typeof window !== 'undefined') {
        // Clear Supabase auth storage
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.removeItem('supabase.auth.token');
        
        // Clear any other auth-related storage
        const keysToClear = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToClear.push(key);
          }
        }
        keysToClear.forEach(key => localStorage.removeItem(key));

        const sessionKeysToClear = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            sessionKeysToClear.push(key);
          }
        }
        sessionKeysToClear.forEach(key => sessionStorage.removeItem(key));

        // Clear cookies
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('supabase') || name.includes('auth')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};secure;samesite=lax`;
          }
        });
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logger.error('Sign out error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        // Continue with cleanup even if Supabase sign out fails
      }
      
      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Critical sign out error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Don't throw - ensure logout completes even if there are errors
    }
  },
  
  /**
   * Refreshes the current user session
   * @returns {Promise<User | null>} Current user or null if not authenticated
   */
  async refreshSession(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        logger.warn('Session refresh warning:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return null;
      }
      
      return data.user;
    } catch (error) {
      logger.error('Session refresh error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return null;
    }
  },
  
  /**
   * Gets the current authenticated user
   * @returns {Promise<User | null>} Current user or null if not authenticated
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        logger.warn('Get current user warning:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return null;
      }
      
      return data.user;
    } catch (error) {
      logger.error('Get current user error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return null;
    }
  },
};

export type AuthService = typeof authService;