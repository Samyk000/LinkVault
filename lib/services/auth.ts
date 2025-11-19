/**
 * @file lib/services/auth.ts
 * @description Enhanced authentication service with improved session management and multi-tab sync
 * @created 2025-01-01
 */

import { createClient } from '@/lib/supabase/client';
import {
  AuthUser,
  SignUpData,
  SignInData,
  AuthError,
  UserProfile,
  UserSettings
} from '@/lib/types/auth';
import { AuthError as SupabaseAuthError } from '@supabase/supabase-js';
import { logger } from '@/lib/utils/logger';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export class AuthService {
  private supabase = createClient();
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
  };
  private isSigningIn = false; // Prevent concurrent sign-in operations
  private isSigningOut = false; // Prevent concurrent sign-out operations

  // Session synchronization across tabs
  private broadcastChannel: BroadcastChannel | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeBroadcastChannel();
    this.startSessionMonitoring();
    this.initializeMobileSessionRecovery();
  }

  /**
   * Initialize mobile-specific session recovery mechanisms
   */
  private initializeMobileSessionRecovery(): void {
    if (typeof window === 'undefined') return;

    // Mobile browsers may need session recovery on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible again, check if session needs recovery
        this.checkMobileSessionRecovery();
      }
    });

    // Mobile browsers may need session recovery on focus
    window.addEventListener('focus', () => {
      this.checkMobileSessionRecovery();
    });
  }

  /**
   * Check and recover mobile sessions when needed
   */
  private async checkMobileSessionRecovery(): Promise<void> {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) return;

      // Only attempt recovery if we don't have a current session
      const { data: { session } } = await this.supabase.auth.getSession();
      if (session) return; // Already have a session

      // Try to recover from storage
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      if (!projectRef) return;

      const storageKey = `sb-${projectRef}-auth-token`;

      // Try localStorage first
      try {
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          if (sessionData?.access_token && sessionData?.refresh_token) {
            const { error } = await this.supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token
            });

            if (!error) {
              logger.debug('Mobile session recovered on page focus');
            }
          }
        }
      } catch (error) {
        logger.warn('Mobile session recovery failed:', error);
      }
    } catch (error) {
      logger.error('Mobile session recovery check failed:', error);
    }
  }

  /**
   * Get access to the Supabase client for internal use
   * @returns Supabase client instance
   */
  getSupabaseClient() {
    return this.supabase;
  }

  /**
   * Initialize broadcast channel for cross-tab communication
   */
  private initializeBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('auth-sync');
      this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
    }
  }

  /**
   * Handle broadcast messages from other tabs
   * @param {MessageEvent} event - Broadcast message event
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    const { type, payload } = event.data;

    switch (type) {
      case 'AUTH_STATE_CHANGED':
        // Sync auth state across tabs without triggering infinite loops
        if (payload.user) {
          this.notifyAuthStateChange(payload.user, false);
        } else {
          this.notifyAuthStateChange(null, false);
        }
        break;
      case 'SESSION_EXPIRED':
        // Handle session expiration across tabs
        this.handleSessionExpiration();
        break;
    }
  }

  /**
   * Broadcast auth state changes to other tabs
   * @param {string} type - Message type
   * @param {any} payload - Message payload
   */
  private broadcastAuthChange(type: string, payload: any): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type, payload });
    }
  }

  /**
   * Start session monitoring for automatic refresh
   */
  private startSessionMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
          logger.error('Session check error:', error);
          return;
        }

        if (session) {
          // Check if session is about to expire (within 5 minutes)
          const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          if (expiresAt - now < fiveMinutes) {
            await this.refreshSession();
          }
        }
      } catch (error) {
        logger.error('Session monitoring error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Refresh the current session
   */
  private async refreshSession(): Promise<void> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        logger.error('Session refresh error:', error);
        this.handleSessionExpiration();
        return;
      }

      if (data.session) {
        logger.debug('Session refreshed successfully');
      }
    } catch (error) {
      logger.error('Session refresh failed:', error);
      this.handleSessionExpiration();
    }
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpiration(): void {
    this.broadcastAuthChange('SESSION_EXPIRED', {});
    // Clear any cached data or redirect to login
    if (typeof window !== 'undefined') {
      window.location.replace('/login?expired=true');
    }
  }

  /**
   * Exponential backoff retry mechanism
   * @param {Function} operation - Operation to retry
   * @param {number} attempt - Current attempt number
   * @returns {Promise<T>} Operation result
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryConfig.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, attempt),
        this.retryConfig.maxDelay
      );

      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryWithBackoff(operation, attempt + 1);
    }
  }

  /**
   * Sign up a new user with email and password
   * @param {SignUpData} data - User signup data
   * @returns {Promise<{user: AuthUser | null, error: AuthError | null}>}
   * @throws {Error} When signup fails
   */
  async signUp(data: SignUpData): Promise<{
    user: AuthUser | null;
    error: AuthError | null;
  }> {
    try {
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName || data.email.split('@')[0],
          },
        },
      });

      if (authError) {
        return {
          user: null,
          error: this.formatAuthError(authError),
        };
      }

      if (!authData.user) {
        return {
          user: null,
          error: { message: 'Failed to create user account' },
        };
      }

      // OPTIMIZED: Fetch profile and settings in parallel
      const [profile, settings] = await Promise.all([
        this.getUserProfile(authData.user.id),
        this.getUserSettings(authData.user.id)
      ]);

      const user: AuthUser = {
        ...authData.user,
        profile: profile || undefined,
        settings: settings || undefined,
      };

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    }
  }

  /**
   * Sign in an existing user with email and password
   * Includes protection against concurrent sign-in operations
   * @param {SignInData} data - User signin data
   * @returns {Promise<{user: AuthUser | null, error: AuthError | null}>}
   * @throws {Error} When signin fails
   */
  async signIn(data: SignInData): Promise<{
    user: AuthUser | null;
    error: AuthError | null;
  }> {
    // Prevent concurrent sign-in operations
    if (this.isSigningIn) {
      return {
        user: null,
        error: { message: 'Sign in already in progress. Please wait.' },
      };
    }

    this.isSigningIn = true;

    try {
      const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return {
          user: null,
          error: this.formatAuthError(authError),
        };
      }

      if (!authData.user) {
        return {
          user: null,
          error: { message: 'Failed to sign in' },
        };
      }

      // OPTIMIZED: Fetch profile and settings in parallel
      const [profile, settings] = await Promise.all([
        this.getUserProfile(authData.user.id),
        this.getUserSettings(authData.user.id)
      ]);

      const user: AuthUser = {
        ...authData.user,
        profile: profile || undefined,
        settings: settings || undefined,
      };

      // Broadcast auth state change to other tabs
      this.broadcastAuthChange('AUTH_STATE_CHANGED', { user });

      return { user, error: null };
    } catch (error) {
      return {
        user: null,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    } finally {
      this.isSigningIn = false;
    }
  }



  /**
    * Sign out the current user
    * CRITICAL: Instant logout with immediate session clearing and race condition fixes
    * @returns {Promise<{error: AuthError | null}>}
    */
  async signOut(): Promise<{ error: AuthError | null }> {
    // Prevent concurrent sign-out operations
    if (this.isSigningOut) {
      logger.warn('Sign out already in progress');
      return { error: null };
    }

    this.isSigningOut = true;

    try {
      // CRITICAL: Clear session monitoring immediately (synchronous)
      if (this.sessionCheckInterval) {
        clearInterval(this.sessionCheckInterval);
        this.sessionCheckInterval = null;
      }

      // CRITICAL: Broadcast logout immediately (synchronous)
      this.broadcastAuthChange('LOGOUT', { timestamp: Date.now() });

      // CRITICAL: Clear Supabase session cookies immediately
      // This prevents StoreInitializer from detecting a session
      try {
        // Clear all Supabase auth cookies with comprehensive cleanup
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            // Clear Supabase auth cookies - expanded pattern matching
            if (name.startsWith('sb-') ||
              name.includes('supabase') ||
              name.includes('auth-token') ||
              name.includes('session')) {
              // Clear with multiple domain variations for cross-domain support
              const domains = [
                window.location.hostname,
                `.${window.location.hostname}`,
                ''
              ];
              domains.forEach(domain => {
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;${domain ? `domain=${domain};` : ''}secure;samesite=lax`;
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;${domain ? `domain=${domain};` : ''}secure;samesite=strict`;
              });
            }
          });

          // Clear localStorage and sessionStorage
          try {
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.removeItem('supabase.auth.token');
            // Clear any other auth-related storage
            Object.keys(localStorage).forEach(key => {
              if (key.includes('supabase') || key.includes('auth')) {
                localStorage.removeItem(key);
              }
            });
            Object.keys(sessionStorage).forEach(key => {
              if (key.includes('supabase') || key.includes('auth')) {
                sessionStorage.removeItem(key);
              }
            });
          } catch (storageError) {
            logger.warn('Error clearing storage:', storageError);
          }
        }
      } catch (cookieError) {
        logger.warn('Error clearing cookies:', cookieError);
      }

      // Sign out from Supabase with timeout protection
      // Use Promise.race to prevent hanging
      const signOutPromise = this.supabase.auth.signOut();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SignOut timeout')), 5000)
      );

      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        logger.debug('Supabase signOut completed successfully');
      } catch (signOutError) {
        logger.warn('Supabase signOut timed out or failed (non-blocking):', signOutError);
        // Continue with logout even if Supabase signOut fails
      }

      // CRITICAL: Force redirect immediately after cleanup
      // Use replace instead of href to prevent back button issues
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }

      logger.debug('Logout initiated successfully');
      return { error: null };
    } catch (error) {
      logger.error('Error during signOut:', error);
      // Even on error, attempt redirect
      if (typeof window !== 'undefined') {
        window.location.replace('/login?logout=error');
      }
      return { error: null };
    } finally {
      // Reset flag after a short delay to allow redirect
      setTimeout(() => {
        this.isSigningOut = false;
      }, 1000);
    }
  }

  /**
   * Get the current authenticated user with mobile-specific handling
   * @returns {Promise<AuthUser | null>}
   * @throws {Error} When fetching user fails
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // For mobile browsers, try multiple strategies to get the user
      const isMobile = typeof window !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      let user = null;
      let error = null;

      if (isMobile) {
        // Mobile strategy: Try getUser first, then fallback to getSession
        const { data: { user: directUser }, error: directError } = await this.supabase.auth.getUser();

        if (directError || !directUser) {
          // Fallback: Try getSession and extract user
          const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
          if (!sessionError && session?.user) {
            user = session.user;
            logger.debug('Mobile user fetched via session fallback');
          } else {
            error = directError || sessionError;
          }
        } else {
          user = directUser;
        }
      } else {
        // Standard desktop flow
        const { data: { user: desktopUser }, error: desktopError } = await this.supabase.auth.getUser();
        user = desktopUser;
        error = desktopError;
      }

      if (error || !user) {
        return null;
      }

      // OPTIMIZED: Fetch profile and settings in parallel with mobile-specific timeout
      const timeout = isMobile ? 8000 : 5000;
      const profilePromise = this.getUserProfile(user.id);
      const settingsPromise = this.getUserSettings(user.id);

      const [profile, settings] = await Promise.race([
        Promise.all([profilePromise, settingsPromise]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Profile/settings fetch timeout')), timeout)
        )
      ]).catch(() => [null, null]);

      return {
        ...user,
        profile: profile || undefined,
        settings: settings || undefined,
      };
    } catch (error) {
      logger.error('Error fetching current user:', error);
      return null;
    }
  }

  /**
   * Reset password for a user
   * @param {string} email - User's email address
   * @returns {Promise<{error: AuthError | null}>}
   * @throws {Error} When password reset fails
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error: authError } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (authError) {
        return { error: this.formatAuthError(authError) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    }
  }

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise<{error: AuthError | null}>}
   * @throws {Error} When password update fails
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error: authError } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        return { error: this.formatAuthError(authError) };
      }

      return { error: null };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
        },
      };
    }
  }

  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Callback function to handle auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      // Pass event and session directly to callback
      // The auth context will handle user fetching
      callback(event, session);

      // Also broadcast auth state changes
      if (session?.user) {
        // OPTIMIZED: Fetch profile and settings in parallel
        const [profile, settings] = await Promise.all([
          this.getUserProfile(session.user.id),
          this.getUserSettings(session.user.id)
        ]);

        const user: AuthUser = {
          ...session.user,
          profile: profile || undefined,
          settings: settings || undefined,
        };

        this.broadcastAuthChange('AUTH_STATE_CHANGED', { user });
      } else {
        this.broadcastAuthChange('AUTH_STATE_CHANGED', { user: null });
      }
    });
  }

  /**
   * Notify auth state change (internal method for broadcast handling)
   * @param {AuthUser | null} user - User data
   * @param {boolean} broadcast - Whether to broadcast to other tabs
   */
  private notifyAuthStateChange(user: AuthUser | null, broadcast: boolean = true): void {
    // This method would be used by the auth context to handle broadcast messages
    // Implementation depends on how the auth context is structured
    if (broadcast) {
      this.broadcastAuthChange('AUTH_STATE_CHANGED', { user });
    }
  }

  /**
   * Cleanup resources when service is destroyed
   */
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  /**
   * Get user profile from database
   * @param {string} userId - User ID
   * @returns {Promise<UserProfile | null>}
   * @throws {Error} When fetching profile fails
   */
  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Get user settings from database
   * @param {string} userId - User ID
   * @returns {Promise<UserSettings | null>}
   * @throws {Error} When fetching settings fails
   */
  private async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data as UserSettings;
    } catch (error) {
      logger.error('Error fetching user settings:', error);
      return null;
    }
  }

  /**
   * Format Supabase auth errors into a consistent format
   * @param {SupabaseAuthError} error - Supabase auth error
   * @returns {AuthError} Formatted error
   */
  private formatAuthError(error: SupabaseAuthError): AuthError {
    const errorMessages: Record<string, string> = {
      'invalid_credentials': 'Invalid email or password',
      'email_not_confirmed': 'Please check your email and click the confirmation link',
      'signup_disabled': 'New registrations are currently disabled',
      'email_address_invalid': 'Please enter a valid email address',
      'password_too_short': 'Password must be at least 6 characters long',
      'user_already_registered': 'An account with this email already exists',
      'weak_password': 'Password is too weak. Please choose a stronger password',
    };

    return {
      message: errorMessages[error.message] || error.message || 'An authentication error occurred',
      code: error.message,
    };
  }
}

// Export a singleton instance
export const authService = new AuthService();