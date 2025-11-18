/**
 * @file lib/services/realtime-database.service.ts
 * @description Real-time subscription management for database changes
 * @created 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { Link, Folder } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { performanceMonitor } from './performance-monitor.service';
import { logger } from '@/lib/utils/logger';

/**
 * Real-time database subscription service
 * Manages WebSocket connections for live data updates
 */
export class RealtimeDatabaseService {
  private supabase: SupabaseClient;
  private activeChannels: Map<string, ReturnType<SupabaseClient['channel']>>;

  constructor() {
    this.supabase = createClient();
    this.activeChannels = new Map();
  }

  /**
   * Subscribe to link changes
   * @param callback - Callback function for changes
   * @returns Unsubscribe function
   */
  subscribeToLinks(callback: (links: Link[]) => void): () => void {
    const channelName = 'links_changes';
    
    // Remove existing channel if it exists
    this.removeChannel(channelName);

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    let unsubscribeRequested = false;

    const createSubscription = () => {
      if (unsubscribeRequested) return;
      
      const channel = this.supabase
        .channel(channelName, {
          config: {
            presence: {
              key: 'user_id',
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'links',
          },
          async (payload) => {
            try {
              // Import links service dynamically to avoid circular dependencies
              const { linksDatabaseService } = await import('./links-database.service');
              
              // Refetch all links when any change occurs
              const links = await linksDatabaseService.getLinks();
              
              // Add small delay to prevent overwhelming the UI
              setTimeout(() => {
                callback(links);
              }, 50);

            } catch (error) {
              logger.error('Error handling realtime link changes:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                eventType: payload.eventType,
                table: payload.table,
                timestamp: new Date().toISOString()
              });
              performanceMonitor.trackError({
                message: `Realtime link change error: ${(error as Error).message}`,
                severity: 'medium',
                context: { event: payload.eventType, table: 'links' }
              });
            }
          }
        )
        .on('system', {}, (payload) => {
          if (payload.status === 'CHANNEL_ERROR') {
            logger.error('Realtime channel error for links:', payload);
            performanceMonitor.trackError({
              message: 'Realtime channel error',
              severity: 'high',
              context: { channel: 'links', payload }
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Successfully subscribed to links changes');
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Failed to subscribe to links changes');
            
            // Retry connection with exponential backoff
            if (retryCount < maxRetries && !unsubscribeRequested) {
              retryCount++;
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              logger.debug(`Retrying links subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              
              setTimeout(() => {
                if (this.activeChannels.has(channelName) && !unsubscribeRequested) {
                  this.removeChannel(channelName);
                  createSubscription();
                }
              }, delay);
            } else {
              logger.error('Max retries reached for links subscription');
              performanceMonitor.trackError({
                message: 'Links subscription failed after max retries',
                severity: 'high',
                context: { maxRetries, channelName }
              });
            }
          } else if (status === 'CLOSED') {
            logger.debug('Links subscription closed');
          }
        });

      this.activeChannels.set(channelName, channel);
    };

    createSubscription();

    return () => {
      unsubscribeRequested = true;
      this.removeChannel(channelName);
    };
  }

  /**
   * Subscribe to folder changes
   * @param callback - Callback function for changes
   * @returns Unsubscribe function
   */
  subscribeToFolders(callback: (folders: Folder[]) => void): () => void {
    const channelName = 'folders_changes';

    // Remove existing channel if it exists
    this.removeChannel(channelName);

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    let unsubscribeRequested = false;

    const createSubscription = () => {
      if (unsubscribeRequested) return;
      
      const channel = this.supabase
        .channel(channelName, {
          config: {
            presence: {
              key: 'user_id',
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'folders',
          },
          async (payload) => {
            try {
              // Import folders service dynamically to avoid circular dependencies
              const { foldersDatabaseService } = await import('./folders-database.service');
              
              // Refetch all folders when any change occurs
              const folders = await foldersDatabaseService.getFolders();
              callback(folders);
            } catch (error) {
              logger.error('Error handling realtime folder changes:', error);
              performanceMonitor.trackError({
                message: `Realtime folder change error: ${(error as Error).message}`,
                severity: 'medium',
                context: { event: payload.eventType, table: 'folders' }
              });
            }
          }
        )
        .on('system', {}, (payload) => {
          if (payload.status === 'CHANNEL_ERROR') {
            logger.error('Realtime channel error for folders:', payload);
            performanceMonitor.trackError({
              message: 'Realtime channel error',
              severity: 'high',
              context: { channel: 'folders', payload }
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Successfully subscribed to folders changes');
            retryCount = 0;
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Failed to subscribe to folders changes');
            
            // Retry connection with exponential backoff
            if (retryCount < maxRetries && !unsubscribeRequested) {
              retryCount++;
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              logger.debug(`Retrying folders subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
              
              setTimeout(() => {
                if (this.activeChannels.has(channelName) && !unsubscribeRequested) {
                  this.removeChannel(channelName);
                  createSubscription();
                }
              }, delay);
            } else {
              logger.error('Max retries reached for folders subscription');
              performanceMonitor.trackError({
                message: 'Folders subscription failed after max retries',
                severity: 'high',
                context: { maxRetries, channelName }
              });
            }
          } else if (status === 'CLOSED') {
            logger.debug('Folders subscription closed');
          }
        });

      this.activeChannels.set(channelName, channel);
    };

    createSubscription();

    return () => {
      unsubscribeRequested = true;
      this.removeChannel(channelName);
    };
  }

  /**
   * Remove a specific channel
   * @param channelName - Name of the channel to remove
   */
  private removeChannel(channelName: string): void {
    if (this.activeChannels.has(channelName)) {
      const channel = this.activeChannels.get(channelName);
      try {
        if (channel) {
          this.supabase.removeChannel(channel);
        }
      } catch (error) {
        logger.warn(`Error removing channel ${channelName}:`, error);
      }
      this.activeChannels.delete(channelName);
    }
  }

  /**
   * Unsubscribe from all active channels
   */
  unsubscribeAll(): void {
    try {
      logger.debug(`Unsubscribing from ${this.activeChannels.size} active channels`);
      
      for (const [channelName, channel] of this.activeChannels.entries()) {
        try {
          this.supabase.removeChannel(channel);
          logger.debug(`Removed channel: ${channelName}`);
        } catch (error) {
          logger.warn(`Error removing channel ${channelName}:`, error);
        }
      }
      
      this.activeChannels.clear();
    } catch (error) {
      logger.error('Error unsubscribing from all channels:', error);
    }
  }
}

// Export singleton instance
export const realtimeDatabaseService = new RealtimeDatabaseService();