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
import { AUTH_CONSTANTS } from '@/constants/auth.constants';
import { recoverSession, validateSession, markUserLoggedOut, clearLogoutMarker } from '@/lib/services/session-recovery.service';

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
    let sessionCheckInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize authentication state
     * OPTIMIZED: Reduced timeout from 35s/15s to 8s
     */
    const initializeAuth = async () => {
      // If we have an initial user from SSR, skip client-side recovery
      if (initialUser) {
        logger.debug('Auth initialized with SSR user');
        return;
      }

      try {
        // Set timeout for auth initialization
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Auth initialization timeout')), AUTH_CONSTANTS.INIT_TIMEOUT);
        });

        const userPromise = recoverSession();

        try {
          const user = await Promise.race([userPromise, timeoutPromise]);

          if (mounted) {
            setUser(user);

            // Set up periodic session validation (every 2 minutes)
            // Only validate if we have a user
            sessionCheckInterval = setInterval(async () => {
              // Check if we have a current user before validating session
              // This prevents spurious "session expired" toasts on public pages
              const currentUser = await authService.getCurrentUser();
              if (!currentUser) return;

              const isValid = await validateSession();
              if (!isValid && mounted) {
                logger.warn('Session expired, redirecting to login');
                setUser(null);
                if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                  window.location.replace('/login?expired=true');
                }
              }
            }, AUTH_CONSTANTS.SESSION_CHECK_INTERVAL);
          }
        } catch (timeoutError) {
          if (mounted) {
            logger.warn('Auth initialization timed out');
            setUser(null);
            setError({
              message: 'Authentication is taking longer than expected. Please refresh the page or try logging in again.',
            });
          }
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        if (mounted) {
          setError({
            message: 'Failed to initialize authentication',
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            logger.info('Auth state changed to SIGNED_OUT');
            setUser(null);

            // Only redirect if not already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              window.location.replace('/login');
            }
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
          }
        } else if (!session && mounted) {
          setUser(null);
        }
      } catch (error) {
        logger.error('Error handling auth state change:', error);
        if (mounted) {
          setError({
            message: 'Authentication state change failed',
          });
        }
      }
    });

    // Listen for logout broadcasts from other tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('auth-sync');
      channel.addEventListener('message', (event) => {
        try {
          if (event.data.type === 'LOGOUT' && mounted) {
            setUser(null);
            if (!window.location.pathname.startsWith('/login')) {
              window.location.replace('/login');
            }
          } else if (event.data.type === 'SESSION_EXPIRED' && mounted) {
            setUser(null);
            if (!window.location.pathname.startsWith('/login')) {
              window.location.replace('/login?expired=true');
            }
          }
        } catch (error) {
          logger.error('Error handling broadcast message:', error);
        }
      });

      return () => {
        mounted = false;
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
        }
        subscription?.unsubscribe();
        try {
          channel.close();
        } catch (error) {
          logger.warn('Error closing broadcast channel:', error);
        }
      };
    }

    return () => {
      mounted = false;
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      subscription?.unsubscribe();
    };
  }, [setUser, setError, initialUser]);

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