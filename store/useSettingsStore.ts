/**
 * @file store/useSettingsStore.ts
 * @description User settings state management
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { create } from 'zustand';
import { AppSettings } from '@/types';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { sanitizeSettingsData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';

interface SettingsState {
  // State
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSettings: (settings: AppSettings) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Initial State
  settings: {
    theme: 'light', // Changed from 'system' to 'light' for better default UX
    viewMode: 'grid',
  },
  isLoading: false,
  error: null,

  /**
   * Sets the settings directly (for initialization)
   * @param {AppSettings} settings - Settings to set
   */
  setSettings: (settings) => set({ settings }),

  /**
   * Loads user settings from database
   * @returns {Promise<void>}
   * @throws {Error} When settings load fails
   */
  loadSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const settings = await supabaseDatabaseService.getSettings();

      if (settings) {
        set({
          settings,
          isLoading: false,
          error: null
        });
      } else {
        // Use default settings if none exist
        set({
          isLoading: false,
          error: null
        });
      }

      logger.debug('Settings loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';

      logger.error('Error loading settings:', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      set({
        isLoading: false,
        error: errorMessage
      });

      throw error;
    }
  },

  /**
   * Updates user settings with sanitization and validation
   * @param {Partial<AppSettings>} updates - Settings to update
   * @returns {Promise<void>}
   * @throws {Error} When settings update fails
   */
  updateSettings: async (updates) => {
    const currentSettings = get().settings;

    set({ isLoading: true, error: null });

    try {
      // CRITICAL: Sanitize input data to prevent XSS
      const sanitizedUpdates = sanitizeSettingsData(updates);

      // Validate input settings
      if (!sanitizedUpdates || typeof sanitizedUpdates !== 'object') {
        throw new Error('Invalid settings object provided');
      }

      // Optimistically update UI with validation
      const updatedSettings = { ...currentSettings, ...sanitizedUpdates };
      set({ settings: updatedSettings });

      // ENHANCED: Add timeout protection to prevent hanging updates
      const updatePromise = supabaseDatabaseService.updateSettings(sanitizedUpdates);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Update settings timeout - please check your connection and try again')), 8000)
      );

      await Promise.race([updatePromise, timeoutPromise]);

      logger.debug('Settings updated successfully', { updates: sanitizedUpdates });
    } catch (error) {
      // Revert optimistic update on error
      set({ settings: currentSettings });

      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';

      logger.error('Error updating settings:', {
        newSettings: updates,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      set({
        isLoading: false,
        error: errorMessage
      });

      // Re-throw for component-level error handling
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Clears any settings errors
   */
  clearError: () => {
    set({ error: null });
  },
}));