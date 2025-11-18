/**
 * @file services/realtime-subscription-manager.service.ts
 * @description Centralized real-time subscription manager for optimized database subscriptions
 * @created 2025-01-01
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase/client';
import { performanceMonitor } from '@/lib/services/performance-monitor.service';

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
 * Subscription callback function type
 */
type SubscriptionCallback = (payload: RealtimePostgresChangesPayload<any>) => void;

/**
 * Subscription metadata interface
 */
interface SubscriptionMetadata {
  id: string;
  config: SubscriptionConfig;
  callback: SubscriptionCallback;
  channel?: RealtimeChannel;
  lastUpdate: number;
  updateCount: number;
  isActive: boolean;
  isPaused: boolean;
}

/**
 * Debounced update configuration
 */
interface DebouncedUpdateConfig {
  delay: number;
  maxWait: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Real-time subscription manager service
 * Provides centralized management of Supabase real-time subscriptions
 * with debounced updates, connection pooling, and performance optimization
 */
class RealtimeSubscriptionManagerService {
  private supabase = createClient();
  private subscriptions = new Map<string, SubscriptionMetadata>();
  private channels = new Map<string, RealtimeChannel>();
  private debouncedCallbacks = new Map<string, NodeJS.Timeout>();
  private updateQueues = new Map<string, RealtimePostgresChangesPayload<any>[]>();
  private connectionPool = new Set<RealtimeChannel>();
  private maxConnections = 10;
  private defaultDebounceConfig: DebouncedUpdateConfig = {
    delay: 300,
    maxWait: 1000,
    leading: false,
    trailing: true
  };

  /**
   * Subscribe to real-time changes with debounced updates
   * @param config - Subscription configuration
   * @param callback - Callback function for updates
   * @param debounceConfig - Optional debounce configuration
   * @returns Subscription ID for management
   */
  subscribe(
    config: SubscriptionConfig,
    callback: SubscriptionCallback,
    debounceConfig?: Partial<DebouncedUpdateConfig>
  ): string {
    const startTime = performance.now();
    const subscriptionId = this.generateSubscriptionId(config);
    
    try {
      // Check if subscription already exists
      if (this.subscriptions.has(subscriptionId)) {
        const existing = this.subscriptions.get(subscriptionId)!;
        existing.callback = callback;
        existing.lastUpdate = Date.now();
        
        performanceMonitor.trackMetric('subscription_reuse', performance.now() - startTime, {
          subscriptionId,
          table: config.table
        });
        
        return subscriptionId;
      }

      // Create new subscription
      const channel = this.getOrCreateChannel(config);
      const finalDebounceConfig = { ...this.defaultDebounceConfig, ...debounceConfig };
      
      const debouncedCallback = this.createDebouncedCallback(
        subscriptionId,
        callback,
        finalDebounceConfig
      );

      // Configure channel subscription with proper event type
      const eventType = config.event || '*';
      
      channel.on(
        'postgres_changes' as any,
        {
          event: eventType,
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter
        },
        debouncedCallback
      );

      // Store subscription metadata
      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        config,
        callback,
        channel,
        lastUpdate: Date.now(),
        updateCount: 0,
        isActive: true,
        isPaused: false
      });

      // Subscribe to channel if not already subscribed
      if (channel.state !== 'joined') {
        channel.subscribe((status) => {
          performanceMonitor.trackMetric('channel_subscription_time', performance.now() - startTime, {
            status,
            subscriptionId,
            table: config.table
          });
        });
      }

      performanceMonitor.trackMetric('subscription_create_time', performance.now() - startTime, {
        subscriptionId,
        table: config.table,
        hasFilter: (!!config.filter).toString()
      });

      return subscriptionId;
    } catch (error) {
      performanceMonitor.trackError({
        message: 'Failed to create subscription',
        severity: 'high',
        context: {
          action: 'create_subscription',
          table: config.table,
          subscriptionId
        }
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from real-time changes
   * @param subscriptionId - Subscription ID to remove
   */
  unsubscribe(subscriptionId: string): void {
    const startTime = performance.now();
    
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return;
      }

      // Clear debounced callback
      const debouncedTimeout = this.debouncedCallbacks.get(subscriptionId);
      if (debouncedTimeout) {
        clearTimeout(debouncedTimeout);
        this.debouncedCallbacks.delete(subscriptionId);
      }

      // Clear update queue
      this.updateQueues.delete(subscriptionId);

      // Mark as inactive
      subscription.isActive = false;

      // Remove from channel if no other subscriptions use it
      const channelKey = this.getChannelKey(subscription.config);
      const hasOtherSubscriptions = Array.from(this.subscriptions.values())
        .some(sub => sub.isActive && this.getChannelKey(sub.config) === channelKey && sub.id !== subscriptionId);

      if (!hasOtherSubscriptions && subscription.channel) {
        subscription.channel.unsubscribe();
        this.channels.delete(channelKey);
        this.connectionPool.delete(subscription.channel);
      }

      // Remove subscription
      this.subscriptions.delete(subscriptionId);

      performanceMonitor.trackMetric('subscription_remove_time', performance.now() - startTime, {
        subscriptionId,
        table: subscription.config.table,
        updateCount: subscription.updateCount.toString()
      });
    } catch (error) {
      performanceMonitor.trackError({
        message: 'Failed to remove subscription',
        severity: 'medium',
        context: {
          action: 'remove_subscription',
          subscriptionId
        }
      });
    }
  }

  /**
   * Pause a subscription temporarily
   * @param subscriptionId - Subscription ID to pause
   */
  pauseSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isPaused = true;
      
      performanceMonitor.trackMetric('subscription_pause', 0, {
        subscriptionId,
        table: subscription.config.table
      });
    }
  }

  /**
   * Resume a paused subscription
   * @param subscriptionId - Subscription ID to resume
   */
  resumeSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.isPaused = false;
      
      performanceMonitor.trackMetric('subscription_resume', 0, {
        subscriptionId,
        table: subscription.config.table
      });
    }
  }

  /**
   * Get subscription statistics
   * @returns Subscription statistics object
   */
  getStatistics() {
    const activeSubscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
    const totalUpdates = activeSubscriptions.reduce((sum, sub) => sum + sub.updateCount, 0);
    
    return {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: activeSubscriptions.length,
      totalChannels: this.channels.size,
      connectionPoolSize: this.connectionPool.size,
      totalUpdates,
      averageUpdatesPerSubscription: activeSubscriptions.length > 0 ? totalUpdates / activeSubscriptions.length : 0,
      subscriptionsByTable: this.getSubscriptionsByTable()
    };
  }

  /**
   * Clean up inactive subscriptions and optimize connections
   */
  optimizeConnections(): void {
    const startTime = performance.now();
    let cleanedCount = 0;
    
    try {
      // Remove inactive subscriptions older than 5 minutes
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      for (const [id, subscription] of this.subscriptions.entries()) {
        if (!subscription.isActive && subscription.lastUpdate < fiveMinutesAgo) {
          this.unsubscribe(id);
          cleanedCount++;
        }
      }

      // Optimize connection pool
      if (this.connectionPool.size > this.maxConnections) {
        const excessConnections = Array.from(this.connectionPool).slice(this.maxConnections);
        excessConnections.forEach(channel => {
          channel.unsubscribe();
          this.connectionPool.delete(channel);
        });
      }

      performanceMonitor.trackMetric('connection_optimization_time', performance.now() - startTime, {
        cleanedSubscriptions: cleanedCount.toString(),
        remainingConnections: this.connectionPool.size.toString()
      });
    } catch (error) {
      performanceMonitor.trackError({
        message: 'Failed to optimize connections',
        severity: 'medium',
        context: {
          action: 'optimize_connections',
          cleanedCount
        }
      });
    }
  }

  /**
   * Generate unique subscription ID
   * @param config - Subscription configuration
   * @returns Unique subscription ID
   */
  private generateSubscriptionId(config: SubscriptionConfig): string {
    const parts = [
      config.table,
      config.event || '*',
      config.schema || 'public',
      config.filter || 'no-filter'
    ];
    return `sub_${parts.join('_')}_${Date.now()}`;
  }

  /**
   * Get or create a channel for the subscription
   * @param config - Subscription configuration
   * @returns Realtime channel
   */
  private getOrCreateChannel(config: SubscriptionConfig): RealtimeChannel {
    const channelKey = this.getChannelKey(config);
    
    if (this.channels.has(channelKey)) {
      return this.channels.get(channelKey)!;
    }

    const channel = this.supabase.channel(channelKey);
    this.channels.set(channelKey, channel);
    this.connectionPool.add(channel);
    
    return channel;
  }

  /**
   * Generate channel key for connection pooling
   * @param config - Subscription configuration
   * @returns Channel key
   */
  private getChannelKey(config: SubscriptionConfig): string {
    return `${config.schema || 'public'}_${config.table}`;
  }

  /**
   * Create debounced callback function
   * @param subscriptionId - Subscription ID
   * @param callback - Original callback function
   * @param config - Debounce configuration
   * @returns Debounced callback function
   */
  private createDebouncedCallback(
    subscriptionId: string,
    callback: SubscriptionCallback,
    config: DebouncedUpdateConfig
  ): SubscriptionCallback {
    return (payload: RealtimePostgresChangesPayload<any>) => {
      try {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription || !subscription.isActive || subscription.isPaused) {
          return;
        }

        // Validate payload
        if (!payload || typeof payload !== 'object') {
          performanceMonitor.trackError({
            message: 'Invalid payload received in realtime subscription',
            severity: 'low',
            context: {
              subscriptionId,
              payloadType: typeof payload,
              table: subscription.config.table
            }
          });
          return;
        }

        // Add to update queue
        if (!this.updateQueues.has(subscriptionId)) {
          this.updateQueues.set(subscriptionId, []);
        }
        this.updateQueues.get(subscriptionId)!.push(payload);

        // Clear existing timeout
        const existingTimeout = this.debouncedCallbacks.get(subscriptionId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          try {
            const queue = this.updateQueues.get(subscriptionId) || [];
            if (queue.length > 0) {
              // Process all queued updates
              const latestPayload = queue[queue.length - 1]; // Use latest update
              callback(latestPayload);
              
              // Update subscription metadata
              subscription.updateCount += queue.length;
              subscription.lastUpdate = Date.now();
              
              // Clear queue
              this.updateQueues.set(subscriptionId, []);
            }
            
            this.debouncedCallbacks.delete(subscriptionId);
          } catch (callbackError) {
            performanceMonitor.trackError({
              message: 'Error in debounced callback execution',
              severity: 'medium',
              context: {
                subscriptionId,
                table: subscription?.config.table,
                error: callbackError instanceof Error ? callbackError.message : 'Unknown error'
              }
            });
          }
        }, config.delay);

        this.debouncedCallbacks.set(subscriptionId, timeout);
      } catch (error) {
        performanceMonitor.trackError({
          message: 'Error in realtime subscription callback',
          severity: 'medium',
          context: {
            subscriptionId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    };
  }

  /**
   * Get subscriptions grouped by table
   * @returns Object with table names as keys and subscription counts as values
   */
  private getSubscriptionsByTable(): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const subscription of this.subscriptions.values()) {
      if (subscription.isActive) {
        const table = subscription.config.table;
        result[table] = (result[table] || 0) + 1;
      }
    }
    
    return result;
  }
}

// Export singleton instance
export const realtimeSubscriptionManager = new RealtimeSubscriptionManagerService();

// Auto-optimize connections every 5 minutes
setInterval(() => {
  realtimeSubscriptionManager.optimizeConnections();
}, 5 * 60 * 1000);