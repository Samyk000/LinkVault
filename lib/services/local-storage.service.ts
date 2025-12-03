/**
 * @file lib/services/local-storage.service.ts
 * @description Local storage implementation for free users
 * @created 2025-12-03
 */

import { Link, Folder, AppSettings, Platform } from '@/types';
import { StorageService, STORAGE_KEYS, STORAGE_ERROR_MESSAGES } from './storage.interface';
import { logger } from '@/lib/utils/logger';

/**
 * Generates a UUID v4 for local storage items
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Default settings for new users
 */
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
};

/**
 * LocalStorageService implements StorageService for free users.
 * All data is stored in the browser's localStorage using JSON serialization.
 */
export class LocalStorageService implements StorageService {
  private initialized = false;

  /**
   * Ensures localStorage is available before any operation.
   * Called lazily on first use instead of in constructor to support SSR.
   */
  private ensureInitialized(): void {
    if (this.initialized) return;
    
    if (typeof window === 'undefined') {
      throw new Error('LocalStorageService can only be used in browser environment');
    }
    
    if (!isLocalStorageAvailable()) {
      throw new Error(STORAGE_ERROR_MESSAGES.STORAGE_UNAVAILABLE);
    }
    
    this.initialized = true;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private getStoredLinks(): Link[] {
    this.ensureInitialized();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LINKS);
      if (!data) return [];
      return JSON.parse(data) as Link[];
    } catch (error) {
      logger.error('Error parsing stored links:', error);
      return [];
    }
  }

  private setStoredLinks(links: Link[]): void {
    this.ensureInitialized();
    try {
      localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(links));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(STORAGE_ERROR_MESSAGES.STORAGE_FULL);
      }
      throw error;
    }
  }

  private getStoredFolders(): Folder[] {
    this.ensureInitialized();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
      if (!data) return [];
      return JSON.parse(data) as Folder[];
    } catch (error) {
      logger.error('Error parsing stored folders:', error);
      return [];
    }
  }

  private setStoredFolders(folders: Folder[]): void {
    this.ensureInitialized();
    try {
      localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(STORAGE_ERROR_MESSAGES.STORAGE_FULL);
      }
      throw error;
    }
  }

  private getStoredSettings(): AppSettings | null {
    this.ensureInitialized();
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) return null;
      return JSON.parse(data) as AppSettings;
    } catch (error) {
      logger.error('Error parsing stored settings:', error);
      return null;
    }
  }

  private setStoredSettings(settings: AppSettings): void {
    this.ensureInitialized();
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new Error(STORAGE_ERROR_MESSAGES.STORAGE_FULL);
      }
      throw error;
    }
  }

  // ============================================
  // Links Operations
  // ============================================

  async getLinks(): Promise<Link[]> {
    const links = this.getStoredLinks();
    // Return only non-deleted links, sorted by updatedAt descending
    return links
      .filter(link => link.deletedAt === null)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async addLink(linkData: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link> {
    const now = new Date().toISOString();
    const newLink: Link = {
      ...linkData,
      id: generateUUID(),
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const links = this.getStoredLinks();
    links.push(newLink);
    this.setStoredLinks(links);

    logger.debug('Link added to localStorage:', { id: newLink.id, url: newLink.url });
    return newLink;
  }

  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    const links = this.getStoredLinks();
    const index = links.findIndex(link => link.id === id);

    if (index === -1) {
      throw new Error(STORAGE_ERROR_MESSAGES.LINK_NOT_FOUND);
    }

    const updatedLink: Link = {
      ...links[index],
      ...updates,
      id: links[index].id, // Prevent ID from being changed
      createdAt: links[index].createdAt, // Prevent createdAt from being changed
      updatedAt: new Date().toISOString(),
    };

    links[index] = updatedLink;
    this.setStoredLinks(links);

    logger.debug('Link updated in localStorage:', { id });
    return updatedLink;
  }

  async deleteLink(id: string): Promise<void> {
    const links = this.getStoredLinks();
    const index = links.findIndex(link => link.id === id);

    if (index === -1) {
      throw new Error(STORAGE_ERROR_MESSAGES.LINK_NOT_FOUND);
    }

    links[index] = {
      ...links[index],
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.setStoredLinks(links);
    logger.debug('Link soft deleted in localStorage:', { id });
  }

  async restoreLink(id: string): Promise<void> {
    const links = this.getStoredLinks();
    const index = links.findIndex(link => link.id === id);

    if (index === -1) {
      throw new Error(STORAGE_ERROR_MESSAGES.LINK_NOT_FOUND);
    }

    links[index] = {
      ...links[index],
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    };

    this.setStoredLinks(links);
    logger.debug('Link restored in localStorage:', { id });
  }

  async permanentlyDeleteLink(id: string): Promise<void> {
    const links = this.getStoredLinks();
    const filteredLinks = links.filter(link => link.id !== id);

    if (filteredLinks.length === links.length) {
      throw new Error(STORAGE_ERROR_MESSAGES.LINK_NOT_FOUND);
    }

    this.setStoredLinks(filteredLinks);
    logger.debug('Link permanently deleted from localStorage:', { id });
  }

  async bulkDeleteLinks(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const links = this.getStoredLinks();
    const now = new Date().toISOString();

    const updatedLinks = links.map(link => {
      if (ids.includes(link.id)) {
        return { ...link, deletedAt: now, updatedAt: now };
      }
      return link;
    });

    this.setStoredLinks(updatedLinks);
    logger.debug('Links bulk deleted in localStorage:', { count: ids.length });
  }

  async bulkRestoreLinks(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const links = this.getStoredLinks();
    const now = new Date().toISOString();

    const updatedLinks = links.map(link => {
      if (ids.includes(link.id)) {
        return { ...link, deletedAt: null, updatedAt: now };
      }
      return link;
    });

    this.setStoredLinks(updatedLinks);
    logger.debug('Links bulk restored in localStorage:', { count: ids.length });
  }

  async bulkMoveLinks(ids: string[], folderId: string | null): Promise<void> {
    if (ids.length === 0) return;

    const links = this.getStoredLinks();
    const now = new Date().toISOString();

    const updatedLinks = links.map(link => {
      if (ids.includes(link.id)) {
        return { ...link, folderId, updatedAt: now };
      }
      return link;
    });

    this.setStoredLinks(updatedLinks);
    logger.debug('Links bulk moved in localStorage:', { count: ids.length, folderId });
  }

  async emptyTrash(): Promise<void> {
    const links = this.getStoredLinks();
    const activeLinks = links.filter(link => link.deletedAt === null);
    this.setStoredLinks(activeLinks);
    logger.debug('Trash emptied in localStorage');
  }

  async restoreAllFromTrash(): Promise<void> {
    const links = this.getStoredLinks();
    const now = new Date().toISOString();

    const updatedLinks = links.map(link => {
      if (link.deletedAt !== null) {
        return { ...link, deletedAt: null, updatedAt: now };
      }
      return link;
    });

    this.setStoredLinks(updatedLinks);
    logger.debug('All links restored from trash in localStorage');
  }

  // ============================================
  // Folders Operations
  // ============================================

  async getFolders(): Promise<Folder[]> {
    const folders = this.getStoredFolders();
    return folders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async addFolder(folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    const now = new Date().toISOString();
    const newFolder: Folder = {
      ...folderData,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };

    const folders = this.getStoredFolders();
    
    // Check for duplicate folder names
    const existingFolder = folders.find(f => f.name.toLowerCase() === newFolder.name.toLowerCase());
    if (existingFolder) {
      throw new Error('A folder with this name already exists');
    }

    folders.push(newFolder);
    this.setStoredFolders(folders);

    logger.debug('Folder added to localStorage:', { id: newFolder.id, name: newFolder.name });
    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    const folders = this.getStoredFolders();
    const index = folders.findIndex(folder => folder.id === id);

    if (index === -1) {
      throw new Error(STORAGE_ERROR_MESSAGES.FOLDER_NOT_FOUND);
    }

    const updatedFolder: Folder = {
      ...folders[index],
      ...updates,
      id: folders[index].id, // Prevent ID from being changed
      createdAt: folders[index].createdAt, // Prevent createdAt from being changed
      updatedAt: new Date().toISOString(),
    };

    folders[index] = updatedFolder;
    this.setStoredFolders(folders);

    logger.debug('Folder updated in localStorage:', { id });
    return updatedFolder;
  }

  async deleteFolder(id: string): Promise<void> {
    const folders = this.getStoredFolders();
    const filteredFolders = folders.filter(folder => folder.id !== id);

    if (filteredFolders.length === folders.length) {
      throw new Error(STORAGE_ERROR_MESSAGES.FOLDER_NOT_FOUND);
    }

    // Move all links in this folder to root (folderId = null)
    const links = this.getStoredLinks();
    const now = new Date().toISOString();
    const updatedLinks = links.map(link => {
      if (link.folderId === id) {
        return { ...link, folderId: null, updatedAt: now };
      }
      return link;
    });

    this.setStoredFolders(filteredFolders);
    this.setStoredLinks(updatedLinks);

    logger.debug('Folder deleted from localStorage:', { id });
  }

  // ============================================
  // Settings Operations
  // ============================================

  async getSettings(): Promise<AppSettings | null> {
    return this.getStoredSettings();
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const currentSettings = this.getStoredSettings() || DEFAULT_SETTINGS;
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...settings,
    };

    this.setStoredSettings(updatedSettings);
    logger.debug('Settings updated in localStorage');
    return updatedSettings;
  }

  // ============================================
  // Export/Import Operations
  // ============================================

  async exportData(): Promise<string> {
    const data = {
      links: this.getStoredLinks(),
      folders: this.getStoredFolders(),
      settings: this.getStoredSettings(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Validate and import links
      if (Array.isArray(data.links)) {
        const validLinks = data.links.filter((link: unknown) => {
          return link && typeof link === 'object' && 'id' in link && 'url' in link;
        });
        this.setStoredLinks(validLinks);
      }

      // Validate and import folders
      if (Array.isArray(data.folders)) {
        const validFolders = data.folders.filter((folder: unknown) => {
          return folder && typeof folder === 'object' && 'id' in folder && 'name' in folder;
        });
        this.setStoredFolders(validFolders);
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        this.setStoredSettings(data.settings);
      }

      logger.info('Data imported successfully to localStorage');
      return true;
    } catch (error) {
      logger.error('Error importing data to localStorage:', error);
      throw new Error(STORAGE_ERROR_MESSAGES.PARSE_ERROR);
    }
  }
}

// Lazy singleton instance - only created when first accessed in browser
let _localStorageServiceInstance: LocalStorageService | null = null;

/**
 * Gets the LocalStorageService singleton instance.
 * Creates the instance lazily on first access to support SSR.
 */
export function getLocalStorageServiceInstance(): LocalStorageService {
  if (!_localStorageServiceInstance) {
    _localStorageServiceInstance = new LocalStorageService();
  }
  return _localStorageServiceInstance;
}

// Export a proxy object that lazily accesses the singleton
// This allows importing without triggering instantiation during SSR
export const localStorageService: StorageService = {
  getLinks: () => getLocalStorageServiceInstance().getLinks(),
  addLink: (link) => getLocalStorageServiceInstance().addLink(link),
  updateLink: (id, updates) => getLocalStorageServiceInstance().updateLink(id, updates),
  deleteLink: (id) => getLocalStorageServiceInstance().deleteLink(id),
  restoreLink: (id) => getLocalStorageServiceInstance().restoreLink(id),
  permanentlyDeleteLink: (id) => getLocalStorageServiceInstance().permanentlyDeleteLink(id),
  bulkDeleteLinks: (ids) => getLocalStorageServiceInstance().bulkDeleteLinks(ids),
  bulkRestoreLinks: (ids) => getLocalStorageServiceInstance().bulkRestoreLinks(ids),
  bulkMoveLinks: (ids, folderId) => getLocalStorageServiceInstance().bulkMoveLinks(ids, folderId),
  emptyTrash: () => getLocalStorageServiceInstance().emptyTrash(),
  restoreAllFromTrash: () => getLocalStorageServiceInstance().restoreAllFromTrash(),
  getFolders: () => getLocalStorageServiceInstance().getFolders(),
  addFolder: (folder) => getLocalStorageServiceInstance().addFolder(folder),
  updateFolder: (id, updates) => getLocalStorageServiceInstance().updateFolder(id, updates),
  deleteFolder: (id) => getLocalStorageServiceInstance().deleteFolder(id),
  getSettings: () => getLocalStorageServiceInstance().getSettings(),
  updateSettings: (settings) => getLocalStorageServiceInstance().updateSettings(settings),
  exportData: () => getLocalStorageServiceInstance().exportData(),
  importData: (data) => getLocalStorageServiceInstance().importData(data),
};
