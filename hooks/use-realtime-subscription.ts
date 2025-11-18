/**
 * @file hooks/use-realtime-subscription.ts
 * @description React hook for optimized real-time subscriptions with automatic cleanup
 * @created 2025-01-01
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { realtimeSubscriptionManager } from '@/services/realtime-subscription-manager.service';

/**
 * Subscription configuration interface
 */
interface SubscriptionConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

/**
 * Debounced update configuration
 */
interface DebouncedUpdateConfig {
  delay?: number;
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Hook options interface
 */
interface UseRealtimeSubscriptionOptions {
  enabled?: boolean;
  debounce?: DebouncedUpdateConfig;
  dependencies?: any[];
}

/**
 * Hook return interface
 */
interface UseRealtimeSubscriptionReturn {
  isConnected: boolean;
  subscriptionId: string | null;
  pause: () => void;
  resume: () => void;
  unsubscribe: () => void;
}

/**
 * React hook for optimized real-time subscriptions
 * Automatically manages subscription lifecycle and cleanup
 * 
 * @param config - Subscription configuration
 * @param callback - Callback function for updates
 * @param options - Hook options
 * @returns Subscription management object
 * 
 * @example
 * ```tsx
 * const { isConnected, pause, resume } = useRealtimeSubscription(
 *   { table: 'links', event: 'INSERT' },
 *   (payload) => {
 *     console.log('New link:', payload.new);
 *   },
 *   { 
 *     enabled: true,
 *     debounce: { delay: 500 },
 *     dependencies: [userId]
 *   }
 * );
 * ```
 */
export function useRealtimeSubscription(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  const {
    enabled = true,
    debounce,
    dependencies = []
  } = options;

  const subscriptionIdRef = useRef<string | null>(null);
  const isConnectedRef = useRef<boolean>(false);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  /**
   * Pause the subscription
   */
  const pause = useCallback(() => {
    if (subscriptionIdRef.current) {
      realtimeSubscriptionManager.pauseSubscription(subscriptionIdRef.current);
      isConnectedRef.current = false;
    }
  }, []);

  /**
   * Resume the subscription
   */
  const resume = useCallback(() => {
    if (subscriptionIdRef.current) {
      realtimeSubscriptionManager.resumeSubscription(subscriptionIdRef.current);
      isConnectedRef.current = true;
    }
  }, []);

  /**
   * Manually unsubscribe
   */
  const unsubscribe = useCallback(() => {
    if (subscriptionIdRef.current) {
      realtimeSubscriptionManager.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  // Main subscription effect
  useEffect(() => {
    if (!enabled) {
      // Clean up existing subscription if disabled
      if (subscriptionIdRef.current) {
        unsubscribe();
      }
      return;
    }

    // Create subscription
    const subscriptionConfig = {
      table: config.table,
      event: config.event,
      filter: config.filter,
      schema: config.schema
    };

    const subscriptionId = realtimeSubscriptionManager.subscribe(
      subscriptionConfig,
      (payload) => {
        // Use the latest callback from ref
        callbackRef.current(payload);
      },
      debounce
    );

    subscriptionIdRef.current = subscriptionId;
    isConnectedRef.current = true;

    // Cleanup function
    return () => {
      if (subscriptionIdRef.current) {
        realtimeSubscriptionManager.unsubscribe(subscriptionIdRef.current);
        subscriptionIdRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [
    enabled,
    config.table,
    config.event,
    config.filter,
    config.schema,
    debounce,
    unsubscribe,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...dependencies
  ]);

  return {
    isConnected: isConnectedRef.current,
    subscriptionId: subscriptionIdRef.current,
    pause,
    resume,
    unsubscribe
  };
}

/**
 * Hook for subscribing to multiple tables with shared configuration
 * 
 * @param configs - Array of subscription configurations
 * @param callback - Callback function for updates
 * @param options - Hook options
 * @returns Array of subscription management objects
 * 
 * @example
 * ```tsx
 * const subscriptions = useMultipleRealtimeSubscriptions(
 *   [
 *     { table: 'links', event: 'INSERT' },
 *     { table: 'folders', event: 'UPDATE' }
 *   ],
 *   (payload) => {
 *     console.log('Update from:', payload.table);
 *   }
 * );
 * ```
 */
export function useMultipleRealtimeSubscriptions(
  configs: SubscriptionConfig[],
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn[] {
  const {
    enabled = true,
    debounce,
    dependencies = []
  } = options;

  const subscriptionIdsRef = useRef<(string | null)[]>([]);
  const isConnectedRef = useRef<boolean[]>([]);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Memoize serialized configs to avoid complex expressions in dependencies
  const serializedConfigs = useMemo(() => 
    JSON.stringify(configs.map(c => ({ 
      table: c.table, 
      event: c.event, 
      filter: c.filter, 
      schema: c.schema 
    }))), [configs]);

  // Main subscription effect
  useEffect(() => {
    if (!enabled) {
      // Clean up existing subscriptions if disabled
      subscriptionIdsRef.current.forEach(id => {
        if (id) {
          realtimeSubscriptionManager.unsubscribe(id);
        }
      });
      subscriptionIdsRef.current = [];
      isConnectedRef.current = [];
      return;
    }

    const subscriptions: string[] = [];

    configs.forEach((config) => {
      const subscriptionConfig = {
        table: config.table,
        event: config.event,
        filter: config.filter,
        schema: config.schema
      };

      const subscriptionId = realtimeSubscriptionManager.subscribe(
        subscriptionConfig,
        (payload) => {
          // Use the latest callback from ref
          callbackRef.current(payload);
        },
        debounce
      );

      subscriptions.push(subscriptionId);
    });

    subscriptionIdsRef.current = subscriptions;
    isConnectedRef.current = new Array(subscriptions.length).fill(true);

    return () => {
      subscriptions.forEach(id => {
        realtimeSubscriptionManager.unsubscribe(id);
      });
      subscriptionIdsRef.current = [];
      isConnectedRef.current = [];
    };
  }, [
    enabled,
    serializedConfigs,
    configs,
    debounce,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...dependencies
  ]);

  // Create subscription management objects for each config
  const subscriptions = configs.map((_, index) => ({
    isConnected: isConnectedRef.current[index] || false,
    subscriptionId: subscriptionIdsRef.current[index] || null,
    pause: () => {
      const id = subscriptionIdsRef.current[index];
      if (id) {
        realtimeSubscriptionManager.pauseSubscription(id);
        isConnectedRef.current[index] = false;
      }
    },
    resume: () => {
      const id = subscriptionIdsRef.current[index];
      if (id) {
        realtimeSubscriptionManager.resumeSubscription(id);
        isConnectedRef.current[index] = true;
      }
    },
    unsubscribe: () => {
      const id = subscriptionIdsRef.current[index];
      if (id) {
        realtimeSubscriptionManager.unsubscribe(id);
        subscriptionIdsRef.current[index] = null;
        isConnectedRef.current[index] = false;
      }
    }
  }));

  return subscriptions;
}

/**
 * Hook for conditional real-time subscriptions based on user permissions or state
 * 
 * @param getConfig - Function that returns subscription config or null
 * @param callback - Callback function for updates
 * @param options - Hook options
 * @returns Subscription management object
 * 
 * @example
 * ```tsx
 * const { isConnected } = useConditionalRealtimeSubscription(
 *   () => user?.canViewLinks ? { table: 'links' } : null,
 *   (payload) => handleLinkUpdate(payload),
 *   { dependencies: [user] }
 * );
 * ```
 */
export function useConditionalRealtimeSubscription(
  getConfig: () => SubscriptionConfig | null,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: UseRealtimeSubscriptionOptions = {}
): UseRealtimeSubscriptionReturn {
  const config = getConfig();
  const enabled = config !== null && (options.enabled !== false);

  // Always call the hook to avoid rules-of-hooks violations
  return useRealtimeSubscription(
    config || { table: '' }, // Fallback config (won't be used if disabled)
    callback,
    { ...options, enabled }
  );
}

/**
 * Hook for real-time subscriptions with automatic retry logic
 * 
 * @param config - Subscription configuration
 * @param callback - Callback function for updates
 * @param options - Hook options with retry configuration
 * @returns Subscription management object with retry info
 * 
 * @example
 * ```tsx
 * const { isConnected, retryCount } = useRealtimeSubscriptionWithRetry(
 *   { table: 'links' },
 *   handleUpdate,
 *   { 
 *     maxRetries: 3,
 *     retryDelay: 1000,
 *     backoffMultiplier: 2
 *   }
 * );
 * ```
 */
export function useRealtimeSubscriptionWithRetry(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  options: UseRealtimeSubscriptionOptions & {
    maxRetries?: number;
    retryDelay?: number;
    backoffMultiplier?: number;
  } = {}
): UseRealtimeSubscriptionReturn & { retryCount: number } {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoffMultiplier = 2,
    enabled: originalEnabled = true,
    ...hookOptions
  } = options;

  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [enabled, setEnabled] = useState(originalEnabled);
  const [retryCount, setRetryCount] = useState(0);

  const wrappedCallback = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    // Reset retry count on successful update
    retryCountRef.current = 0;
    setRetryCount(0);
    callback(payload);
  }, [callback]);

  const subscription = useRealtimeSubscription(config, wrappedCallback, {
    ...hookOptions,
    enabled
  });

  // Retry logic for failed connections
  useEffect(() => {
    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (!subscription.isConnected && retryCountRef.current < maxRetries && enabled) {
      const delay = retryDelay * Math.pow(backoffMultiplier, retryCountRef.current);
      
      retryTimeoutRef.current = setTimeout(() => {
        retryCountRef.current++;
        setRetryCount(retryCountRef.current);
        
        // Force re-subscription by toggling enabled state
        setEnabled(false);
        setTimeout(() => {
          setEnabled(true);
        }, 100);
      }, delay);
    } else if (subscription.isConnected) {
      // Reset retry count on successful connection
      retryCountRef.current = 0;
      setRetryCount(0);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [subscription.isConnected, maxRetries, retryDelay, backoffMultiplier, enabled]);

  // Update enabled state when originalEnabled prop changes
  useEffect(() => {
    setEnabled(originalEnabled);
    if (!originalEnabled) {
      retryCountRef.current = 0;
      setRetryCount(0);
    }
  }, [originalEnabled]);

  return {
    ...subscription,
    retryCount
  };
}