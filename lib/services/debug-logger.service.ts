/**
 * @file lib/services/debug-logger.service.ts
 * @description Comprehensive debug logging service for performance monitoring and issue diagnosis
 * @created 2025-11-15
 */

interface DebugMetric {
  id: string;
  category: 'auth' | 'database' | 'memory' | 'performance' | 'api' | 'ui';
  operation: string;
  duration?: number; // in milliseconds
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  userAgent?: string;
  sessionId: string;
}

interface MetricSummary {
  category: string;
  operation: string;
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalErrors: number;
}

interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  activeConnections: number;
  cacheStats: {
    hitRate: number;
    totalRequests: number;
    cachedItems: number;
  } | null;
}

class DebugLoggerService {
  private metrics: DebugMetric[] = [];
  private isEnabled: boolean;
  private maxStoredMetrics: number = 5000; // Limit to prevent memory bloat
  private sessionId: string;
  private activeOperations: Map<string, DebugMetric> = new Map();
  private reportingInterval: NodeJS.Timeout | null = null;
  private connectionCounter: number = 0;
  private performanceSnapshotInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
    this.sessionId = this.generateSessionId();
    
    if (this.isEnabled) {
      this.startPeriodicReporting();
      this.startPerformanceSnapshot();
      this.setupGlobalErrorHandlers();
    }
  }

  /**
   * Generate unique session ID for tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a debug metric
   */
  logMetric(metric: Omit<DebugMetric, 'id' | 'userAgent' | 'sessionId'>): void {
    if (!this.isEnabled) return;

    const fullMetric: DebugMetric = {
      id: this.generateId(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      sessionId: this.sessionId,
      ...metric
    };

    // Store the metric
    this.metrics.push(fullMetric);
    this.trimStoredMetrics();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(fullMetric);
    }

    // Track active operations
    if (!metric.success && !metric.duration) {
      this.activeOperations.set(metric.operation, fullMetric);
    } else {
      this.activeOperations.delete(metric.operation);
    }
  }

  /**
   * Start timing an operation
   */
  startOperation(category: DebugMetric['category'], operation: string, metadata?: Record<string, any>): string {
    const operationId = this.generateId();
    const startTime = Date.now();
    
    this.logMetric({
      category,
      operation,
      success: false,
      timestamp: startTime,
      metadata: {
        ...metadata,
        operationId,
        startTime
      }
    });

    return operationId;
  }

  /**
   * End timing an operation
   */
  endOperation(operationId: string, success: boolean, metadata?: Record<string, any>): void {
    const activeOp = this.activeOperations.get(operationId);
    if (!activeOp) return;

    const endTime = Date.now();
    const duration = endTime - (activeOp.metadata?.startTime || endTime);
    
    this.logMetric({
      category: activeOp.category,
      operation: activeOp.operation,
      duration,
      success,
      timestamp: endTime,
      metadata: {
        ...activeOp.metadata,
        ...metadata,
        operationId,
        duration
      }
    });
  }

  /**
   * Log authentication-specific metrics
   */
  logAuth(metric: {
    operation: string;
    success: boolean;
    duration?: number;
    strategy?: string;
    retryCount?: number;
    error?: string;
    metadata?: Record<string, any>;
  }): void {
    this.logMetric({
      category: 'auth',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      error: metric.error,
      timestamp: Date.now(),
      metadata: {
        ...metric.metadata,
        strategy: metric.strategy,
        retryCount: metric.retryCount
      }
    });
  }

  /**
   * Log database-specific metrics
   */
  logDatabase(metric: {
    operation: string;
    success: boolean;
    duration?: number;
    cacheHit?: boolean;
    dataSize?: number;
    queryType?: string;
    error?: string;
    metadata?: Record<string, any>;
  }): void {
    this.logMetric({
      category: 'database',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      error: metric.error,
      timestamp: Date.now(),
      metadata: {
        ...metric.metadata,
        cacheHit: metric.cacheHit,
        dataSize: metric.dataSize,
        queryType: metric.queryType
      }
    });
  }

  /**
   * Log memory-specific metrics
   */
  logMemory(metric: {
    operation: string;
    success: boolean;
    connectionType?: string;
    memoryUsage?: any;
    activeConnections?: number;
    metadata?: Record<string, any>;
  }): void {
    this.logMetric({
      category: 'memory',
      operation: metric.operation,
      success: metric.success,
      timestamp: Date.now(),
      metadata: {
        ...metric.metadata,
        connectionType: metric.connectionType,
        memoryUsage: metric.memoryUsage,
        activeConnections: metric.activeConnections
      }
    });
  }

  /**
   * Log API-specific metrics
   */
  logApi(metric: {
    operation: string;
    endpoint: string;
    success: boolean;
    duration?: number;
    statusCode?: number;
    error?: string;
    metadata?: Record<string, any>;
  }): void {
    this.logMetric({
      category: 'api',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      error: metric.error,
      timestamp: Date.now(),
      metadata: {
        ...metric.metadata,
        endpoint: metric.endpoint,
        statusCode: metric.statusCode
      }
    });
  }

  /**
   * Log UI-specific metrics
   */
  logUI(metric: {
    operation: string;
    success: boolean;
    duration?: number;
    component?: string;
    renderCount?: number;
    metadata?: Record<string, any>;
  }): void {
    this.logMetric({
      category: 'ui',
      operation: metric.operation,
      duration: metric.duration,
      success: metric.success,
      timestamp: Date.now(),
      metadata: {
        ...metric.metadata,
        component: metric.component,
        renderCount: metric.renderCount
      }
    });
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(metric: DebugMetric): void {
    const timestamp = new Date(metric.timestamp).toISOString();
    const duration = metric.duration ? `${metric.duration}ms` : 'pending';
    const status = metric.success ? '✅' : duration === 'pending' ? '⏳' : '❌';
    
    const message = `[${timestamp}] ${status} ${metric.category.toUpperCase()}:${metric.operation} ${duration}`;
    
    if (metric.success) {
      console.log(message, metric.metadata);
    } else if (duration === 'pending') {
      // Handle pending operations as info/warning, not errors
      const pendingMessage = metric.error || 'pending operation';
      console.warn(message, pendingMessage, metric.metadata);
    } else {
      // Handle actual errors
      const errorToLog = metric.error || 'unknown error';
      console.error(message, errorToLog, metric.metadata);
    }
  }

  /**
   * Get metrics summary by category
   */
  getMetricsSummary(category?: DebugMetric['category']): MetricSummary[] {
    const filteredMetrics = category 
      ? this.metrics.filter(m => m.category === category)
      : this.metrics;

    const summaryMap = new Map<string, DebugMetric[]>();

    filteredMetrics.forEach(metric => {
      const key = `${metric.category}:${metric.operation}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, []);
      }
      summaryMap.get(key)!.push(metric);
    });

    return Array.from(summaryMap.entries()).map(([key, metrics]) => {
      const [category, operation] = key.split(':');
      const durations = metrics.filter(m => m.duration).map(m => m.duration!);
      
      return {
        category,
        operation,
        totalOperations: metrics.length,
        successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        totalErrors: metrics.filter(m => !m.success).length
      };
    });
  }

  /**
   * Get performance snapshot
   */
  getPerformanceSnapshot(): PerformanceSnapshot {
    let memoryUsage = null;
    
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return {
      timestamp: Date.now(),
      memoryUsage,
      activeConnections: this.connectionCounter,
      cacheStats: null // Will be populated by cache manager integration
    };
  }

  /**
   * Export all metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      session: {
        id: this.sessionId,
        startTime: this.metrics[0]?.timestamp || Date.now(),
        endTime: Date.now()
      },
      metrics: this.metrics,
      summary: this.getMetricsSummary(),
      performanceSnapshot: this.getPerformanceSnapshot()
    }, null, 2);
  }

  /**
   * Clear all stored metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * Get recent metrics (last N minutes)
   */
  getRecentMetrics(minutes: number = 60): DebugMetric[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get error metrics only
   */
  getErrorMetrics(): DebugMetric[] {
    return this.metrics.filter(m => !m.success);
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    this.reportingInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        console.group('🔍 Debug Logger Report');
        console.table(this.getMetricsSummary());
        console.log('Performance Snapshot:', this.getPerformanceSnapshot());
        console.groupEnd();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Start performance snapshot collection
   */
  private startPerformanceSnapshot(): void {
    this.performanceSnapshotInterval = setInterval(() => {
      // Log performance snapshots periodically
      this.logMetric({
        category: 'performance',
        operation: 'snapshot',
        success: true,
        timestamp: Date.now(),
        metadata: this.getPerformanceSnapshot()
      });
    }, 60 * 1000); // Every minute
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    if (typeof window === 'undefined') return;

    // Log unhandled errors
    window.addEventListener('error', (event) => {
      this.logMetric({
        category: 'performance',
        operation: 'unhandled_error',
        success: false,
        error: event.message,
        timestamp: Date.now(),
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          errorType: 'javascript_error'
        }
      });
    });

    // Log unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logMetric({
        category: 'performance',
        operation: 'unhandled_promise_rejection',
        success: false,
        error: String(event.reason),
        timestamp: Date.now(),
        metadata: {
          reason: event.reason,
          errorType: 'promise_rejection'
        }
      });
    });
  }

  /**
   * Trim stored metrics to prevent memory bloat
   */
  private trimStoredMetrics(): void {
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enable or disable debugging
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled) {
      if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
        this.reportingInterval = null;
      }
      if (this.performanceSnapshotInterval) {
        clearInterval(this.performanceSnapshotInterval);
        this.performanceSnapshotInterval = null;
      }
      this.clearMetrics();
    } else {
      this.startPeriodicReporting();
      this.startPerformanceSnapshot();
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    enabled: boolean;
    sessionId: string;
    totalMetrics: number;
    activeOperations: number;
    memoryUsage: PerformanceSnapshot['memoryUsage'];
  } {
    return {
      enabled: this.isEnabled,
      sessionId: this.sessionId,
      totalMetrics: this.metrics.length,
      activeOperations: this.activeOperations.size,
      memoryUsage: this.getPerformanceSnapshot().memoryUsage
    };
  }
}

// Export singleton instance
export const debugLoggerService = new DebugLoggerService();

// Export convenience functions for easier usage
export const debugLogger = {
  // Core logging
  metric: (metric: Omit<DebugMetric, 'id' | 'userAgent' | 'sessionId'>) => debugLoggerService.logMetric(metric),
  
  // Authentication logging
  auth: (metric: Parameters<DebugLoggerService['logAuth']>[0]) => debugLoggerService.logAuth(metric),
  
  // Database logging
  database: (metric: Parameters<DebugLoggerService['logDatabase']>[0]) => debugLoggerService.logDatabase(metric),
  
  // Memory logging
  memory: (metric: Parameters<DebugLoggerService['logMemory']>[0]) => debugLoggerService.logMemory(metric),
  
  // API logging
  api: (metric: Parameters<DebugLoggerService['logApi']>[0]) => debugLoggerService.logApi(metric),
  
  // UI logging
  ui: (metric: Parameters<DebugLoggerService['logUI']>[0]) => debugLoggerService.logUI(metric),
  
  // Operation timing
  start: (category: DebugMetric['category'], operation: string, metadata?: Record<string, any>) => 
    debugLoggerService.startOperation(category, operation, metadata),
  end: (operationId: string, success: boolean, metadata?: Record<string, any>) => 
    debugLoggerService.endOperation(operationId, success, metadata),
  
  // Data export
  export: () => debugLoggerService.exportMetrics(),
  summary: (category?: DebugMetric['category']) => debugLoggerService.getMetricsSummary(category),
  errors: () => debugLoggerService.getErrorMetrics(),
  debugInfo: () => debugLoggerService.getDebugInfo(),
  
  // Control
  enable: () => debugLoggerService.setEnabled(true),
  disable: () => debugLoggerService.setEnabled(false),
  clear: () => debugLoggerService.clearMetrics()
};