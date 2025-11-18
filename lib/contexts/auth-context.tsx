/**
 * @file lib/contexts/auth-context.tsx
 * @description React context for authentication state management
 * @created 2025-01-01
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { authService } from '@/lib/services/auth';
import { AuthUser, AuthState, SignUpData, SignInData, AuthError } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';
import { detectMobileBrowser, needsMobileSessionHandling, hasReliableStorage } from '@/lib/utils/platform';
import { authDebug } from '@/lib/services/auth-debug.service';
import { debugLogger } from '@/lib/services/debug-logger.service';

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
}

/**
 * Authentication provider component that manages auth state
 * @param {AuthProviderProps} props - Component props
 * @returns {JSX.Element} Provider component
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
   const [state, setState] = useState<AuthState>({
     user: null,
     loading: true,
     error: null,
   });

   // Detect mobile browser capabilities for adaptive behavior
   const browserInfo = detectMobileBrowser();
   const needsMobileHandling = needsMobileSessionHandling();
   const hasReliableStorageAvailable = hasReliableStorage();
   
   // Cache for user data to improve performance
   const userCache = useRef<Map<string, { user: AuthUser | null; timestamp: number }>>(new Map());
   const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  /**
   * Clear any authentication errors
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  /**
   * Set error state
   * @param {AuthError | null} error - Error to set
   */
  const setError = useCallback((error: AuthError | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  /**
   * Set user state
   * @param {AuthUser | null} user - User to set
   */
  const setUser = useCallback((user: AuthUser | null) => {
    setState(prev => ({ ...prev, user, loading: false, error: null }));
  }, []);

  /**
   * Get cached user data with fallback to fresh data
   */
  const getCachedUser = useCallback(async (forceRefresh = false): Promise<AuthUser | null> => {
    const cacheKey = 'current_user';
    const now = Date.now();
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = userCache.current.get(cacheKey);
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        logger.debug('User data served from cache');
        debugLogger.auth({
          operation: 'user_cache_hit',
          success: true,
          metadata: { cacheAge: now - cached.timestamp }
        });
        return cached.user;
      }
    }
    
    // Cache miss or expired, fetch fresh data
    try {
      debugLogger.auth({
        operation: 'user_cache_miss',
        success: true,
        metadata: { forceRefresh, cacheExpired: !!userCache.current.get(cacheKey) }
      });
      
      const user = await authService.getCurrentUser();
      
      // Cache the fresh data
      userCache.current.set(cacheKey, {
        user,
        timestamp: now
      });
      
      logger.debug('User data fetched and cached');
      return user;
    } catch (error) {
      logger.error('Error fetching user data:', error);
      debugLogger.auth({
        operation: 'user_fetch_error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [CACHE_DURATION]);

  /**
   * Refresh current user data
   */
  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getCachedUser(true); // Force refresh
      setUser(user);
    } catch (error) {
      logger.error('Error refreshing user:', error);
      setError({
        message: error instanceof Error ? error.message : 'Failed to refresh user data',
      });
    }
  }, [setLoading, setUser, setError, getCachedUser]);

  /**
   * Sign up a new user
   * @param {SignUpData} data - Signup data
   * @returns {Promise<{error: AuthError | null}>}
   */
  const signUp = useCallback(async (data: SignUpData): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();
      
      const { user, error } = await authService.signUp(data);
      
      if (error) {
        setError(error);
        setLoading(false);
        return { error };
      }
      
      setUser(user);
      setLoading(false);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      setLoading(false);
      return { error: authError };
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Sign in an existing user
   * @param {SignInData} data - Signin data
   * @returns {Promise<{error: AuthError | null}>}
   */
  const signIn = useCallback(async (data: SignInData): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();
      
      const { user, error } = await authService.signIn(data);
      
      if (error) {
        setError(error);
        setLoading(false);
        return { error };
      }
      
      setUser(user);
      setLoading(false);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      setLoading(false);
      return { error: authError };
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Sign out current user
   * @returns {Promise<{error: AuthError | null}>}
   */
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    try {
      setLoading(true);
      clearError();
      
      // Sign out from Supabase
      const { error } = await authService.signOut();
      
      if (error) {
        setError(error);
        setLoading(false);
        return { error };
      }
      
      setUser(null);
      setLoading(false);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      setError(authError);
      setLoading(false);
      return { error: authError };
    }
  }, [setLoading, clearError, setError, setUser]);

  /**
   * Reset user password
   * @param {string} email - User email
   * @returns {Promise<{error: AuthError | null}>}
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
   * @param {string} newPassword - New password
   * @returns {Promise<{error: AuthError | null}>}
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
    // Start authentication debugging session
    authDebug.startSession({
      isMobile: browserInfo.isMobile,
      isIOS: browserInfo.isIOS,
      isAndroid: browserInfo.isAndroid,
      isSafari: browserInfo.isSafari,
      supportsPersistentStorage: browserInfo.supportsPersistentStorage,
      hasReliableStorage: hasReliableStorageAvailable
    });

    let mounted = true;
    let isInitializing = true;
    let initializationTimeout: NodeJS.Timeout | null = null;
    let sessionCheckInterval: NodeJS.Timeout | null = null;
    let dataLoadTimeout: NodeJS.Timeout | null = null;

    // Enhanced mobile-aware session recovery with storage fallback
    const recoverSession = async (): Promise<AuthUser | null> => {
      try {
        // CRITICAL: For mobile browsers, try multiple recovery strategies
        if (needsMobileHandling || !hasReliableStorageAvailable) {
          logger.debug('Mobile browser detected, attempting multi-strategy session recovery');

          // Strategy 1: Try direct Supabase session recovery with retry
          try {
            const maxRetries = 3;
            let lastError: any = null;
            
            for (let i = 0; i < maxRetries; i++) {
              try {
                authDebug.logRecovery('supabase_direct', false, undefined, i);
                
                const { data: { session }, error } = await authService.getSupabaseClient().auth.getSession();
                
                if (!error && session?.user) {
                  logger.debug(`Session recovered via Supabase client (attempt ${i + 1})`);
                  authDebug.logRecovery('supabase_direct', true, undefined, i);
                  const user = await authService.getCurrentUser();
                  if (user) {
                    authDebug.markSuccess('supabase_direct');
                    return user;
                  }
                }
                
                if (error) lastError = error;
                
                // Wait before retry (exponential backoff)
                if (i < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
                }
              } catch (supabaseError) {
                lastError = supabaseError;
                logger.warn(`Supabase session recovery attempt ${i + 1} failed:`, supabaseError);
                authDebug.logRecovery('supabase_direct', false, (supabaseError as Error).message || 'Unknown error', i);
                
                if (i < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, i)));
                }
              }
            }
            
            logger.warn('All Supabase session recovery attempts failed:', lastError);
          } catch (supabaseError) {
            logger.warn('Supabase session recovery failed:', supabaseError);
            authDebug.logRecovery('supabase_direct', false, (supabaseError as Error).message || 'Unknown error', 0);
          }

          // Strategy 2: Try manual localStorage recovery (mobile browsers may have delayed storage)
          try {
            authDebug.logRecovery('localStorage', false);
            
            if (typeof window !== 'undefined') {
              const storageKey = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
              const storedSession = localStorage.getItem(storageKey);
              
              if (storedSession) {
                const sessionData = JSON.parse(storedSession);
                if (sessionData?.user && sessionData?.access_token) {
                  logger.debug('Session recovered via localStorage fallback');
                  
                  // Validate the token by trying to use it
                  const { data: { user }, error } = await authService.getSupabaseClient().auth.setSession({
                    access_token: sessionData.access_token,
                    refresh_token: sessionData.refresh_token
                  });

                  if (!error && user) {
                    const fullUser = await authService.getCurrentUser();
                    if (fullUser) return fullUser;
                  }
                }
              }
            }
          } catch (storageError) {
            logger.warn('localStorage recovery failed:', storageError);
            authDebug.logRecovery('localStorage', false, (storageError as Error).message || 'Unknown error');
          }

          // Strategy 3: Try sessionStorage as fallback
          try {
            authDebug.logRecovery('sessionStorage', false);
            
            if (typeof window !== 'undefined') {
              const storageKey = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
              const sessionStored = sessionStorage.getItem(storageKey);
              
              if (sessionStored) {
                const sessionData = JSON.parse(sessionStored);
                if (sessionData?.user && sessionData?.access_token) {
                  logger.debug('Session recovered via sessionStorage fallback');
                  
                  const { data: { user }, error } = await authService.getSupabaseClient().auth.setSession({
                    access_token: sessionData.access_token,
                    refresh_token: sessionData.refresh_token
                  });

                  if (!error && user) {
                    const fullUser = await authService.getCurrentUser();
                    if (fullUser) return fullUser;
                  }
                }
              }
            }
          } catch (sessionStorageError) {
            logger.warn('sessionStorage recovery failed:', sessionStorageError);
            authDebug.logRecovery('sessionStorage', false, (sessionStorageError as Error).message || 'Unknown error');
          }

          logger.warn('All mobile session recovery strategies failed');
          authDebug.markFailed('All mobile session recovery strategies failed');
          return null;
        } else {
          // Use cached user data for better performance
          authDebug.logRecovery('cached_getUser', false);
          try {
            const result = await getCachedUser();
            if (result) {
              authDebug.markSuccess('cached_getUser');
            } else {
              authDebug.markFailed('getCachedUser returned null');
            }
            return result;
          } catch (error) {
            // Try Supabase session check as fallback for better success rate
            authDebug.logRecovery('supabase_session_check', false);
            try {
              const { data: { session }, error } = await authService.getSupabaseClient().auth.getSession();
              if (!error && session?.user) {
                authDebug.markSuccess('supabase_session_check');
                return session.user;
              }
            } catch (fallbackError) {
              logger.debug('Fallback session check also failed:', fallbackError);
            }
            // Final fallback: Check recent logout and try one more time
            if (typeof window !== 'undefined') {
              const logoutMarker = localStorage.getItem('user_logged_out') || sessionStorage.getItem('user_logged_out');
              if (logoutMarker) {
                const logoutTime = parseInt(logoutMarker);
                const now = Date.now();
                const tenMinutes = 10 * 60 * 1000;
                
                if (now - logoutTime < tenMinutes) {
                  logger.debug('Skipping session recovery - user recently logged out');
                  authDebug.markFailed('user_recently_logged_out');
                  return null;
                }
              }
              
              // Last attempt with direct getUser call
              try {
                const { data: { user: finalUser } } = await authService.getSupabaseClient().auth.getUser();
                if (finalUser) {
                  authDebug.markSuccess('final_fallback_getUser');
                  return finalUser;
                }
              } catch (finalError) {
                logger.debug('Final fallback also failed:', finalError);
              }
            }
            
            authDebug.markFailed('all_recovery_strategies_exhausted');
            return null;
          }
        }
      } catch (error) {
        logger.error('Session recovery error:', error);
        return null;
      }
    };

    // Get initial user with enhanced mobile handling
    const initializeAuth = async () => {
      try {
        // Log browser capabilities for debugging
        logger.debug('Auth initialization - Browser info:', {
          isMobile: browserInfo.isMobile,
          isIOS: browserInfo.isIOS,
          isAndroid: browserInfo.isAndroid,
          isSafari: browserInfo.isSafari,
          supportsPersistentStorage: browserInfo.supportsPersistentStorage,
          needsMobileHandling,
          hasReliableStorage: hasReliableStorageAvailable,
        });

        // Add timeout with mobile-specific duration
        // Enhanced timeout for mobile browsers, especially after clearing site data
        const timeoutDuration = needsMobileHandling ? 35000 : 15000; // 35s for mobile, 15s for desktop
        const timeoutPromise = new Promise<never>((_, reject) => {
          initializationTimeout = setTimeout(() => reject(new Error('Auth initialization timeout')), timeoutDuration);
        });

        const userPromise = recoverSession();
        
        try {
          const user = await Promise.race([userPromise, timeoutPromise]);
          
          if (mounted) {
            setUser(user);
            isInitializing = false;

            // Set up periodic session validation for mobile browsers
            if (needsMobileHandling && user) {
              sessionCheckInterval = setInterval(async () => {
                try {
                  // Check if user has explicitly logged out before attempting recovery
                  if (typeof window !== 'undefined') {
                    const logoutMarker = localStorage.getItem('user_logged_out') || sessionStorage.getItem('user_logged_out');
                    if (logoutMarker) {
                      const logoutTime = parseInt(logoutMarker);
                      const now = Date.now();
                      const oneHour = 60 * 60 * 1000;
                      
                      // If logout was recent (within 1 hour), don't attempt recovery
                      if (now - logoutTime < oneHour) {
                        logger.debug('Skipping session recovery - user recently logged out');
                        return;
                      }
                    }
                  }
                  
                  const currentUser = await recoverSession();
                  if (!currentUser && mounted) {
                    logger.warn('Mobile session lost, triggering logout');
                    setUser(null);
                    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
                      window.location.replace('/login?expired=true');
                    }
                  }
                } catch (error) {
                  logger.error('Mobile session check failed:', error);
                }
              }, 30000); // Check every 30 seconds for mobile
            }
          }
        } catch (timeoutError) {
          if (mounted) {
            logger.warn('Auth initialization timed out, but allowing user to continue with limited functionality');
            setUser(null);
            isInitializing = false;
            
            // Don't mark as failed - let user retry by refreshing or manual login
            setError({
              message: 'Authentication is taking longer than expected. Please refresh the page or try logging in again.',
            });
          }
        }

      } catch (error) {
        logger.error('Error initializing auth:', error);
        if (mounted) {
          const isTimeout = error instanceof Error && error.message.includes('timeout');
          setError({
            message: isTimeout
              ? 'Authentication initialization timed out. Please refresh the page.'
              : needsMobileHandling
                ? 'Mobile authentication failed. Please check your connection and try again.'
                : 'Failed to initialize authentication',
          });
          isInitializing = false;
          
          // Log timeout or failure
          if (isTimeout) {
            authDebug.logTimeout('auth_initialization', needsMobileHandling ? 20000 : 10000);
          } else {
            authDebug.markFailed(error instanceof Error ? error.message : 'Unknown initialization error');
          }
        }
      } finally {
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
          initializationTimeout = null;
        }
      }
    };

    initializeAuth();

    // Clear session check interval when user logs out
    const clearSessionCheck = () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
        logger.debug('Session check interval cleared');
      }
    };

    // Listen for auth state changes with enhanced error handling
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        // Handle SIGNED_IN event - user just logged in
        if (event === 'SIGNED_IN' && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
            isInitializing = false;
            // Don't redirect here - let the login form handle it
          }
        }
        // Handle SIGNED_OUT event - user logged out
        else if (event === 'SIGNED_OUT') {
          if (mounted) {
            logger.info('Auth state changed to SIGNED_OUT');
            setUser(null);
            isInitializing = false;
            
            // Clear session check interval to prevent post-logout recovery attempts
            clearSessionCheck();
            
            // Mark user as logged out to prevent session recovery attempts
            if (typeof window !== 'undefined') {
              localStorage.setItem('user_logged_out', Date.now().toString());
              sessionStorage.setItem('user_logged_out', Date.now().toString());
              
              // Clear any remaining auth tokens
              localStorage.removeItem('supabase.auth.token');
              sessionStorage.removeItem('supabase.auth.token');
            }
            
            // Only redirect if not already on login page
            if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
              logger.debug('Redirecting to login page after sign out');
              window.location.replace('/login');
            }
          }
        }
        // Handle TOKEN_REFRESHED - session refreshed
        else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
          }
        }
        // Handle initial session restoration
        else if (isInitializing && session?.user) {
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            setUser(user);
            isInitializing = false;
          }
        }
        // Handle session removal
        else if (!session && !isInitializing && mounted) {
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

    // Handle session expiration
    const handleSessionExpiration = () => {
      if (mounted) {
        setUser(null);
        // Redirect to login if not already there
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.replace('/login?expired=true');
        }
      }
    };

    // Listen for logout broadcasts from other tabs with enhanced error handling
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
            handleSessionExpiration();
          }
        } catch (error) {
          logger.error('Error handling broadcast message:', error);
        }
      });

      return () => {
        mounted = false;
        if (initializationTimeout) {
          clearTimeout(initializationTimeout);
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
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      subscription?.unsubscribe();
    };
  }, [setUser, setError, browserInfo.isAndroid, browserInfo.isIOS, browserInfo.isMobile, browserInfo.isSafari, browserInfo.supportsPersistentStorage, hasReliableStorageAvailable, needsMobileHandling]);

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