/**
 * @file lib/services/settings-database.service.ts
 * @description Database operations specifically for user settings
 * @created 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { AppSettings } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { globalCache, CACHE_CONFIGS } from './cache-manager';
import { isAppSettings } from '@/lib/utils/type-guards';
import { logger } from '@/lib/utils/logger';
import {
  DatabaseError,
  AuthenticationError,
} from '@/lib/errors/app-error';

/**
 * Settings-specific database operations
 * Focused on user settings management with caching
 */
export class SettingsDatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Generate cache key for user-specific data
   */
  private getCacheKey(userId: string): string {
    return `${userId}:settings:get`;
  }

  /**
   * Invalidate settings-related caches
   */
  private invalidateUserCache(userId: string): void {
    globalCache.invalidateByTags(['settings', `user:${userId}`]);
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<AppSettings | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const cacheKey = this.getCacheKey(user.id);

    // Check cache first
    const cached = globalCache.get<AppSettings | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const queryPromise = this.supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Settings query timeout')), 5000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        if (error.code === 'PGRST116') return null; // Settings don't exist yet
        throw error;
      }

      if (!data) {
        return null;
      }

      const settings: AppSettings = {
        theme: data.theme as 'light' | 'dark' | 'system',
        viewMode: data.view_mode as 'grid' | 'list',
      };

      if (!isAppSettings(settings)) {
        logger.warn('Invalid settings data received:', data);
        return null;
      }

      // Cache the result
      globalCache.set(cacheKey, settings, { ...CACHE_CONFIGS.USER_SETTINGS, tags: [...CACHE_CONFIGS.USER_SETTINGS.tags] });

      return settings;
    } catch (error) {
      logger.error('Error fetching settings:', error);
      return null;
    }
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    let userId: string | undefined;
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }
      userId = user.id;

      this.invalidateUserCache(user.id);

      const updateData: {
        user_id: string;
        theme?: string;
        view_mode?: string;
      } = {
        user_id: user.id,
      };
      
      if (settings.theme !== undefined) updateData.theme = settings.theme;
      if (settings.viewMode !== undefined) updateData.view_mode = settings.viewMode;

      // Use proper upsert with conflict resolution
      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert(updateData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        // If still getting constraint error, try update instead
        if (error.code === '23505') {
          const { data: updateDataResult, error: updateError } = await this.supabase
            .from('user_settings')
            .update({
              theme: settings.theme,
              view_mode: settings.viewMode,
            })
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) {
            throw new DatabaseError('Failed to update settings', { userId: user.id }, updateError as Error);
          }
          if (!updateDataResult) {
            throw new DatabaseError('Failed to update settings - no data returned', { userId: user.id });
          }

          const result: AppSettings = {
            theme: updateDataResult.theme as 'light' | 'dark' | 'system',
            viewMode: updateDataResult.view_mode as 'grid' | 'list',
          };
          
          if (!isAppSettings(result)) {
            throw new DatabaseError('Invalid settings data received', { userId: user.id });
          }
          
          return result;
        }
        throw new DatabaseError('Failed to update settings', { userId: user.id }, error as Error);
      }
      
      if (!data) {
        throw new DatabaseError('Failed to update settings - no data returned', { userId: user.id });
      }

      const result: AppSettings = {
        theme: data.theme as 'light' | 'dark' | 'system',
        viewMode: data.view_mode as 'grid' | 'list',
      };
      
      if (!isAppSettings(result)) {
        throw new DatabaseError('Invalid settings data received', { userId: user.id });
      }
      
      return result;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update settings', { userId: userId || 'unknown' }, error as Error);
    }
  }

  /**
   * Delete user settings
   */
  async deleteUserSettings(): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    
    // Clear cache after mutation
    this.invalidateUserCache(user.id);
  }
}

// Export singleton instance
export const settingsDatabaseService = new SettingsDatabaseService();