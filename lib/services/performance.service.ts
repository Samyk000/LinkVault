/**
 * @file lib/services/performance.service.ts
 * @description Performance monitoring and metrics collection
 * @created 2025-11-11
 */

// Define LayoutShift interface for TypeScript
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export interface PerformanceMetrics {
  // Database metrics
  dbQueryTime: number;
  dbQueryCount: number;
  cacheHitRate: number;
  
  // Network metrics
  apiResponseTime: number;
  apiErrorRate: number;
  
  // UI metrics
  renderTime: number;
  bundleSize: number;
  
  // User experience
  timeToInteractive: number;
  firstContentfulPaint: number;
}

export interface MetricEvent {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceService {
  private metrics: Map<string, MetricEvent[]> = new Map();
  private startTime: number = Date.now();
  private isMonitoring: boolean = false;

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = Date.now();
    
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor network requests
    this.monitorNetworkRequests();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Record a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   * @param {Record<string, any>} metadata - Additional metadata
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const event: MetricEvent = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(event);

    // Keep only last 1000 events per metric
    const events = this.metrics.get(name)!;
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }
  }

  /**
   * Record database query time
   * @param {string} query - Query name
   * @param {number} duration - Query duration in ms
   */
  recordDbQuery(query: string, duration: number): void {
    this.recordMetric('db_query_time', duration, { query });
  }

  /**
   * Record cache hit/miss
   * @param {string} key - Cache key
   * @param {boolean} hit - Whether it was a cache hit
   */
  recordCacheHit(key: string, hit: boolean): void {
    this.recordMetric('cache_operation', hit ? 1 : 0, { key, hit });
  }

  /**
   * Record API response time
   * @param {string} endpoint - API endpoint
   * @param {number} duration - Response duration in ms
   * @param {number} status - HTTP status code
   */
  recordApiResponse(endpoint: string, duration: number, status: number): void {
    this.recordMetric('api_response_time', duration, { endpoint, status });
    
    if (status >= 400) {
      this.recordMetric('api_error', 1, { endpoint, status });
    }
  }

  /**
   * Get performance summary
   * @returns {PerformanceMetrics} Performance metrics summary
   */
  getMetricsSummary(): PerformanceMetrics {
    const now = Date.now();
    const summary: PerformanceMetrics = {
      dbQueryTime: this.getAverageMetric('db_query_time'),
      dbQueryCount: this.getMetricCount('db_query_time'),
      cacheHitRate: this.getCacheHitRate(),
      apiResponseTime: this.getAverageMetric('api_response_time'),
      apiErrorRate: this.getErrorRate(),
      renderTime: this.getAverageMetric('render_time'),
      bundleSize: this.getBundleSize(),
      timeToInteractive: this.getAverageMetric('tti'),
      firstContentfulPaint: this.getAverageMetric('fcp'),
    };

    return summary;
  }

  /**
   * Get average value for a metric
   * @param {string} name - Metric name
   * @returns {number} Average value
   */
  private getAverageMetric(name: string): number {
    const events = this.metrics.get(name) || [];
    if (events.length === 0) return 0;

    const sum = events.reduce((acc, event) => acc + event.value, 0);
    return sum / events.length;
  }

  /**
   * Get count of metric events
   * @param {string} name - Metric name
   * @returns {number} Event count
   */
  private getMetricCount(name: string): number {
    return this.metrics.get(name)?.length || 0;
  }

  /**
   * Get cache hit rate
   * @returns {number} Cache hit rate (0-1)
   */
  private getCacheHitRate(): number {
    const cacheEvents = this.metrics.get('cache_operation') || [];
    if (cacheEvents.length === 0) return 0;

    const hits = cacheEvents.filter(event => event.metadata?.hit).length;
    return hits / cacheEvents.length;
  }

  /**
   * Get API error rate
   * @returns {number} Error rate (0-1)
   */
  private getErrorRate(): number {
    const totalRequests = this.getMetricCount('api_response_time');
    const errors = this.getMetricCount('api_error');
    
    if (totalRequests === 0) return 0;
    return errors / totalRequests;
  }

  /**
   * Get bundle size (estimated)
   * @returns {number} Bundle size in KB
   */
  private getBundleSize(): number {
    if (typeof window === 'undefined') return 0;
    
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources.filter((r: PerformanceEntry) =>
      r.name && r.name.toString().endsWith('.js')
    );
    
    return jsResources.reduce((acc: number, r: PerformanceEntry) => {
      const resource = r as PerformanceResourceTiming;
      return acc + (resource.transferSize || 0);
    }, 0) / 1024;
  }

  /**
   * Monitor Core Web Vitals
   */
  private monitorCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('fcp', entry.startTime);
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('lcp', entry.startTime);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as PerformanceEventTiming;
        if (fidEntry.processingStart && fidEntry.startTime) {
          this.recordMetric('fid', fidEntry.processingStart - fidEntry.startTime);
        }
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const clsEntry = entry as LayoutShift;
        if (!clsEntry.hadRecentInput && clsEntry.value) {
          this.recordMetric('cls', clsEntry.value);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Time to Interactive
    window.addEventListener('load', () => {
      const tti = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.recordMetric('tti', tti);
    });
  }

  /**
   * Monitor memory usage
   */
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined') return;
    
    const memory = (performance as any).memory;
    if (!memory) return;

    setInterval(() => {
      this.recordMetric('memory_used', memory.usedJSHeapSize / 1024 / 1024); // MB
      this.recordMetric('memory_total', memory.totalJSHeapSize / 1024 / 1024); // MB
    }, 5000); // Check every 5 seconds
  }

  /**
   * Monitor network requests
   */
  private monitorNetworkRequests(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = (args[0] instanceof Request ? args[0].url : args[0]).toString();
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordApiResponse(url, duration, response.status);
        
        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordApiResponse(url, duration, 0);
        throw error;
      }
    };
  }

  /**
   * Clear old metrics
   * @param {number} maxAge - Maximum age in milliseconds
   */
  clearOldMetrics(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    
    for (const [name, events] of this.metrics.entries()) {
      const filtered = events.filter(event => event.timestamp > cutoff);
      this.metrics.set(name, filtered);
    }
  }

  /**
   * Export metrics for analysis
   * @returns {Record<string, MetricEvent[]>} All metrics
   */
  exportMetrics(): Record<string, MetricEvent[]> {
    const result: Record<string, MetricEvent[]> = {};
    
    for (const [name, events] of this.metrics.entries()) {
      result[name] = [...events];
    }
    
    return result;
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();