/**
 * @file services/storage.ts
 * @description LocalStorage service with cross-tab synchronization
 * @created 2025-10-18
 */

import { STORAGE_KEYS } from '@/constants';

/**
 * Generic storage service for localStorage operations
 */
class StorageService {
  /**
   * Gets an item from localStorage
   * @param key - Storage key
   * @returns Parsed value or null if not found
   */
  getItem<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from localStorage (key: ${key}):`, error);
      return null;
    }
  }

  /**
   * Sets an item in localStorage
   * @param key - Storage key
   * @param value - Value to store
   * @returns True if successful, false otherwise
   */
  setItem<T>(key: string, value: T): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      localStorage.setItem(key, JSON.stringify(value));
      
      // Trigger storage event for cross-tab sync
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: JSON.stringify(value),
          url: window.location.href,
        })
      );
      
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (key: ${key}):`, error);
      return false;
    }
  }

  /**
   * Removes an item from localStorage
   * @param key - Storage key
   */
  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (key: ${key}):`, error);
    }
  }

  /**
   * Clears all items from localStorage
   */
  clear(): void {
    try {
      if (typeof window === 'undefined') return;
      
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Gets the total size of data in localStorage
   * @returns Size in bytes
   */
  getStorageSize(): number {
    try {
      if (typeof window === 'undefined') return 0;
      
      let total = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return total;
    } catch (error) {
      console.error('Error calculating storage size:', error);
      return 0;
    }
  }

  /**
   * Exports all LinkVault data
   * @returns JSON string of all data
   */
  exportData(): string {
    const data = {
      links: this.getItem(STORAGE_KEYS.LINKS),
      folders: this.getItem(STORAGE_KEYS.FOLDERS),
      settings: this.getItem(STORAGE_KEYS.SETTINGS),
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Imports LinkVault data from JSON
   * @param jsonString - JSON string to import
   * @returns True if successful, false otherwise
   */
  importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      
      // Validate data structure
      if (!data.links || !data.folders || !data.settings) {
        throw new Error('Invalid data structure');
      }
      
      // Import data
      this.setItem(STORAGE_KEYS.LINKS, data.links);
      this.setItem(STORAGE_KEYS.FOLDERS, data.folders);
      this.setItem(STORAGE_KEYS.SETTINGS, data.settings);
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const storage = new StorageService();
