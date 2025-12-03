/**
 * @file lib/services/storage-provider.ts
 * @description Factory for selecting the appropriate storage service based on user type
 * @created 2025-12-03
 */

import { StorageService, STORAGE_KEYS } from './storage.interface';
import { localStorageService } from './local-storage.service';
import { SupabaseStorageService, supabaseStorageService } from './supabase-storage.service';

/**
 * Checks if the current user is a free user (using local storage)
 * @returns true if the user is in free user mode
 */
export function isFreeUser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    return localStorage.getItem(STORAGE_KEYS.FREE_USER_FLAG) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the free user flag in localStorage and as a cookie for middleware access
 * @param value - true to enable free user mode, false to disable
 */
export function setFreeUserFlag(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    if (value) {
      localStorage.setItem(STORAGE_KEYS.FREE_USER_FLAG, 'true');
      // Also set a cookie for middleware access
      document.cookie = `linksvault_free_user=true;path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    } else {
      localStorage.removeItem(STORAGE_KEYS.FREE_USER_FLAG);
      // Remove the cookie
      document.cookie = 'linksvault_free_user=;path=/;max-age=0;SameSite=Lax';
    }
  } catch (error) {
    console.error('Error setting free user flag:', error);
  }
}

/**
 * Gets the appropriate storage service based on user type.
 * Returns LocalStorageService for free users and SupabaseStorageService for authenticated users.
 * 
 * @returns The appropriate StorageService implementation
 */
export function getStorageService(): StorageService {
  if (isFreeUser()) {
    return localStorageService;
  }
  
  return supabaseStorageService;
}

/**
 * Storage provider singleton that can be used throughout the application.
 * This provides a consistent way to access storage operations regardless of user type.
 */
export const storageProvider = {
  /**
   * Gets the current storage service
   */
  getService: getStorageService,
  
  /**
   * Checks if the current user is a free user
   */
  isFreeUser,
  
  /**
   * Sets the free user flag
   */
  setFreeUserFlag,
  
  /**
   * Gets the LocalStorageService instance (for direct access when needed)
   */
  getLocalStorageService: (): StorageService => localStorageService,
  
  /**
   * Gets the SupabaseStorageService instance (for direct access when needed)
   */
  getSupabaseStorageService: (): SupabaseStorageService => supabaseStorageService,
};

export default storageProvider;
