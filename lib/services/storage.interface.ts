/**
 * @file lib/services/storage.interface.ts
 * @description Unified storage interface for both local and cloud storage
 * @created 2025-12-03
 */

import { Link, Folder, AppSettings } from '@/types';

/**
 * Storage service interface that abstracts the underlying storage mechanism.
 * Both LocalStorageService (for free users) and SupabaseStorageService (for authenticated users)
 * implement this interface, allowing seamless switching between storage backends.
 */
export interface StorageService {
  // ============================================
  // Links Operations
  // ============================================
  
  /**
   * Retrieves all links for the current user
   * @returns Promise resolving to array of links
   */
  getLinks(): Promise<Link[]>;
  
  /**
   * Adds a new link
   * @param link - Link data without auto-generated fields
   * @returns Promise resolving to the created link with all fields
   */
  addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link>;
  
  /**
   * Updates an existing link
   * @param id - Link ID to update
   * @param updates - Partial link data to update
   * @returns Promise resolving to the updated link
   */
  updateLink(id: string, updates: Partial<Link>): Promise<Link>;
  
  /**
   * Soft deletes a link (moves to trash)
   * @param id - Link ID to delete
   */
  deleteLink(id: string): Promise<void>;
  
  /**
   * Restores a link from trash
   * @param id - Link ID to restore
   */
  restoreLink(id: string): Promise<void>;
  
  /**
   * Permanently deletes a link
   * @param id - Link ID to permanently delete
   */
  permanentlyDeleteLink(id: string): Promise<void>;
  
  /**
   * Bulk soft deletes multiple links
   * @param ids - Array of link IDs to delete
   */
  bulkDeleteLinks(ids: string[]): Promise<void>;
  
  /**
   * Bulk restores multiple links from trash
   * @param ids - Array of link IDs to restore
   */
  bulkRestoreLinks(ids: string[]): Promise<void>;
  
  /**
   * Bulk moves multiple links to a folder
   * @param ids - Array of link IDs to move
   * @param folderId - Target folder ID (null for root)
   */
  bulkMoveLinks(ids: string[], folderId: string | null): Promise<void>;
  
  /**
   * Permanently deletes all trashed links
   */
  emptyTrash(): Promise<void>;
  
  /**
   * Restores all links from trash
   */
  restoreAllFromTrash(): Promise<void>;

  // ============================================
  // Folders Operations
  // ============================================
  
  /**
   * Retrieves all folders for the current user
   * @returns Promise resolving to array of folders
   */
  getFolders(): Promise<Folder[]>;
  
  /**
   * Adds a new folder
   * @param folder - Folder data without auto-generated fields
   * @returns Promise resolving to the created folder with all fields
   */
  addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder>;
  
  /**
   * Updates an existing folder
   * @param id - Folder ID to update
   * @param updates - Partial folder data to update
   * @returns Promise resolving to the updated folder
   */
  updateFolder(id: string, updates: Partial<Folder>): Promise<Folder>;
  
  /**
   * Deletes a folder
   * @param id - Folder ID to delete
   */
  deleteFolder(id: string): Promise<void>;

  // ============================================
  // Settings Operations
  // ============================================
  
  /**
   * Retrieves user settings
   * @returns Promise resolving to app settings or null if not set
   */
  getSettings(): Promise<AppSettings | null>;
  
  /**
   * Updates user settings
   * @param settings - Partial settings to update
   * @returns Promise resolving to the updated settings
   */
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // ============================================
  // Export/Import Operations
  // ============================================
  
  /**
   * Exports all user data as a JSON string
   * @returns Promise resolving to JSON string of all data
   */
  exportData(): Promise<string>;
  
  /**
   * Imports data from a JSON string
   * @param data - JSON string containing data to import
   * @returns Promise resolving to true if import was successful
   */
  importData(data: string): Promise<boolean>;
}

/**
 * Storage keys used for localStorage
 */
export const STORAGE_KEYS = {
  FREE_USER_FLAG: 'linksvault_free_user',
  LINKS: 'linksvault_links',
  FOLDERS: 'linksvault_folders',
  SETTINGS: 'linksvault_settings',
} as const;

/**
 * Error messages for storage operations
 */
export const STORAGE_ERROR_MESSAGES = {
  STORAGE_FULL: 'Local storage is full. Consider removing some links or upgrading to a full account.',
  STORAGE_UNAVAILABLE: 'Local storage is not available in your browser. Please enable it or use a full account.',
  DATA_CORRUPTED: 'Some data could not be loaded. Would you like to reset to a clean state?',
  PARSE_ERROR: 'Failed to parse stored data. Data may be corrupted.',
  LINK_NOT_FOUND: 'Link not found',
  FOLDER_NOT_FOUND: 'Folder not found',
} as const;
