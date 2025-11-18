/**
 * @file performance-monitor.service.ts
 * @description Performance monitoring and error tracking service for application optimization
 * @created 2024-12-19
 */

import { logger } from '@/lib/utils/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface ErrorEvent {
  id: string;
  message: string;
  stack?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  userId?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface UserInteraction {
  type: 'click' | 'navigation' | 'search' | 'form_submit' | 'modal_open' | 'modal_close';
  element?: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  errors: ErrorEvent[];
  interactions: UserInteraction[];
  summary: {
    totalErrors: number;
    avgLoadTime: number;
    totalInteractions: number;
    criticalErrors: number;
  };
}

/**
 * Performance monitoring service for tracking metrics, errors, and user interactions
 */
class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private interactions: UserInteraction[] = [];
  private isEnabled: boolean = true;
  private maxStoredItems: number = 1000;
  private reportingInterval: number = 5 * 60 * 1000; // 5 minutes
  private reportingTimer: NodeJS.Timeout | null = null;
  private alertThrottleMap: Map<string, number> = new Map();
  private eventListeners: Array<{ element: Window | Document; event: string; handler: EventListener }> = [];
  private performanceObservers: PerformanceObserver[] = [];
  private throttleMapCleanupTimer: NodeJS.Timeout | null = null;
  private maxThrottleMapSize: number = 100; // Limit throttle map size

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring with browser APIs
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor unhandled errors
    const errorHandler = (event: Event) => {
      const errorEvent = event as unknown as ErrorEvent;
      // Access error property safely - ErrorEvent.error is available but TypeScript types may be outdated
      const error = (errorEvent as unknown as { error?: Error }).error || undefined;
      const filename = (errorEvent as unknown as { filename?: string }).filename;
      const lineno = (errorEvent as unknown as { lineno?: number }).lineno;
      const colno = (errorEvent as unknown as { colno?: number }).colno;
      
      this.trackError({
        message: errorEvent.message || 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: filename || window.location.href,
        severity: 'high',
        context: {
          lineno: lineno,
          colno: colno,
          type: 'javascript_error'
        }
      });
    };
    window.addEventListener('error', errorHandler);
    this.eventListeners.push({ element: window, event: 'error', handler: errorHandler as EventListener });

    // Monitor unhandled promise rejections
    const rejectionHandler = (event: Event) => {
      const rejectionEvent = event as PromiseRejectionEvent;
      const reason = rejectionEvent.reason;
      this.trackError({
        message: `Unhandled Promise Rejection: ${reason}`,
        stack: reason instanceof Error ? reason.stack : undefined,
        url: window.location.href,
        severity: 'high',
        context: {
          type: 'promise_rejection',
          reason: reason
        }
      });
    };
    window.addEventListener('unhandledrejection', rejectionHandler);
    this.eventListeners.push({ element: window, event: 'unhandledrejection', handler: rejectionHandler as EventListener });

    // Monitor performance entries
    if ('PerformanceObserver' in window) {
      this.initializePerformanceObserver();
    }

    // Start periodic reporting
    this.startPeriodicReporting();

    // Start throttle map cleanup timer
    this.startThrottleMapCleanup();
  }

  /**
   * Initialize Performance Observer for detailed metrics
   */
  private initializePerformanceObserver(): void {
    try {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart, {
              type: 'navigation',
              url: window.location.pathname
            });
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.performanceObservers.push(navObserver);

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.trackMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.startTime, {
              type: 'resource',
              name: resourceEntry.name,
              size: resourceEntry.transferSize?.toString() || '0'
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.performanceObservers.push(resourceObserver);

      // Monitor largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackMetric('largest_contentful_paint', entry.startTime, {
            type: 'lcp',
            url: window.location.pathname
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.performanceObservers.push(lcpObserver);

      // Monitor first input delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.trackMetric('first_input_delay', (entry as any).processingStart - entry.startTime, {
            type: 'fid',
            url: window.location.pathname
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.performanceObservers.push(fidObserver);

    } catch (error) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Failed to initialize PerformanceObserver:', error);
      }
    }
  }

  /**
   * Track a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Record<string, string>} tags - Optional tags for categorization
   * @param {Record<string, any>} metadata - Optional metadata
   */
  trackMetric(
    name: string, 
    value: number, 
    tags?: Record<string, string>,
    metadata?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      metadata
    };

    this.metrics.push(metric);
    this.trimStoredItems('metrics');

    // Log critical performance issues (development only)
    if (process.env.NODE_ENV === 'development' && this.isCriticalMetric(name, value)) {
      logger.warn(`Critical performance metric: ${name} = ${value}ms`, { tags, metadata });
    }
  }

  /**
   * Track an error event
   * @param {Partial<ErrorEvent>} errorData - Error information
   */
  trackError(errorData: Partial<ErrorEvent>): void {
    if (!this.isEnabled) return;

    // Validate error data
    if (!errorData || (!errorData.message && !errorData.stack)) {
      // Only log validation errors in development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Performance Monitor: Invalid error data provided', errorData);
      }
      return;
    }

    const error: ErrorEvent = {
      id: this.generateId(),
      message: errorData.message || 'Unknown error',
      stack: errorData.stack,
      timestamp: Date.now(),
      url: errorData.url || (typeof window !== 'undefined' ? window.location.href : ''),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userId: errorData.userId,
      context: errorData.context,
      severity: errorData.severity || 'medium'
    };

    this.errors.push(error);
    this.trimStoredItems('errors');

    // Enhanced logging for development with better formatting
    if (process.env.NODE_ENV === 'development') {
      logger.error(`Performance Monitor - ${error.severity.toUpperCase()} Error`, {
        message: error.message,
        context: error.context,
        stack: error.stack,
        timestamp: new Date(error.timestamp).toISOString()
      });
    }
  }

  /**
   * Track user interaction
   * @param {UserInteraction} interaction - Interaction data
   */
  trackInteraction(interaction: UserInteraction): void {
    if (!this.isEnabled) return;

    this.interactions.push({
      ...interaction,
      timestamp: interaction.timestamp || Date.now()
    });
    this.trimStoredItems('interactions');
  }

  /**
   * Track API call performance
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Call duration in ms
   * @param {boolean} success - Whether the call was successful
   * @param {any} metadata - Additional metadata
   */
  trackApiCall(endpoint: string, duration: number, success: boolean, metadata?: any): void {
    this.trackMetric('api_call_duration', duration, {
      endpoint,
      success: success.toString(),
      type: 'api_call'
    }, metadata);

    if (!success) {
      this.trackError({
        message: `API call failed: ${endpoint}`,
        severity: 'medium',
        context: {
          endpoint,
          duration,
          ...metadata
        }
      });
    }
  }

  /**
   * Track component render performance with throttling
   * @param {string} componentName - Name of the component
   * @param {number} renderTime - Render time in milliseconds
   * @param {any} props - Component props for context
   */
  trackComponentRender(componentName: string, renderTime: number, props?: any): void {
    this.trackMetric('component_render_time', renderTime, {
      component: componentName,
      type: 'render'
    }, { props });

    // Environment-aware thresholds
    const thresholds = this.getEnvironmentThresholds();
    const slowRenderThreshold = thresholds.componentRender;
    
    // Track slow renders with throttling to prevent spam
    if (renderTime > slowRenderThreshold) {
      const throttleKey = `slow_render_${componentName}`;
      const now = Date.now();
      const lastAlert = this.alertThrottleMap.get(throttleKey) || 0;
      
      // Only alert once every 5 seconds for the same component
      if (now - lastAlert > 5000) {
        this.alertThrottleMap.set(throttleKey, now);
        
        this.trackError({
          message: `Slow component render: ${componentName}`,
          severity: renderTime > slowRenderThreshold * 2 ? 'medium' : 'low',
          context: {
            componentName,
            renderTime,
            threshold: slowRenderThreshold,
            environment: process.env.NODE_ENV,
            props: props ? Object.keys(props) : undefined // Only log prop keys, not values
          }
        });
      }
    }
  }

  /**
   * Get performance report
   * @param {number} timeRange - Time range in ms (default: last hour)
   * @returns {PerformanceReport} Performance report
   */
  getPerformanceReport(timeRange: number = 60 * 60 * 1000): PerformanceReport {
    const cutoff = Date.now() - timeRange;

    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const recentErrors = this.errors.filter(e => e.timestamp >= cutoff);
    const recentInteractions = this.interactions.filter(i => i.timestamp >= cutoff);

    const loadTimeMetrics = recentMetrics.filter(m => m.name.includes('load_time'));
    const avgLoadTime = loadTimeMetrics.length > 0 
      ? loadTimeMetrics.reduce((sum, m) => sum + m.value, 0) / loadTimeMetrics.length 
      : 0;

    return {
      metrics: recentMetrics,
      errors: recentErrors,
      interactions: recentInteractions,
      summary: {
        totalErrors: recentErrors.length,
        avgLoadTime,
        totalInteractions: recentInteractions.length,
        criticalErrors: recentErrors.filter(e => e.severity === 'critical').length
      }
    };
  }

  /**
   * Get real-time performance metrics
   * @returns {object} Current performance metrics
   */
  getRealTimeMetrics(): object {
    if (typeof window === 'undefined') return {};

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    return {
      // Memory usage (if available)
      memory: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null,

      // Navigation timing
      navigation: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstByte: navigation.responseStart - navigation.fetchStart
      } : null,

      // Paint timing
      paint: paint.reduce((acc, entry) => {
        acc[entry.name.replace('-', '_')] = entry.startTime;
        return acc;
      }, {} as Record<string, number>),

      // Current metrics summary
      recentErrors: this.errors.slice(-10),
      recentMetrics: this.metrics.slice(-20)
    };
  }

  /**
   * Enable or disable monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled && this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    } else if (enabled && !this.reportingTimer) {
      this.startPeriodicReporting();
    }
  }

  /**
   * Clear all stored data
   */
  clearData(): void {
    this.metrics = [];
    this.errors = [];
    this.interactions = [];
  }

  /**
   * Export performance data for analysis
   * @returns {string} JSON string of performance data
   */
  exportData(): string {
    return JSON.stringify({
      metrics: this.metrics,
      errors: this.errors,
      interactions: this.interactions,
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Get environment-aware performance thresholds
   * @private
   */
  private getEnvironmentThresholds(): Record<string, number> {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      componentRender: isDevelopment ? 50 : 16, // More lenient in dev
      pageLoad: isDevelopment ? 5000 : 3000,
      apiCall: isDevelopment ? 8000 : 5000,
      // OPTIMIZED: Lower LCP threshold to catch issues earlier (should be < 2500ms)
      largestContentfulPaint: 2500, // Same threshold for dev and prod - LCP should always be fast
      firstInputDelay: isDevelopment ? 200 : 100
    };
  }

  /**
   * Check if a metric indicates critical performance issue
   * @private
   */
  private isCriticalMetric(name: string, value: number): boolean {
    const thresholds = this.getEnvironmentThresholds();
    const thresholdMap: Record<string, keyof typeof thresholds> = {
      'page_load_time': 'pageLoad',
      'api_call_duration': 'apiCall',
      'component_render_time': 'componentRender',
      'largest_contentful_paint': 'largestContentfulPaint',
      'first_input_delay': 'firstInputDelay'
    };

    const thresholdKey = thresholdMap[name];
    return thresholdKey ? value > thresholds[thresholdKey] : false;
  }

  /**
   * Trim stored items to prevent memory leaks
   * @private
   */
  private trimStoredItems(type: 'metrics' | 'errors' | 'interactions'): void {
    const array = this[type];
    if (array.length > this.maxStoredItems) {
      array.splice(0, array.length - this.maxStoredItems);
    }
  }

  /**
   * Generate unique ID for errors
   * @private
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start periodic reporting
   * @private
   */
  private startPeriodicReporting(): void {
    if (this.reportingTimer) return;

    this.reportingTimer = setInterval(() => {
      const report = this.getPerformanceReport();
      
      // Log summary for development only
      if (process.env.NODE_ENV === 'development' && report.summary.totalErrors > 0) {
        logger.info('Performance Report:', report.summary);
      }

      // In production, send critical errors to analytics service
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      // if (report.summary.criticalErrors > 0) {
      //   this.sendToAnalytics(report);
      // }
      
    }, this.reportingInterval);
  }

  /**
   * Start throttle map cleanup timer to prevent unbounded growth
   * @private
   */
  private startThrottleMapCleanup(): void {
    if (this.throttleMapCleanupTimer) return;

    // Clean up throttle map every 10 minutes
    this.throttleMapCleanupTimer = setInterval(() => {
      this.cleanupThrottleMap();
    }, 10 * 60 * 1000);
  }

  /**
   * Clean up throttle map to prevent memory leaks
   * Removes old entries and limits map size
   * @private
   */
  private cleanupThrottleMap(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    // Remove entries older than maxAge
    for (const [key, timestamp] of this.alertThrottleMap.entries()) {
      if (now - timestamp > maxAge) {
        this.alertThrottleMap.delete(key);
      }
    }

    // If map is still too large, remove oldest entries
    if (this.alertThrottleMap.size > this.maxThrottleMapSize) {
      const entries = Array.from(this.alertThrottleMap.entries())
        .sort((a, b) => a[1] - b[1]); // Sort by timestamp
      
      const toRemove = entries.slice(0, entries.length - this.maxThrottleMapSize);
      for (const [key] of toRemove) {
        this.alertThrottleMap.delete(key);
      }
    }
  }

  /**
   * Clean up all resources and event listeners
   * Call this when the service is no longer needed (e.g., during app unmount)
   */
  destroy(): void {
    // Clear timers
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
      this.reportingTimer = null;
    }

    if (this.throttleMapCleanupTimer) {
      clearInterval(this.throttleMapCleanupTimer);
      this.throttleMapCleanupTimer = null;
    }

    // Disconnect all PerformanceObservers
    for (const observer of this.performanceObservers) {
      try {
        observer.disconnect();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Error disconnecting PerformanceObserver:', error);
        }
      }
    }
    this.performanceObservers = [];

    // Remove all event listeners
    for (const { element, event, handler } of this.eventListeners) {
      try {
        element.removeEventListener(event, handler);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Error removing event listener:', error);
        }
      }
    }
    this.eventListeners = [];

    // Clear stored data
    this.clearData();
    this.alertThrottleMap.clear();

    // Disable monitoring
    this.isEnabled = false;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();