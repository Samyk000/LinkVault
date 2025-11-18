/**
 * @file lib/services/database-debug.service.ts
 * @description Enhanced database debugging service for query performance analysis
 * @created 2025-11-15
 */

import { debugLogger } from './debug-logger.service';
import { logger } from '@/lib/utils/logger';

interface QueryDebugSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  queries: QueryDebugInfo[];
  cacheHits: number;
  cacheMisses: number;
  timeouts: number;
  errors: number;
  totalQueryTime: number;
  averageQueryTime: number;
}

interface QueryDebugInfo {
  queryId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  cacheHit: boolean;
  cacheAge?: number;
  dataSize?: number;
  queryType?: string;
  error?: string;
  retryCount: number;
  memoryUsage?: {
    before: number;
    after: number;
  };
  metadata?: Record<string, any>;
}

class DatabaseDebugService {
  private currentSession: QueryDebugSession | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
  }

  /**
   * Start a new database debugging session
   */
  startQuerySession(): void {
    if (!this.isEnabled) return;

    this.currentSession = {
      sessionId: debugLogger.debugInfo().sessionId,
      startTime: Date.now(),
      queries: [],
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
      errors: 0,
      totalQueryTime: 0,
      averageQueryTime: 0
    };

    debugLogger.database({
      operation: 'db_session_start',
      success: true,
      metadata: {
        sessionId: this.currentSession.sessionId
      }
    });

    logger.debug('Database debugging session started', { 
      sessionId: this.currentSession.sessionId 
    });
  }

  /**
   * Log a database query
   */
  logQuery(metric: {
    operation: string;
    queryType?: string;
    cacheHit: boolean;
    cacheAge?: number;
    dataSize?: number;
    retryCount?: number;
    metadata?: Record<string, any>;
  }): string {
    if (!this.isEnabled || !this.currentSession) {
      return '';
    }

    const queryId = this.generateQueryId();
    const startTime = Date.now();

    const queryInfo: QueryDebugInfo = {
      queryId,
      operation: metric.operation,
      startTime,
      success: false, // Will be updated when query completes
      cacheHit: metric.cacheHit,
      cacheAge: metric.cacheAge,
      dataSize: metric.dataSize,
      queryType: metric.queryType,
      retryCount: metric.retryCount || 0,
      metadata: metric.metadata
    };

    this.currentSession.queries.push(queryInfo);

    // Update cache statistics
    if (metric.cacheHit) {
      this.currentSession.cacheHits++;
    } else {
      this.currentSession.cacheMisses++;
    }

    debugLogger.database({
      operation: `query_${metric.operation}`,
      success: false,
      duration: 0,
      cacheHit: metric.cacheHit,
      dataSize: metric.dataSize,
      queryType: metric.queryType,
      metadata: {
        sessionId: this.currentSession.sessionId,
        queryId,
        cacheAge: metric.cacheAge,
        retryCount: metric.retryCount || 0,
        ...metric.metadata
      }
    });

    logger.debug(`Database query started: ${metric.operation}`, {
      queryId,
      cacheHit: metric.cacheHit,
      queryType: metric.queryType,
      dataSize: metric.dataSize,
      sessionId: this.currentSession.sessionId
    });

    return queryId;
  }

  /**
   * Mark a query as completed
   */
  markQueryComplete(queryId: string, success: boolean, error?: string): void {
    if (!this.isEnabled || !this.currentSession) return;

    const query = this.currentSession.queries.find(q => q.queryId === queryId);
    if (!query) return;

    const endTime = Date.now();
    const duration = endTime - query.startTime;

    query.endTime = endTime;
    query.duration = duration;
    query.success = success;
    query.error = error;

    // Update session statistics
    this.currentSession.totalQueryTime += duration;
    this.currentSession.averageQueryTime = this.currentSession.totalQueryTime / this.currentSession.queries.length;

    if (!success) {
      this.currentSession.errors++;
      if (error && error.includes('timeout')) {
        this.currentSession.timeouts++;
      }
    }

    // Get memory usage if available
    let memoryUsage = null;
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize
      };
      query.memoryUsage = {
        before: query.memoryUsage?.before || memoryUsage.usedJSHeapSize,
        after: memoryUsage.usedJSHeapSize
      };
    }

    debugLogger.database({
      operation: `query_${query.operation}_complete`,
      success,
      duration,
      cacheHit: query.cacheHit,
      dataSize: query.dataSize,
      queryType: query.queryType,
      error,
      metadata: {
        sessionId: this.currentSession.sessionId,
        queryId,
        retryCount: query.retryCount,
        memoryUsage,
        queryIndex: this.currentSession.queries.findIndex(q => q.queryId === queryId)
      }
    });

    logger.debug(`Database query completed: ${query.operation}`, {
      queryId,
      success,
      duration,
      cacheHit: query.cacheHit,
      dataSize: query.dataSize,
      error,
      sessionId: this.currentSession.sessionId
    });
  }

  /**
   * Log cache operations
   */
  logCacheOperation(operation: string, key: string, hit: boolean, metadata?: Record<string, any>): void {
    if (!this.isEnabled || !this.currentSession) return;

    debugLogger.database({
      operation: `cache_${operation}`,
      success: true,
      cacheHit: hit,
      metadata: {
        sessionId: this.currentSession.sessionId,
        cacheKey: key,
        ...metadata
      }
    });

    logger.debug(`Cache operation: ${operation}`, {
      key,
      hit,
      sessionId: this.currentSession.sessionId
    });
  }

  /**
   * Log data loading operations
   */
  logDataLoading(metric: {
    operation: string;
    totalLinks: number;
    totalFolders: number;
    totalSettings: number;
    loadingStrategy: string;
    parallelOperations: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.isEnabled || !this.currentSession) return;

    const totalItems = metric.totalLinks + metric.totalFolders + metric.totalSettings;

    debugLogger.database({
      operation: `data_loading_${metric.operation}`,
      success: true,
      duration: 0, // Will be calculated by the caller
      dataSize: totalItems,
      metadata: {
        sessionId: this.currentSession.sessionId,
        breakdown: {
          links: metric.totalLinks,
          folders: metric.totalFolders,
          settings: metric.totalSettings
        },
        loadingStrategy: metric.loadingStrategy,
        parallelOperations: metric.parallelOperations,
        ...metric.metadata
      }
    });

    logger.debug(`Data loading: ${metric.operation}`, {
      totalItems,
      breakdown: {
        links: metric.totalLinks,
        folders: metric.totalFolders,
        settings: metric.totalSettings
      },
      loadingStrategy: metric.loadingStrategy,
      sessionId: this.currentSession.sessionId
    });
  }

  /**
   * Log pagination performance
   */
  logPagination(metric: {
    operation: string;
    limit: number;
    offset: number;
    actualReturned: number;
    hasMore: boolean;
    duration: number;
    metadata?: Record<string, any>;
  }): void {
    if (!this.isEnabled || !this.currentSession) return;

    const efficiency = metric.actualReturned / metric.limit;

    debugLogger.database({
      operation: `pagination_${metric.operation}`,
      success: true,
      duration: metric.duration,
      dataSize: metric.actualReturned,
      metadata: {
        sessionId: this.currentSession.sessionId,
        pagination: {
          limit: metric.limit,
          offset: metric.offset,
          returned: metric.actualReturned,
          hasMore: metric.hasMore,
          efficiency
        },
        ...metric.metadata
      }
    });

    logger.debug(`Pagination: ${metric.operation}`, {
      efficiency: `${(efficiency * 100).toFixed(1)}%`,
      limit: metric.limit,
      returned: metric.actualReturned,
      hasMore: metric.hasMore,
      sessionId: this.currentSession.sessionId
    });
  }

  /**
   * End the current database debugging session
   */
  endQuerySession(): void {
    if (!this.isEnabled || !this.currentSession) return;

    this.currentSession.endTime = Date.now();
    const sessionDuration = this.currentSession.endTime - this.currentSession.startTime;

    debugLogger.database({
      operation: 'db_session_end',
      success: this.currentSession.errors === 0,
      duration: sessionDuration,
      metadata: {
        sessionId: this.currentSession.sessionId,
        summary: {
          totalQueries: this.currentSession.queries.length,
          cacheHits: this.currentSession.cacheHits,
          cacheMisses: this.currentSession.cacheMisses,
          timeouts: this.currentSession.timeouts,
          errors: this.currentSession.errors,
          totalQueryTime: this.currentSession.totalQueryTime,
          averageQueryTime: this.currentSession.averageQueryTime,
          cacheHitRate: this.currentSession.cacheMisses + this.currentSession.cacheHits > 0 
            ? (this.currentSession.cacheHits / (this.currentSession.cacheMisses + this.currentSession.cacheHits)) * 100 
            : 0
        }
      }
    });

    logger.info('Database debugging session ended', {
      sessionDuration,
      summary: {
        totalQueries: this.currentSession.queries.length,
        cacheHitRate: this.currentSession.cacheMisses + this.currentSession.cacheHits > 0 
          ? (this.currentSession.cacheHits / (this.currentSession.cacheMisses + this.currentSession.cacheHits)) * 100 
          : 0,
        timeouts: this.currentSession.timeouts,
        errors: this.currentSession.errors,
        averageQueryTime: this.currentSession.averageQueryTime
      },
      sessionId: this.currentSession.sessionId
    });

    // Store session data for analysis
    this.storeSessionData();
    this.currentSession = null;
  }

  /**
   * Get database performance summary
   */
  getDatabasePerformanceSummary(): {
    totalSessions: number;
    averageQueryTime: number;
    averageSessionTime: number;
    cacheHitRate: number;
    errorRate: number;
    timeoutRate: number;
    operationPerformance: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
      cacheHitRate: number;
    }>;
    queryTypePerformance: Record<string, {
      count: number;
      averageTime: number;
      successRate: number;
    }>;
  } {
    if (process.env.NODE_ENV !== 'development' || typeof localStorage === 'undefined') {
      return {
        totalSessions: 0,
        averageQueryTime: 0,
        averageSessionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        timeoutRate: 0,
        operationPerformance: {},
        queryTypePerformance: {}
      };
    }

    try {
      const storedData = JSON.parse(localStorage.getItem('database_debug_sessions') || '[]');
      
      if (storedData.length === 0) {
        return {
          totalSessions: 0,
          averageQueryTime: 0,
          averageSessionTime: 0,
          cacheHitRate: 0,
          errorRate: 0,
          timeoutRate: 0,
          operationPerformance: {},
          queryTypePerformance: {}
        };
      }

      const totalQueries = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.queries.length, 0);
      const totalQueryTime = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.totalQueryTime, 0);
      const totalSessionTime = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + (session.endTime || session.startTime) - session.startTime, 0);

      const totalCacheHits = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.cacheHits, 0);
      const totalCacheMisses = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.cacheMisses, 0);
      const totalErrors = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.errors, 0);
      const totalTimeouts = storedData.reduce((sum: number, session: QueryDebugSession) => 
        sum + session.timeouts, 0);

      const cacheHitRate = totalCacheHits + totalCacheMisses > 0 
        ? (totalCacheHits / (totalCacheHits + totalCacheMisses)) * 100 
        : 0;
      const errorRate = totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0;
      const timeoutRate = totalQueries > 0 ? (totalTimeouts / totalQueries) * 100 : 0;

      // Operation performance analysis
      const operationPerformance: Record<string, any> = {};
      storedData.forEach((session: QueryDebugSession) => {
        session.queries.forEach(query => {
          if (!operationPerformance[query.operation]) {
            operationPerformance[query.operation] = {
              count: 0,
              totalTime: 0,
              successes: 0,
              cacheHits: 0
            };
          }
          operationPerformance[query.operation].count++;
          if (query.duration) {
            operationPerformance[query.operation].totalTime += query.duration;
          }
          if (query.success) {
            operationPerformance[query.operation].successes++;
          }
          if (query.cacheHit) {
            operationPerformance[query.operation].cacheHits++;
          }
        });
      });

      // Calculate operation averages
      Object.keys(operationPerformance).forEach(operation => {
        const data = operationPerformance[operation];
        data.averageTime = data.count > 0 ? data.totalTime / data.count : 0;
        data.successRate = data.count > 0 ? (data.successes / data.count) * 100 : 0;
        data.cacheHitRate = data.count > 0 ? (data.cacheHits / data.count) * 100 : 0;
        delete data.totalTime;
        delete data.successes;
        delete data.cacheHits;
      });

      // Query type performance analysis
      const queryTypePerformance: Record<string, any> = {};
      storedData.forEach((session: QueryDebugSession) => {
        session.queries.forEach(query => {
          const queryType = query.queryType || 'unknown';
          if (!queryTypePerformance[queryType]) {
            queryTypePerformance[queryType] = {
              count: 0,
              totalTime: 0,
              successes: 0
            };
          }
          queryTypePerformance[queryType].count++;
          if (query.duration) {
            queryTypePerformance[queryType].totalTime += query.duration;
          }
          if (query.success) {
            queryTypePerformance[queryType].successes++;
          }
        });
      });

      // Calculate query type averages
      Object.keys(queryTypePerformance).forEach(queryType => {
        const data = queryTypePerformance[queryType];
        data.averageTime = data.count > 0 ? data.totalTime / data.count : 0;
        data.successRate = data.count > 0 ? (data.successes / data.count) * 100 : 0;
        delete data.totalTime;
        delete data.successes;
      });

      return {
        totalSessions: storedData.length,
        averageQueryTime: totalQueries > 0 ? totalQueryTime / totalQueries : 0,
        averageSessionTime: storedData.length > 0 ? totalSessionTime / storedData.length : 0,
        cacheHitRate,
        errorRate,
        timeoutRate,
        operationPerformance,
        queryTypePerformance
      };
    } catch (error) {
      logger.error('Failed to analyze database performance data:', error);
      return {
        totalSessions: 0,
        averageQueryTime: 0,
        averageSessionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        timeoutRate: 0,
        operationPerformance: {},
        queryTypePerformance: {}
      };
    }
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store session data for analysis
   */
  private storeSessionData(): void {
    if (!this.currentSession) return;

    // Store in localStorage for persistence (development only)
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        const storedData = JSON.parse(localStorage.getItem('database_debug_sessions') || '[]');
        storedData.push(this.currentSession);
        
        // Keep only last 20 sessions
        if (storedData.length > 20) {
          storedData.splice(0, storedData.length - 20);
        }
        
        localStorage.setItem('database_debug_sessions', JSON.stringify(storedData));
      } catch (error) {
        logger.error('Failed to store database debug session data:', error);
      }
    }
  }

  /**
   * Clear stored debug data
   */
  clearDebugData(): void {
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('database_debug_sessions');
        logger.info('Database debug data cleared');
      } catch (error) {
        logger.error('Failed to clear database debug data:', error);
      }
    }
  }

  /**
   * Export debug data
   */
  exportDebugData(): string {
    if (process.env.NODE_ENV === 'development' && typeof localStorage !== 'undefined') {
      try {
        const storedData = localStorage.getItem('database_debug_sessions');
        return storedData || '[]';
      } catch (error) {
        logger.error('Failed to export database debug data:', error);
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
      logger.info('Database debugging enabled');
    } else {
      logger.info('Database debugging disabled');
    }
  }
}

// Export singleton instance
export const databaseDebugService = new DatabaseDebugService();

// Export convenience functions
export const databaseDebug = {
  startSession: () => databaseDebugService.startQuerySession(),
  logQuery: (metric: Parameters<DatabaseDebugService['logQuery']>[0]) => 
    databaseDebugService.logQuery(metric),
  markComplete: (queryId: string, success: boolean, error?: string) => 
    databaseDebugService.markQueryComplete(queryId, success, error),
  logCache: (operation: string, key: string, hit: boolean, metadata?: Record<string, any>) => 
    databaseDebugService.logCacheOperation(operation, key, hit, metadata),
  logDataLoading: (metric: Parameters<DatabaseDebugService['logDataLoading']>[0]) => 
    databaseDebugService.logDataLoading(metric),
  logPagination: (metric: Parameters<DatabaseDebugService['logPagination']>[0]) => 
    databaseDebugService.logPagination(metric),
  endSession: () => databaseDebugService.endQuerySession(),
  getSummary: () => databaseDebugService.getDatabasePerformanceSummary(),
  clearData: () => databaseDebugService.clearDebugData(),
  exportData: () => databaseDebugService.exportDebugData(),
  enable: () => databaseDebugService.setEnabled(true),
  disable: () => databaseDebugService.setEnabled(false)
};