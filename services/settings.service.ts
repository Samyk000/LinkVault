/**
 * @file services/settings.service.ts
 * @description User settings service
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { AppSettings } from '@/types';
import { sanitizeSettingsData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';

const supabase = createClient();

/**
 * Settings service
 * Handles all user settings-related database operations
 */
export const settingsService = {
  /**
   * Gets user settings from the database
   * @returns {Promise<AppSettings | null>} User settings or null if not found
   * @throws {Error} When fetching settings fails
   */
  async getSettings(): Promise<AppSettings | null> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - settings not found, return default
        return null;
      }
      
      logger.error('Failed to fetch user settings:', {
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }
    
    return data as AppSettings;
  },
  
  /**
   * Updates user settings in the database
   * @param {Partial<AppSettings>} updates - Settings to update
   * @returns {Promise<AppSettings>} Updated settings
   * @throws {Error} When updating settings fails
   */
  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const sanitizedUpdates = sanitizeSettingsData(updates);
    
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    // Use upsert to either insert new settings or update existing ones
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        ...sanitizedUpdates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to update user settings:', {
        error: error.message,
        updates: sanitizedUpdates,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update settings: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when updating settings');
    }
    
    logger.debug('User settings updated successfully:', { userId, updates: sanitizedUpdates });
    return data as AppSettings;
  },
  
  /**
   * Creates default settings for a new user
   * @param {string} userId - User ID
   * @returns {Promise<AppSettings>} Default settings
   * @throws {Error} When creating default settings fails
   */
  async createDefaultSettings(userId: string): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      theme: 'system',
      viewMode: 'grid',
      // Add other default settings as needed
    };
    
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        ...defaultSettings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to create default settings:', {
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to create default settings: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when creating default settings');
    }
    
    logger.info('Default settings created for new user:', { userId });
    return data as AppSettings;
  },
  
  /**
   * Deletes user settings (useful for account cleanup)
   * @returns {Promise<void>}
   * @throws {Error} When deleting settings fails
   */
  async deleteSettings(): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Failed to delete user settings:', {
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to delete settings: ${error.message}`);
    }
    
    logger.debug('User settings deleted successfully:', { userId });
  },
  
  /**
   * Gets settings for a specific user (admin function)
   * @param {string} userId - User ID to fetch settings for
   * @returns {Promise<AppSettings | null>} User settings or null if not found
   * @throws {Error} When fetching settings fails
   */
  async getSettingsForUser(userId: string): Promise<AppSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - settings not found
        return null;
      }
      
      logger.error('Failed to fetch settings for user:', {
        error: error.message,
        targetUserId: userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch settings for user: ${error.message}`);
    }
    
    return data as AppSettings;
  },
  
  /**
   * Gets all user settings (admin function - should have proper authorization)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results
   * @param {string} options.offset - Offset for pagination
   * @returns {Promise<AppSettings[]>} Array of user settings
   * @throws {Error} When fetching all settings fails
   */
  async getAllSettings(options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<AppSettings[]> {
    let query = supabase
      .from('user_settings')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Failed to fetch all user settings:', {
        error: error.message,
        options,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch all settings: ${error.message}`);
    }
    
    return data || [];
  },
  
  /**
   * Resets user settings to default values
   * @returns {Promise<AppSettings>} Reset settings
   * @throws {Error} When resetting settings fails
   */
  async resetToDefaults(): Promise<AppSettings> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    // Delete existing settings and create new ones with defaults
    await this.deleteSettings();
    return await this.createDefaultSettings(userId);
  },
  
  /**
   * Validates settings data before saving
   * @param {Partial<AppSettings>} settings - Settings to validate
   * @returns {{ isValid: boolean; errors: string[] }} Validation result
   */
  validateSettings(settings: Partial<AppSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate theme
    if (settings.theme && !['light', 'dark', 'system'].includes(settings.theme)) {
      errors.push('Theme must be "light", "dark", or "system"');
    }
    
    // Validate view mode
    if (settings.viewMode && !['grid', 'list'].includes(settings.viewMode)) {
      errors.push('View mode must be "grid" or "list"');
    }
    
    // Add more validation rules as needed
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },
  
  /**
   * Gets the count of users with specific settings
   * @param {Object} criteria - Settings criteria to count
   * @returns {Promise<number>} Number of users matching criteria
   * @throws {Error} When counting fails
   */
  async countUsersBySettings(criteria: Partial<AppSettings>): Promise<number> {
    let query = supabase
      .from('user_settings')
      .select('*', { count: 'exact', head: true });
    
    // Apply criteria filters
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
    
    const { count, error } = await query;
    
    if (error) {
      logger.error('Failed to count users by settings:', {
        error: error.message,
        criteria,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to count users: ${error.message}`);
    }
    
    return count || 0;
  },
};

export type SettingsService = typeof settingsService;