/**
 * @file store/useAuthStore.ts
 * @description Authentication state management
 * @created 2025-11-12
 * @modified 2025-12-03
 */

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import { STORAGE_KEYS } from '@/lib/services/storage.interface';
import { setFreeUserFlag, isFreeUser } from '@/lib/services/storage-provider';

const supabase = createClient();

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isFreeUser: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  
  // Free User Actions
  signInAsFreeUser: () => void;
  signOutFreeUser: () => void;
  initializeFreeUserSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isFreeUser: false,
  
  /**
   * Signs in a user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   * @throws {Error} When authentication fails
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No user data returned from authentication');
      }
      
      set({ 
        user: data.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null
      });
      
      logger.info('User signed in successfully', { userId: data.user.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      
      logger.error('Sign in error:', { 
        error: errorMessage,
        email,
        timestamp: new Date().toISOString()
      });
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false,
        user: null
      });
      
      throw error;
    }
  },
  
  /**
   * Signs up a new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   * @throws {Error} When registration fails
   */
  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No user data returned from registration');
      }
      
      set({ 
        user: data.user, 
        isAuthenticated: true, 
        isLoading: false,
        error: null
      });
      
      logger.info('User signed up successfully', { userId: data.user.id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      logger.error('Sign up error:', { 
        error: errorMessage,
        email,
        timestamp: new Date().toISOString()
      });
      
      set({ 
        isLoading: false, 
        error: errorMessage,
        isAuthenticated: false,
        user: null
      });
      
      throw error;
    }
  },
  
  /**
   * Signs out the current user
   * @returns {Promise<void>}
   * @throws {Error} When sign out fails
   */
  signOut: async () => {
    set({ isLoading: true });
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null
      });
      
      logger.info('User signed out successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      
      logger.error('Sign out error:', { 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      set({ isLoading: false });
      throw error;
    }
  },
  
  /**
   * Refreshes the current user session
   * @returns {Promise<void>}
   */
  refreshSession: async () => {
    set({ isLoading: true });
    
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        // If there's an error, user is not authenticated
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null
        });
        return;
      }
      
      if (data.user) {
        set({ 
          user: data.user, 
          isAuthenticated: true, 
          isLoading: false,
          error: null
        });
      } else {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      logger.error('Session refresh error:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      set({ isLoading: false });
    }
  },
  
  /**
   * Clears any authentication errors
   */
  clearError: () => {
    set({ error: null });
  },
  
  /**
   * Signs in as a free user (local storage mode)
   * Sets the free user flag in localStorage and updates state
   */
  signInAsFreeUser: () => {
    setFreeUserFlag(true);
    
    set({
      user: null,
      isAuthenticated: true,
      isFreeUser: true,
      isLoading: false,
      error: null,
    });
    
    logger.info('User signed in as free user (local mode)');
  },
  
  /**
   * Signs out from free user mode
   * Clears the session flag but preserves locally stored data
   */
  signOutFreeUser: () => {
    setFreeUserFlag(false);
    
    set({
      user: null,
      isAuthenticated: false,
      isFreeUser: false,
      isLoading: false,
      error: null,
    });
    
    logger.info('Free user signed out (data preserved)');
  },
  
  /**
   * Initializes free user session on app load
   * Checks localStorage for existing free user flag and restores session
   */
  initializeFreeUserSession: () => {
    const freeUserActive = isFreeUser();
    
    if (freeUserActive) {
      set({
        user: null,
        isAuthenticated: true,
        isFreeUser: true,
        isLoading: false,
        error: null,
      });
      
      logger.info('Free user session restored from localStorage');
    }
  },
}));