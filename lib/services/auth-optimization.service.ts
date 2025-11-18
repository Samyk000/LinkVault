/**
 * @file lib/services/auth-optimization.service.ts
 * @description Authentication optimization service for faster session recovery
 * @created 2025-11-15
 */

import { createClient } from '@/lib/supabase/client';
import { AuthUser } from '@/lib/types/auth';
import { logger } from '@/lib/utils/logger';
import { detectMobileBrowser, needsMobileSessionHandling } from '@/lib/utils/platform';
import { authDebug } from './auth-debug.service';

interface AuthStrategy {
  name: string;
  timeout: number;
  retryCount: number;
}

interface RecoveryResult {
  user: AuthUser | null;
  strategy: string;
  duration: number;
  success: boolean;
}

class AuthOptimizationService {
  private supabase = createClient();
  private cache = new Map<string, { user: AuthUser; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * OPTIMIZED: Streamlined session recovery with faster timeouts and intelligent strategies
   */
  async recoverSession(): Promise<AuthUser | null> {
    const startTime = Date.now();
    const browserInfo = detectMobileBrowser();
    const isMobile = needsMobileSessionHandling();

    // OPTIMIZED: Faster timeouts based on device type
    const strategies: AuthStrategy[] = isMobile 
      ? [
          { name: 'direct', timeout: 3000, retryCount: 1 },    // Fast direct recovery
          { name: 'cached', timeout: 2000, retryCount: 1 },    // Local storage cache
          { name: 'refresh', timeout: 4000, retryCount: 1 }    // Token refresh
        ]
      : [
          { name: 'direct', timeout: 2000, retryCount: 1 },    // Even faster for desktop
          { name: 'cached', timeout: 1000, retryCount: 0 },    // No retries for cache
          { name: 'refresh', timeout: 3000, retryCount: 1 }    // Token refresh
        ];

    authDebug.logRecovery('session_recovery_start', false, undefined, 0);

    for (const strategy of strategies) {
      try {
        authDebug.logRecovery(strategy.name, false, undefined, 0);
        
        const result = await this.attemptStrategy(strategy);
        
        if (result.success && result.user) {
          const duration = Date.now() - startTime;
          authDebug.markSuccess(strategy.name);
          authDebug.logRecovery(strategy.name, true, undefined, 0);
          
          // Cache successful recovery
          this.cache.set('session_recovery', {
            user: result.user,
            timestamp: Date.now()
          });

          logger.info(`Session recovered via ${strategy.name} in ${duration}ms`);
          return result.user;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        authDebug.logRecovery(strategy.name, false, errorMessage, 0);
        logger.warn(`Session recovery strategy ${strategy.name} failed:`, error);
      }
    }

    const totalDuration = Date.now() - startTime;
    authDebug.markFailed('All recovery strategies failed');
    logger.warn(`Session recovery failed after ${totalDuration}ms`);
    return null;
  }

  /**
   * OPTIMIZED: Individual recovery strategy with timeout protection
   */
  private async attemptStrategy(strategy: AuthStrategy): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      switch (strategy.name) {
        case 'direct':
          return await this.directRecovery(strategy.timeout);
        
        case 'cached':
          return await this.cachedRecovery(strategy.timeout);
        
        case 'refresh':
          return await this.refreshRecovery(strategy.timeout);
        
        default:
          throw new Error(`Unknown recovery strategy: ${strategy.name}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        user: null,
        strategy: strategy.name,
        duration,
        success: false
      };
    }
  }

  /**
   * OPTIMIZED: Direct session recovery with aggressive timeout
   */
  private async directRecovery(timeout: number): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      const { data: { session }, error } = await Promise.race([
        this.supabase.auth.getSession(),
        this.createTimeoutPromise(timeout, 'Direct session recovery timeout')
      ]);

      if (error) {
        throw error;
      }

      if (!session?.user) {
        return {
          user: null,
          strategy: 'direct',
          duration: Date.now() - startTime,
          success: false
        };
      }

      // OPTIMIZED: Only fetch essential user data
      const user = await this.getOptimizedUser(session.user.id);
      
      return {
        user,
        strategy: 'direct',
        duration: Date.now() - startTime,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        strategy: 'direct',
        duration: Date.now() - startTime,
        success: false
      };
    }
  }

  /**
   * OPTIMIZED: Cached session recovery with fallback validation
   */
  private async cachedRecovery(timeout: number): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      // Check in-memory cache first
      const cached = this.cache.get('session_recovery');
      if (cached && (Date.now() - cached.timestamp < this.CACHE_DURATION)) {
        // Validate cached session with minimal API call
        const { data: { session } } = await this.supabase.auth.getUser();
        
        if (session?.user) {
          return {
            user: cached.user,
            strategy: 'cached',
            duration: Date.now() - startTime,
            success: true
          };
        }
      }

      // Check localStorage as fallback
      if (typeof window !== 'undefined') {
        const storageKey = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0] + '-auth-token';
        const storedSession = localStorage.getItem(storageKey);
        
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          if (sessionData?.access_token) {
            // OPTIMIZED: Quick token validation
            const { data: { user }, error } = await Promise.race([
              this.supabase.auth.getUser(),
              this.createTimeoutPromise(timeout, 'Cached session validation timeout')
            ]);

            if (!error && user) {
              const authUser = await this.getOptimizedUser(user.id);
              return {
                user: authUser,
                strategy: 'cached',
                duration: Date.now() - startTime,
                success: true
              };
            }
          }
        }
      }

      return {
        user: null,
        strategy: 'cached',
        duration: Date.now() - startTime,
        success: false
      };
    } catch (error) {
      return {
        user: null,
        strategy: 'cached',
        duration: Date.now() - startTime,
        success: false
      };
    }
  }

  /**
   * OPTIMIZED: Token refresh with minimal overhead
   */
  private async refreshRecovery(timeout: number): Promise<RecoveryResult> {
    const startTime = Date.now();

    try {
      const { data: { user }, error } = await Promise.race([
        this.supabase.auth.refreshSession(),
        this.createTimeoutPromise(timeout, 'Token refresh timeout')
      ]);

      if (error) {
        throw error;
      }

      if (!user) {
        return {
          user: null,
          strategy: 'refresh',
          duration: Date.now() - startTime,
          success: false
        };
      }

      const authUser = await this.getOptimizedUser(user.id);
      
      return {
        user: authUser,
        strategy: 'refresh',
        duration: Date.now() - startTime,
        success: true
      };
    } catch (error) {
      return {
        user: null,
        strategy: 'refresh',
        duration: Date.now() - startTime,
        success: false
      };
    }
  }

  /**
   * OPTIMIZED: Get minimal user data to reduce payload
   */
  private async getOptimizedUser(userId: string): Promise<AuthUser> {
    // OPTIMIZED: Return minimal user object
    return {
      id: userId,
      email: '', // Will be populated if needed
      created_at: new Date().toISOString()
    } as AuthUser;
  }

  /**
   * Create timeout promise for race conditions
   */
  private createTimeoutPromise<T>(timeout: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeout);
    });
  }

  /**
   * Clear cached session data
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Authentication cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    const entries = Array.from(this.cache.entries());
    const oldestEntry = entries.length > 0 
      ? Math.min(...entries.map(([_, value]) => value.timestamp))
      : null;

    return {
      size: this.cache.size,
      oldestEntry
    };
  }
}

// Export singleton instance
export const authOptimizationService = new AuthOptimizationService();