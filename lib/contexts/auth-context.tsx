/**
 * @file lib/contexts/auth-context.tsx
 * @description Simplified React context for authentication state management
 * @created 2025-01-01
 * @modified 2025-01-21
 * 
 * CHROMIUM MOBILE FIX: Implements proper auth hydration state machine
 * 
 * Auth States:
 * - HYDRATING: Supabase has not finished determining auth state (isSessionReady=false)
 * - AUTHENTICATED: User is definitively present (isSessionReady=true, user!=null)
 * - UNAUTHENTICATED: Supabase has definitively confirmed no user (isSessionReady=true, user=null)
 * 
 * Key Insight: getUser()===null does NOT mean logged out on Chromium mobile.
 * IndexedDB may not be hydrated yet. Only SIGNED_OUT event or explicit user action
 * can transition to UNAUTHENTICATED state.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { authService } from '@/lib/services/auth';
import { AuthUser, AuthState, SignUpData, SignInData, AuthError } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';
import { recoverSession, markUserLoggedOut, clearLogoutMarker, wasUserLoggedOut } from '@/lib/services/session-recovery.service';
import { guestStorageService } from '@/lib/services/guest-storage.service';

interface AuthContextType extends AuthState {
  signUp: (data: SignUpData) => Promise<{ error: AuthError | null }>;
  signIn: (data: SignInData) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  /** Indicates if auth hydration is complete - safe to make auth-dependent decisions */
  isSessionReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}

/**
 * Authentication provider component that manages auth state
 * 
 * CHROMIUM MOBILE FIX: Uses a proper hydration state machine:
 * - isSessionReady=false means we're still hydrating (don't assume logged out)
 * - isSessionReady=true means we have definitive auth state
 * - Only explicit events (SIGNED_OUT, user action) can confirm "no user"
 * 
 * @param {AuthProviderProps} props - Component props
 * @returns {JSX.Element} Provider component
 */
export function AuthProvider({ children, initialUser }: AuthProviderProps): React.JSX.Element {
  const [state, setState] = useState<AuthState>({
    user: initialUser || null,
    loading: !initialUser,
    error: null,
  });
  
  // CHROMIUM FIX: Track auth hydration state
  // false = still hydrating (don't assume logged out)
  // true = definitive state (safe to act on user presence/absence)
  const [isSessionReady, setIsSessionReady] = useState(!!initialUser);
  
  // Track if we've received the definitive auth event from Supabase
  const hasReceivedAuthEvent = useRef(false);

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
      setIsSessionReady(false); // Mark session as not ready during sign-in
      clearError();

      const { user, error } = await authService.signIn(data);

      if (error) {
        setError(error);
        return { error };
      }

      // Clear logout marker on successful login
      clearLogoutMarker();

      // Deactivate guest mode when user authenticates, but PRESERVE the data
      // User can return to guest mode later and their data will still be there
      if (guestStorageService.isGuestMode()) {
        guestStorageService.deactivateGuestMode();
        logger.info('Guest mode deactivated on authentication (data preserved)');
      }

      setUser(user);
      // CRITICAL: Mark session as ready AFTER user is set
      setIsSessionReady(true);
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
      
      // CRITICAL: Set isSessionReady to false BEFORE clearing user
      // This prevents race conditions during sign-out/sign-in transitions
      setIsSessionReady(false);

      // Mark user as logged out BEFORE actual signout
      markUserLoggedOut();

      // Sign out from Supabase
      const { error } = await authService.signOut();

      if (error) {
        // On error, restore session ready state
        setIsSessionReady(true);
        setError(error);
        return { error };
      }

      setUser(null);
      // CRITICAL: Mark session as ready AFTER user is cleared
      // Now definitively logged out
      setIsSessionReady(true);
      return { error: null };
    } catch (error) {
      const authError = {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      // On error, restore session ready state
      setIsSessionReady(true);
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
     * 
     * CHROMIUM MOBILE FIX: Proper hydration state machine
     * 
     * The problem: On Chromium mobile, IndexedDB hydration is non-deterministic.
     * getUser() may return null even when user is logged in (storage not ready).
     * INITIAL_SESSION may also fire with null session before storage is ready.
     * 
     * The solution: 
     * 1. If getUser() returns a user → AUTHENTICATED (definitive)
     * 2. If getUser() returns null AND user explicitly logged out → UNAUTHENTICATED (definitive)
     * 3. If getUser() returns null AND no logout marker → stay HYDRATING, wait for auth event
     * 4. SIGNED_IN event → AUTHENTICATED (definitive)
     * 5. SIGNED_OUT event → UNAUTHENTICATED (definitive)
     * 6. INITIAL_SESSION with user → AUTHENTICATED (definitive)
     * 7. INITIAL_SESSION with null → only finalize if we already received an auth event
     */
    const initializeAuth = async () => {
      // If we have an initial user from SSR, we're done - session is definitively ready
      if (initialUser) {
        logger.debug('Auth initialized with SSR user');
        setState(prev => ({ ...prev, loading: false }));
        setIsSessionReady(true);
        hasReceivedAuthEvent.current = true;
        return;
      }

      try {
        // Quick session check
        const user = await recoverSession();
        
        if (mounted) {
          if (user) {
            // Got a user - definitively AUTHENTICATED
            logger.debug('Auth: User found from recoverSession');
            setState(prev => ({ ...prev, user, loading: false, error: null }));
            setIsSessionReady(true);
            hasReceivedAuthEvent.current = true;
          } else if (wasUserLoggedOut()) {
            // No user AND explicit logout marker - definitively UNAUTHENTICATED
            logger.debug('Auth: No user, explicit logout detected');
            setState(prev => ({ ...prev, user: null, loading: false, error: null }));
            setIsSessionReady(true);
            hasReceivedAuthEvent.current = true;
          } else {
            // No user but no logout marker - could be Chromium storage delay
            // Stay in HYDRATING state, wait for Supabase auth event
            logger.debug('Auth: No user from recoverSession, waiting for auth event (Chromium fix)');
            setState(prev => ({ ...prev, user: null, loading: false, error: null }));
            // DO NOT set isSessionReady - we're still hydrating
          }
        }
      } catch (error) {
        logger.error('Error initializing auth:', error);
        if (mounted) {
          setState(prev => ({ ...prev, user: null, loading: false, error: null }));
          // On error, check if user explicitly logged out
          if (wasUserLoggedOut()) {
            setIsSessionReady(true);
            hasReceivedAuthEvent.current = true;
          }
          // Otherwise stay in hydrating state
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes from Supabase
    // This is the AUTHORITATIVE source for auth state
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      logger.debug('Auth state change:', event, session?.user?.id ? 'has user' : 'no user');

      if (event === 'SIGNED_IN' && session?.user) {
        // DEFINITIVE: User signed in
        hasReceivedAuthEvent.current = true;
        const user = await authService.getCurrentUser();
        if (user && mounted) {
          setState(prev => ({ ...prev, user, loading: false, error: null }));
          setIsSessionReady(true);
        }
      } else if (event === 'SIGNED_OUT') {
        // DEFINITIVE: User signed out
        hasReceivedAuthEvent.current = true;
        if (mounted) {
          setState(prev => ({ ...prev, user: null, loading: false, error: null }));
          setIsSessionReady(true);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed with valid user - session is definitely ready
        hasReceivedAuthEvent.current = true;
        logger.debug('Token refreshed');
        setIsSessionReady(true);
      } else if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION handling - this is where Chromium mobile fails
        // 
        // CRITICAL: INITIAL_SESSION with null session does NOT mean logged out!
        // On Chromium mobile, this can fire BEFORE IndexedDB is hydrated.
        // 
        // Only trust INITIAL_SESSION if:
        // 1. It has a user (definitive login)
        // 2. OR we already received another auth event (hasReceivedAuthEvent)
        // 3. OR user explicitly logged out (wasUserLoggedOut)
        
        if (session?.user) {
          // Has user - definitively AUTHENTICATED
          hasReceivedAuthEvent.current = true;
          const user = await authService.getCurrentUser();
          if (user && mounted) {
            logger.debug('Auth: INITIAL_SESSION with user - authenticated');
            setState(prev => ({ ...prev, user, loading: false, error: null }));
            setIsSessionReady(true);
          }
        } else if (hasReceivedAuthEvent.current) {
          // Already received a definitive event, trust this null
          logger.debug('Auth: INITIAL_SESSION null, but already have auth event - unauthenticated');
          if (mounted) {
            setIsSessionReady(true);
          }
        } else if (wasUserLoggedOut()) {
          // Explicit logout marker - trust this null
          hasReceivedAuthEvent.current = true;
          logger.debug('Auth: INITIAL_SESSION null with logout marker - unauthenticated');
          if (mounted) {
            setIsSessionReady(true);
          }
        } else {
          // CHROMIUM FIX: INITIAL_SESSION with null but no other confirmation
          // This could be premature - IndexedDB might not be ready
          // 
          // Strategy: Do a second getUser() call after a brief moment
          // If IndexedDB was just slow, it should be ready now
          // This is NOT a timing hack - it's a second verification attempt
          logger.debug('Auth: INITIAL_SESSION null, no confirmation - doing verification check');
          
          // CRITICAL: Add timeout to prevent infinite hydration wait
          const MAX_HYDRATION_WAIT = 5000; // 5 seconds max wait
          
          // Second verification after IndexedDB should be ready
          const verifyAuth = async () => {
            if (!mounted || hasReceivedAuthEvent.current) return;
            
            // Create timeout promise
            const timeoutPromise = new Promise<{ timedOut: true }>((resolve) =>
              setTimeout(() => resolve({ timedOut: true }), MAX_HYDRATION_WAIT)
            );
            
            try {
              const authPromise = authService.getSupabaseClient().auth.getUser();
              
              // Race between auth check and timeout
              const result = await Promise.race([
                authPromise.then((res: { data: { user: any }; error: any }) => ({ ...res, timedOut: false as const })),
                timeoutPromise
              ]);
              
              if (!mounted) return;
              
              // Handle timeout case
              if ('timedOut' in result && result.timedOut) {
                logger.warn('Auth: Hydration timeout reached - finalizing as unauthenticated');
                hasReceivedAuthEvent.current = true;
                setIsSessionReady(true);
                return;
              }
              
              const { data: { user: verifiedUser } } = result as { data: { user: any } };
              
              if (verifiedUser) {
                // User found on second check - IndexedDB was slow
                logger.debug('Auth: Verification found user - authenticated');
                hasReceivedAuthEvent.current = true;
                const fullUser = await authService.getCurrentUser();
                if (fullUser && mounted) {
                  setState(prev => ({ ...prev, user: fullUser, loading: false, error: null }));
                }
                setIsSessionReady(true);
              } else {
                // Still no user after verification - definitively unauthenticated
                logger.debug('Auth: Verification confirmed no user - unauthenticated');
                hasReceivedAuthEvent.current = true;
                setIsSessionReady(true);
              }
            } catch (e) {
              // On error, finalize as unauthenticated
              logger.debug('Auth: Verification error - finalizing as unauthenticated');
              if (mounted) {
                hasReceivedAuthEvent.current = true;
                setIsSessionReady(true);
              }
            }
          };
          
          // Run verification - this gives IndexedDB time to hydrate
          verifyAuth();
        }
      }
    });

    // Listen for logout broadcasts from other tabs
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channel = new BroadcastChannel('auth-sync');
      channel.addEventListener('message', (event) => {
        if (event.data.type === 'LOGOUT' && mounted) {
          hasReceivedAuthEvent.current = true;
          setState(prev => ({ ...prev, user: null, loading: false }));
          setIsSessionReady(true);
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
    isSessionReady,
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