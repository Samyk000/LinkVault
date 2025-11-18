/**
 * @file use-performance-monitor.ts
 * @description React hook for integrating performance monitoring into components
 * @created 2024-12-19
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { performanceMonitor } from '@/lib/services/performance-monitor.service';

interface UsePerformanceMonitorOptions {
  componentName: string;
  trackRenders?: boolean;
  trackInteractions?: boolean;
  trackErrors?: boolean;
  renderThreshold?: number; // ms threshold for slow render warning
}

interface PerformanceHookReturn {
  trackInteraction: (type: string, element?: string, metadata?: Record<string, any>) => void;
  trackError: (error: Error | string, context?: Record<string, any>) => void;
  trackMetric: (name: string, value: number, tags?: Record<string, string>) => void;
  startTimer: (name: string) => () => void;
  measureAsync: <T>(name: string, asyncFn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for performance monitoring in React components
 * @param {UsePerformanceMonitorOptions} options - Configuration options
 * @returns {PerformanceHookReturn} Performance tracking functions
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions): PerformanceHookReturn {
  const {
    componentName,
    trackRenders = true,
    trackInteractions = true,
    trackErrors = true,
    renderThreshold = 16 // 60fps threshold
  } = options;

  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Track component mount - only if tracking is enabled
  useEffect(() => {
    if (!trackRenders && !trackInteractions && !trackErrors) return;
    
    mountTime.current = performance.now();
    
    if (trackInteractions) {
      performanceMonitor.trackInteraction({
        type: 'modal_open', // Using existing type, could be extended
        element: componentName,
        timestamp: Date.now(),
        metadata: { action: 'component_mount' }
      });
    }

    return () => {
      if (!trackRenders && !trackInteractions && !trackErrors) return;
      
      const unmountTime = performance.now();
      const totalLifetime = unmountTime - mountTime.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const finalRenderCount = renderCount.current; // Capture ref value
      
      if (trackRenders) {
        performanceMonitor.trackMetric('component_lifetime', totalLifetime, {
          component: componentName,
          type: 'lifecycle'
        }, {
          renderCount: finalRenderCount
        });
      }

      if (trackInteractions) {
        performanceMonitor.trackInteraction({
          type: 'modal_close', // Using existing type, could be extended
          element: componentName,
          timestamp: Date.now(),
          duration: totalLifetime,
          metadata: { 
            action: 'component_unmount',
            renderCount: finalRenderCount
          }
        });
      }
    };
  }, [componentName, trackRenders, trackInteractions, trackErrors]);

  // Track renders with optimized performance
  useEffect(() => {
    if (!trackRenders) return;

    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    
    if (renderStartTime.current > 0) {
      renderCount.current++;
      
      // Only track performance metrics if render time is significant or exceeds threshold
      const threshold = process.env.NODE_ENV === 'development' ? 50 : 16;
      
      // Throttle tracking to avoid performance overhead
      if (renderDuration > 10 && renderCount.current % 5 === 0) {
        performanceMonitor.trackComponentRender(
          componentName, 
          renderDuration,
          { renderCount: renderCount.current }
        );
      }

      // Only log slow renders, not all renders
      if (renderDuration > threshold) {
        performanceMonitor.trackError({
          message: `Slow component render: ${componentName}`,
          severity: renderDuration > threshold * 2 ? 'medium' : 'low',
          context: {
            componentName,
            renderTime: renderDuration,
            threshold: threshold,
            environment: process.env.NODE_ENV,
            props: undefined // Don't log props to avoid overhead
          }
        });
      }
    }

    renderStartTime.current = performance.now();
  });

  /**
   * Track user interaction
   */
  const trackInteraction = useCallback((
    type: string, 
    element?: string, 
    metadata?: Record<string, any>
  ) => {
    if (!trackInteractions) return;

    performanceMonitor.trackInteraction({
      type: type as any, // Cast to satisfy the union type
      element: element || componentName,
      timestamp: Date.now(),
      metadata: {
        component: componentName,
        ...metadata
      }
    });
  }, [componentName, trackInteractions]);

  /**
   * Track error with component context
   */
  const trackError = useCallback((
    error: Error | string, 
    context?: Record<string, any>
  ) => {
    if (!trackErrors) return;

    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    performanceMonitor.trackError({
      message: errorMessage,
      stack: errorStack,
      severity: 'medium',
      context: {
        component: componentName,
        renderCount: renderCount.current,
        ...context
      }
    });
  }, [componentName, trackErrors]);

  /**
   * Track custom metric with component context
   */
  const trackMetric = useCallback((
    name: string, 
    value: number, 
    tags?: Record<string, string>
  ) => {
    performanceMonitor.trackMetric(name, value, {
      component: componentName,
      ...tags
    });
  }, [componentName]);

  /**
   * Start a timer and return a function to end it
   */
  const startTimer = useCallback((name: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      trackMetric(name, duration, { type: 'timer' });
      return duration;
    };
  }, [trackMetric]);

  /**
   * Measure async operation performance
   */
  const measureAsync = useCallback(async <T>(
    name: string, 
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncFn();
      const duration = performance.now() - startTime;
      
      trackMetric(name, duration, { 
        type: 'async_operation',
        status: 'success'
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      trackMetric(name, duration, { 
        type: 'async_operation',
        status: 'error'
      });
      
      trackError(error as Error, {
        operation: name,
        duration
      });
      
      throw error;
    }
  }, [trackMetric, trackError]);

  return useMemo(() => ({
    trackInteraction,
    trackError,
    trackMetric,
    startTimer,
    measureAsync
  }), [trackInteraction, trackError, trackMetric, startTimer, measureAsync]);
}

/**
 * Hook for tracking API calls with automatic performance monitoring
 */
export function useApiPerformanceMonitor() {
  const trackApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      
      performanceMonitor.trackApiCall(endpoint, duration, true, {
        ...metadata,
        resultType: typeof result
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.trackApiCall(endpoint, duration, false, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }, []);

  return { trackApiCall };
}

/**
 * Hook for tracking form performance
 */
export function useFormPerformanceMonitor(formName: string) {
  const { trackInteraction, trackMetric, trackError } = usePerformanceMonitor({
    componentName: formName,
    trackRenders: false // Forms don't need render tracking
  });

  const trackFormStart = useCallback(() => {
    trackInteraction('form_start', formName);
    return performance.now();
  }, [trackInteraction, formName]);

  const trackFormSubmit = useCallback((
    startTime: number, 
    success: boolean, 
    validationErrors?: string[]
  ) => {
    const duration = performance.now() - startTime;
    
    trackMetric('form_completion_time', duration, {
      form: formName,
      success: success.toString()
    });

    trackInteraction('form_submit', formName, {
      duration,
      success,
      validationErrors: validationErrors?.length || 0
    });

    if (!success && validationErrors?.length) {
      trackError(`Form validation failed: ${formName}`, {
        validationErrors,
        duration
      });
    }
  }, [trackMetric, trackInteraction, trackError, formName]);

  const trackFieldInteraction = useCallback((fieldName: string, action: string) => {
    trackInteraction('form_field_interaction', `${formName}.${fieldName}`, {
      action,
      field: fieldName
    });
  }, [trackInteraction, formName]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFieldInteraction
  };
}