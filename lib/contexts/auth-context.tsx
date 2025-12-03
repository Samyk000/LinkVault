/**
 * @file lib/contexts/auth-context.tsx
 * @description Simplified React context for authentication state management
 * @created 2025-01-01
 * @modified 2025-01-21
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '@/lib/services/auth';
import { AuthUser, AuthState, SignUpData, SignInData, AuthError } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';
import { recoverSession, markUserLoggedOut, clearLogoutMarker } from '@/lib/services/session-recovery.service';

interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<{ error: AuthError | null }>;
  signIn: (data: SignInData) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

/**
 * Authentication provider component that manages auth state
 * OPTIMIZED: Reduced from 800 lines to ~300 lines by extracting session recovery logic
 * @param {AuthProviderProps} props - Component props
 * @returns {JSX.Element} Provider component
 */
export function AuthProvider({ children, initialUser }: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: initialUser || null,
    loading: !initialUser,
    error: null,
  });

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  /**
   * Set error state
   */
  const setError = useCallback((error: AuthError | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  /**
   * Set user state
   */
  const setUser = useCallback((user: AuthUser | null) => {
    setState(prev => ({ ...prev, user, loading: false, error: null }));
  }, []);

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      setUser(user);
    } catch (error) {
      logger.error('Error refreshing user:', error);
      setError({
        message: error instanceof Error ? error.message : 'Failed to refresh user data',
      });
    }
  }, [setLoading, setUser, setError]);

  /**
   * Sign up a new user
   */
  const signUp = useCallback(async (data: SignUpData): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();

      const { user, error } = await authService.signUp(data);

      if (error) {
        setError(error);
        return { error };
      }

      setUser(user);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Sign in an existing user
   */
  const signIn = useCallback(async (data: SignInData): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();

      const { user, error } = await authService.signIn(data);

      if (error) {
        setError(error);
        return { error };
      }

      // Clear logout marker on successful login
      clearLogoutMarker();

      setUser(user);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();

      // Mark user as logged out BEFORE actual signout
      markUserLoggedOut();

      // Sign out from Supabase
      const { error } = await authService.signOut();

      if (error) {
        setError(error);
        return { error };
      }

      setUser(null);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Reset user password
   */
  const resetPassword = useCallback(async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      clearError();
      return await authService.resetPassword(email);
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    }
  }, [clearError, setError]);

  /**
   * Update user password
   */
  const updatePassword = useCallback(async (newPassword: string): Promise<{ error: AuthError | null }> => {
    try {
      clearError();
      return await authService.updatePassword(newPassword);
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      return { error: authError };
    }
  }, [clearError, setError]);

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true;

    /**
     * Initialize authentication state
     * SIMPLIFIED: Only recover session if no initial user from SSR
     */
    const initializeAuth = async () => {
      // If we have an initial user from SSR, we're done
      if (initialUser) {
        logger.debug('Auth initialized with SSR user');
        setState(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Quick session check - no complex recovery needed
        const user = await recoverSession();
        
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            user: user, 
            loading: false,
            error: null 
          }));
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        if (mounted) {
          setState(prev => ({ 
            ...prev, 
            user: null, 
            loading: false,
            error: null // Don't show error for failed session recovery
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes from Supabase
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      logger.debug('Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - update state immediately with basic user info
        // Profile/settings will be fetched by getCurrentUser
        const user = await authService.getCurrentUser();
        if (user && mounted) {
          setState(prev => ({ ...prev, user, loading: false, error: null }));
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setState(prev => ({ ...prev, user: null, loading: false, error: null }));
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - no need to refetch user, just update if needed
        logger.debug('Token refreshed');
      }
    });

    // Listen for logout broadcasts from other tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('auth-sync');
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'LOGOUT' && mounted) {
          setState(prev => ({ ...prev, user: null, loading: false }));
        }
      });
    }

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      if (channel) {
        try { channel.close(); } catch (e) { /* ignore */ }
      }
    };
  }, [initialUser]);

  const value: AuthContextType = {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 * @returns {AuthContextType} Authentication context
 * @throws {Error} When used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}