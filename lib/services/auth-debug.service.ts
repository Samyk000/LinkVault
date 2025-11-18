/**
 * @file lib/services/auth-debug.service.ts
 * @description Enhanced authentication debugging service for session management analysis
 * @created 2025-11-15
 */

import { debugLogger } from './debug-logger.service';
import { logger } from '@/lib/utils/logger';

interface AuthDebugSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  strategiesAttempted: string[];
  finalStrategy?: string;
  success: boolean;
  totalDuration: number;
  retryCount: number;
  browserInfo: {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    supportsPersistentStorage: boolean;
    hasReliableStorage: boolean;
  };
}

interface SessionRecoveryAttempt {
  strategy: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  error?: string;
  retryCount: number;
}

class AuthDebugService {
  private currentSession: AuthDebugSession | null = null;
  private recoveryAttempts: SessionRecoveryAttempt[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
  }

  /**
   * Start a new authentication debugging session
   */
  startAuthSession(browserInfo: any): void {
    if (!this.isEnabled) return;

    const sessionId = debugLogger.debugInfo().sessionId;
    const startTime = Date.now();

    this.currentSession = {
      sessionId,
      startTime,
      endTime: undefined,
      strategiesAttempted: [],
      finalStrategy: undefined,
      success: false,
      totalDuration: 0,
      retryCount: 0,
      browserInfo: {
        isMobile: browserInfo.isMobile || false,
        isIOS: browserInfo.isIOS || false,
        isAndroid: browserInfo.isAndroid || false,
        isSafari: browserInfo.isSafari || false,
        supportsPersistentStorage: browserInfo.supportsPersistentStorage || false,
        hasReliableStorage: browserInfo.hasReliableStorage || false,
      }
    };

    debugLogger.auth({
      operation: 'auth_session_start',
      success: true,
      metadata: {
        sessionId: this.currentSession.sessionId,
        browserInfo: this.currentSession.browserInfo
      }
    });

    logger.debug('Auth debugging session started', {
      sessionId: this.currentSession.sessionId,
      browserInfo: this.currentSession.browserInfo
    });
  }

  /**
   * Log a session recovery attempt
   */
  logRecoveryAttempt(strategy: string, success: boolean, error?: string, retryCount: number = 0): void {
    if (!this.isEnabled || !this.currentSession) return;

    const attempt: SessionRecoveryAttempt = {
      strategy,
      startTime: Date.now(),
      endTime: success || error ? Date.now() : undefined,
      success,
      error,
      retryCount
    };

    this.recoveryAttempts.push(attempt);

    if (this.currentSession) {
      this.currentSession.strategiesAttempted.push(strategy);
      this.currentSession.retryCount = Math.max(this.currentSession.retryCount, retryCount);
    }

    debugLogger.auth({
      operation: `session_recovery_${strategy}`,
      success,
      duration: attempt.endTime ? attempt.endTime - attempt.startTime : 0,
      strategy,
      retryCount,
      error,
      metadata: {
        sessionId: this.currentSession.sessionId,
        attemptIndex: this.recoveryAttempts.length
      }
    });

    logger.debug(`Session recovery attempt: ${strategy}`, {
      success,
      retryCount,
      error,
      sessionId: this.currentSession.sessionId
    });

    // If this is a final result (success or error), log completion
    if (success || error) {
      const duration = attempt.endTime! - attempt.startTime;
      debugLogger.auth({
        operation: `session_recovery_${strategy}_complete`,
        success,
        duration,
        strategy,
        retryCount,
        error,
        metadata: {
          sessionId: this.currentSession.sessionId,
          attemptIndex: this.recoveryAttempts.length,
          finalResult: true
        }
      });
    }
  }

  /**
   * Mark a recovery strategy as successful
   */
  markRecoverySuccess(strategy: string): void {
    if (!this.isEnabled || !this.currentSession) return;

    this.currentSession.finalStrategy = strategy;
    this.currentSession.success = true;
    this.currentSession.endTime = Date.now();
    this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;

    debugLogger.auth({
      operation: 'session_recovery_success',
      success: true,
      duration: this.currentSession.totalDuration,
      strategy,
      retryCount: this.currentSession.retryCount,
      metadata: {
        sessionId: this.currentSession.sessionId,
        strategiesAttempted: this.currentSession.strategiesAttempted,
        browserInfo: this.currentSession.browserInfo
      }
    });

    logger.info('Session recovery successful', {
      strategy,
      totalDuration: this.currentSession.totalDuration,
      strategiesAttempted: this.currentSession.strategiesAttempted,
      retryCount: this.currentSession.retryCount,
      browserInfo: this.currentSession.browserInfo
    });

    this.endAuthSession();
  }

  /**
   * Mark recovery as failed
   */
  markRecoveryFailed(finalError: string): void {
    if (!this.isEnabled || !this.currentSession) return;

    this.currentSession.success = false;
    this.currentSession.endTime = Date.now();
    this.currentSession.totalDuration = this.currentSession.endTime - this.currentSession.startTime;

    debugLogger.auth({
      operation: 'session_recovery_failed',
      success: false,
      duration: this.currentSession.totalDuration,
      error: finalError,
      metadata: {
        sessionId: this.currentSession.sessionId,
        strategiesAttempted: this.currentSession.strategiesAttempted,
        finalError,
        browserInfo: this.currentSession.browserInfo
      }
    });

    logger.error('Session recovery failed', {
      totalDuration: this.currentSession.totalDuration,
      strategiesAttempted: this.currentSession.strategiesAttempted,
      finalError,
      browserInfo: this.currentSession.browserInfo
    });

    this.endAuthSession();
  }

  /**
   * End the current authentication session
   */
  private endAuthSession(): void {
    if (!this.isEnabled || !this.currentSession) return;

    debugLogger.auth({
      operation: 'auth_session_end',
      success: this.currentSession.success,
      duration: this.currentSession.totalDuration,
      metadata: {
        sessionId: this.currentSession.sessionId,
        finalStrategy: this.currentSession.finalStrategy,
        strategiesAttempted: this.currentSession.strategiesAttempted,
        browserInfo: this.currentSession.browserInfo
      }
    });

    // Store session data for analysis
    this.storeSessionData();

    // Reset for next session
    this.currentSession = null;
    this.recoveryAttempts = [];
  }

  /**
   * Log authentication state changes
   */
  logAuthStateChange(event: string, session: any, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    debugLogger.auth({
      operation: `auth_state_change_${event}`,
      success: ['SIGNED_IN', 'TOKEN_REFRESHED'].includes(event),
      metadata: {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        sessionId: this.currentSession?.sessionId,
        ...metadata
      }
    });

    logger.debug(`Auth state change: ${event}`, { 
      event, 
      hasSession: !!session,
      userId: session?.user?.id,
      sessionId: this.currentSession?.sessionId
    });
  }

  /**
   * Log middleware authentication checks
   */
  logMiddlewareAuthCheck(operation: string, success: boolean, duration: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    debugLogger.auth({
      operation: `middleware_${operation}`,
      success,
      duration,
      metadata: {
        sessionId: this.currentSession?.sessionId,
        ...metadata
      }
    });

    logger.debug(`Middleware auth check: ${operation}`, { 
      success, 
      duration,
      sessionId: this.currentSession?.sessionId
    });
  }

  /**
   * Log timeout events
   */
  logTimeout(operation: string, timeoutDuration: number, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    debugLogger.auth({
      operation: `auth_timeout_${operation}`,
      success: false,
      error: `Authentication timeout after ${timeoutDuration}ms`,
      metadata: {
        timeoutDuration,
        sessionId: this.currentSession?.sessionId,
        ...metadata
      }
    });

    logger.warn(`Authentication timeout: ${operation}`, {
      timeoutDuration,
      sessionId: this.currentSession?.sessionId
    });
  }

  /**
   * Store session data for analysis
   */
  private storeSessionData(): void {
    if (!this.currentSession) return;

    // Store in localStorage for persistence (development only)
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        const storedData = JSON.parse(localStorage.getItem('auth_debug_sessions') || '[]');
        storedData.push(this.currentSession);
        
        // Keep only last 50 sessions
        if (storedData.length > 50) {
          storedData.splice(0, storedData.length - 50);
        }
        
        localStorage.setItem('auth_debug_sessions', JSON.stringify(storedData));
      } catch (error) {
        logger.error('Failed to store auth debug session data:', error);
      }
    }
  }

  /**
   * Get authentication performance summary
   */
  getAuthPerformanceSummary(): {
    totalSessions: number;
    successRate: number;
    averageRecoveryTime: number;
    mostSuccessfulStrategy: string;
    strategyPerformance: Record<string, {
      attempts: number;
      successes: number;
      averageDuration: number;
    }>;
    browserPerformance: Record<string, {
      sessions: number;
      successRate: number;
      averageDuration: number;
    }>;
  } {
    if (process.env.NODE_ENV !== 'development' || typeof localStorage === 'undefined') {
      return {
        totalSessions: 0,
        successRate: 0,
        averageRecoveryTime: 0,
        mostSuccessfulStrategy: '',
        strategyPerformance: {},
        browserPerformance: {}
      };
    }

    try {
      const storedData = JSON.parse(localStorage.getItem('auth_debug_sessions') || '[]');
      
      if (storedData.length === 0) {
        return {
          totalSessions: 0,
          successRate: 0,
          averageRecoveryTime: 0,
          mostSuccessfulStrategy: '',
          strategyPerformance: {},
          browserPerformance: {}
        };
      }

      const successfulSessions = storedData.filter((session: AuthDebugSession) => session.success);
      const successRate = (successfulSessions.length / storedData.length) * 100;

      const averageRecoveryTime = storedData.reduce((sum: number, session: AuthDebugSession) => 
        sum + (session.totalDuration || 0), 0) / storedData.length;

      // Strategy performance analysis
      const strategyPerformance: Record<string, any> = {};
      storedData.forEach((session: AuthDebugSession) => {
        session.strategiesAttempted.forEach(strategy => {
          if (!strategyPerformance[strategy]) {
            strategyPerformance[strategy] = {
              attempts: 0,
              successes: 0,
              durations: []
            };
          }
          strategyPerformance[strategy].attempts++;
          if (session.success && session.finalStrategy === strategy) {
            strategyPerformance[strategy].successes++;
          }
          if (session.finalStrategy === strategy) {
            strategyPerformance[strategy].durations.push(session.totalDuration);
          }
        });
      });

      // Calculate strategy averages
      Object.keys(strategyPerformance).forEach(strategy => {
        const data = strategyPerformance[strategy];
        data.averageDuration = data.durations.length > 0 
          ? data.durations.reduce((sum: number, dur: number) => sum + dur, 0) / data.durations.length 
          : 0;
        delete data.durations; // Remove raw data
      });

      // Find most successful strategy
      let mostSuccessfulStrategy = '';
      let highestSuccessRate = 0;
      Object.entries(strategyPerformance).forEach(([strategy, data]: [string, any]) => {
        const strategySuccessRate = (data.successes / data.attempts) * 100;
        if (strategySuccessRate > highestSuccessRate) {
          highestSuccessRate = strategySuccessRate;
          mostSuccessfulStrategy = strategy;
        }
      });

      // Browser performance analysis
      const browserPerformance: Record<string, any> = {};
      storedData.forEach((session: AuthDebugSession) => {
        const browserKey = `${session.browserInfo.isMobile ? 'mobile' : 'desktop'}_${session.browserInfo.isIOS ? 'ios' : session.browserInfo.isAndroid ? 'android' : 'other'}`;
        
        if (!browserPerformance[browserKey]) {
          browserPerformance[browserKey] = {
            sessions: 0,
            successes: 0,
            durations: []
          };
        }
        
        browserPerformance[browserKey].sessions++;
        if (session.success) {
          browserPerformance[browserKey].successes++;
        }
        browserPerformance[browserKey].durations.push(session.totalDuration);
      });

      // Calculate browser averages
      Object.keys(browserPerformance).forEach(browserKey => {
        const data = browserPerformance[browserKey];
        data.successRate = (data.successes / data.sessions) * 100;
        data.averageDuration = data.durations.length > 0 
          ? data.durations.reduce((sum: number, dur: number) => sum + dur, 0) / data.durations.length 
          : 0;
        delete data.durations; // Remove raw data
      });

      return {
        totalSessions: storedData.length,
        successRate,
        averageRecoveryTime,
        mostSuccessfulStrategy,
        strategyPerformance,
        browserPerformance
      };
    } catch (error) {
      logger.error('Failed to analyze auth performance data:', error);
      return {
        totalSessions: 0,
        successRate: 0,
        averageRecoveryTime: 0,
        mostSuccessfulStrategy: '',
        strategyPerformance: {},
        browserPerformance: {}
      };
    }
  }

  /**
   * Clear stored debug data
   */
  clearDebugData(): void {
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('auth_debug_sessions');
        logger.info('Auth debug data cleared');
      } catch (error) {
        logger.error('Failed to clear auth debug data:', error);
      }
    }
  }

  /**
   * Export debug data
   */
  exportDebugData(): string {
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        const storedData = localStorage.getItem('auth_debug_sessions');
        return storedData || '[]';
      } catch (error) {
        logger.error('Failed to export auth debug data:', error);
        return '[]';
      }
    }
    return '[]';
  }

  /**
   * Enable/disable debugging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled) {
      logger.info('Auth debugging enabled');
    } else {
      logger.info('Auth debugging disabled');
    }
  }
}

// Export singleton instance
export const authDebugService = new AuthDebugService();

// Export convenience functions
export const authDebug = {
  startSession: (browserInfo: any) => authDebugService.startAuthSession(browserInfo),
  logRecovery: (strategy: string, success: boolean, error?: string, retryCount?: number) => 
    authDebugService.logRecoveryAttempt(strategy, success, error, retryCount),
  markSuccess: (strategy: string) => authDebugService.markRecoverySuccess(strategy),
  markFailed: (error: string) => authDebugService.markRecoveryFailed(error),
  logStateChange: (event: string, session: any, metadata?: Record<string, any>) => 
    authDebugService.logAuthStateChange(event, session, metadata),
  logMiddleware: (operation: string, success: boolean, duration: number, metadata?: Record<string, any>) => 
    authDebugService.logMiddlewareAuthCheck(operation, success, duration, metadata),
  logTimeout: (operation: string, timeoutDuration: number, metadata?: Record<string, any>) => 
    authDebugService.logTimeout(operation, timeoutDuration, metadata),
  getSummary: () => authDebugService.getAuthPerformanceSummary(),
  clearData: () => authDebugService.clearDebugData(),
  exportData: () => authDebugService.exportDebugData(),
  enable: () => authDebugService.setEnabled(true),
  disable: () => authDebugService.setEnabled(false)
};