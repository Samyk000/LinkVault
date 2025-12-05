/**
 * @file lib/services/guest-storage.service.ts
 * @description Guest mode storage service for local-only data persistence
 * @created 2025-12-05
 */

import { GUEST_STORAGE_KEYS } from '@/constants';
import { Link, Folder, GuestSession } from '@/types';
import { logger } from '@/lib/utils/logger';

/**
 * Guest Storage Service
 * Handles all data operations for guest mode using localStorage
 * Mirrors the interface of database services for seamless switching
 */
class GuestStorageService {
  /**
   * Check if guest mode is currently active
   */
  isGuestMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION);
      if (!sessionData) return false;
      
      const session: GuestSession = JSON.parse(sessionData);
      return session.isActive === true;
    } catch (error) {
      logger.error('Error checking guest mode status:', error);
      return false;
    }
  }

  /**
   * Activate guest mode and initialize session
   */
  activateGuestMode(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const now = new Date().toISOString();
      const session: GuestSession = {
        isActive: true,
        activatedAt: now,
        lastAccessedAt: now,
      };
      
      localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(session));
      
      // Set a cookie for middleware to detect guest mode
      document.cookie = 'guest_mode=true; path=/; max-age=31536000; SameSite=Lax';
      
      // Initialize empty data stores if they don't exist
      if (!localStorage.getItem(GUEST_STORAGE_KEYS.LINKS)) {
        localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify([]));
      }
      if (!localStorage.getItem(GUEST_STORAGE_KEYS.FOLDERS)) {
        localStorage.setItem(GUEST_STORAGE_KEYS.FOLDERS, JSON.stringify([]));
      }
      
      logger.info('Guest mode activated');
    } catch (error) {
      logger.error('Error activating guest mode:', error);
      throw error;
    }
  }


  /**
   * Deactivate guest mode (keeps data for potential re-activation)
   */
  deactivateGuestMode(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION);
      if (sessionData) {
        const session: GuestSession = JSON.parse(sessionData);
        session.isActive = false;
        localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
      
      // Clear the guest mode cookie so middleware doesn't allow access
      document.cookie = 'guest_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      logger.info('Guest mode deactivated');
    } catch (error) {
      logger.error('Error deactivating guest mode:', error);
    }
  }

  /**
   * Clear all guest data from localStorage (used on logout)
   */
  clearAllGuestData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(GUEST_STORAGE_KEYS.SESSION);
      localStorage.removeItem(GUEST_STORAGE_KEYS.LINKS);
      localStorage.removeItem(GUEST_STORAGE_KEYS.FOLDERS);
      localStorage.removeItem(GUEST_STORAGE_KEYS.SETTINGS);
      
      // Clear the guest mode cookie
      document.cookie = 'guest_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      logger.info('All guest data cleared');
    } catch (error) {
      logger.error('Error clearing guest data:', error);
    }
  }

  /**
   * Update last accessed timestamp for session
   */
  updateLastAccessed(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION);
      if (sessionData) {
        const session: GuestSession = JSON.parse(sessionData);
        session.lastAccessedAt = new Date().toISOString();
        localStorage.setItem(GUEST_STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
    } catch (error) {
      logger.error('Error updating last accessed:', error);
    }
  }

  /**
   * Get current guest session data
   */
  getSession(): GuestSession | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const sessionData = localStorage.getItem(GUEST_STORAGE_KEYS.SESSION);
      if (!sessionData) return null;
      
      return JSON.parse(sessionData);
    } catch (error) {
      logger.error('Error getting guest session:', error);
      return null;
    }
  }

  // ============================================
  // Link Operations
  // ============================================

  /**
   * Get all links from guest storage
   */
  async getLinks(): Promise<Link[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const linksData = localStorage.getItem(GUEST_STORAGE_KEYS.LINKS);
      if (!linksData) return [];
      
      const links: Link[] = JSON.parse(linksData);
      // Filter out soft-deleted links for normal retrieval
      return links.filter(link => !link.deletedAt);
    } catch (error) {
      logger.error('Error getting guest links:', error);
      return [];
    }
  }

  /**
   * Get all links including deleted (for trash view)
   */
  async getAllLinksIncludingDeleted(): Promise<Link[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const linksData = localStorage.getItem(GUEST_STORAGE_KEYS.LINKS);
      if (!linksData) return [];
      
      return JSON.parse(linksData);
    } catch (error) {
      logger.error('Error getting all guest links:', error);
      return [];
    }
  }

  /**
   * Add a new link to guest storage
   */
  async addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot add link: window is undefined');
    }
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const now = new Date().toISOString();
      
      const newLink: Link = {
        ...link,
        id: `guest_link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      
      links.push(newLink);
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(links));
      
      this.updateLastAccessed();
      return newLink;
    } catch (error) {
      logger.error('Error adding guest link:', error);
      throw error;
    }
  }


  /**
   * Update an existing link in guest storage
   */
  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update link: window is undefined');
    }
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const index = links.findIndex(link => link.id === id);
      
      if (index === -1) {
        throw new Error(`Link not found: ${id}`);
      }
      
      const updatedLink: Link = {
        ...links[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      links[index] = updatedLink;
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(links));
      
      this.updateLastAccessed();
      return updatedLink;
    } catch (error) {
      logger.error('Error updating guest link:', error);
      throw error;
    }
  }

  /**
   * Soft delete a link (move to trash)
   */
  async deleteLink(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      await this.updateLink(id, { deletedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('Error deleting guest link:', error);
      throw error;
    }
  }

  /**
   * Restore a link from trash
   */
  async restoreLink(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      await this.updateLink(id, { deletedAt: null });
    } catch (error) {
      logger.error('Error restoring guest link:', error);
      throw error;
    }
  }

  /**
   * Permanently delete a link
   */
  async permanentlyDeleteLink(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const filteredLinks = links.filter(link => link.id !== id);
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(filteredLinks));
      
      this.updateLastAccessed();
    } catch (error) {
      logger.error('Error permanently deleting guest link:', error);
      throw error;
    }
  }

  /**
   * Bulk update multiple links
   */
  async bulkUpdateLinks(ids: string[], updates: Partial<Link>): Promise<Link[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const now = new Date().toISOString();
      const updatedLinks: Link[] = [];
      
      for (let i = 0; i < links.length; i++) {
        if (ids.includes(links[i].id)) {
          links[i] = { ...links[i], ...updates, updatedAt: now };
          updatedLinks.push(links[i]);
        }
      }
      
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(links));
      this.updateLastAccessed();
      
      return updatedLinks;
    } catch (error) {
      logger.error('Error bulk updating guest links:', error);
      throw error;
    }
  }

  /**
   * Bulk delete multiple links (soft delete)
   */
  async bulkDeleteLinks(ids: string[]): Promise<void> {
    await this.bulkUpdateLinks(ids, { deletedAt: new Date().toISOString() });
  }

  /**
   * Bulk restore multiple links
   */
  async bulkRestoreLinks(ids: string[]): Promise<void> {
    await this.bulkUpdateLinks(ids, { deletedAt: null });
  }

  /**
   * Empty trash (permanently delete all trashed links)
   */
  async emptyTrash(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const activeLinks = links.filter(link => !link.deletedAt);
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(activeLinks));
      
      this.updateLastAccessed();
    } catch (error) {
      logger.error('Error emptying guest trash:', error);
      throw error;
    }
  }

  /**
   * Restore all links from trash
   */
  async restoreAllFromTrash(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      const links = await this.getAllLinksIncludingDeleted();
      const now = new Date().toISOString();
      
      for (let i = 0; i < links.length; i++) {
        if (links[i].deletedAt) {
          links[i].deletedAt = null;
          links[i].updatedAt = now;
        }
      }
      
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(links));
      this.updateLastAccessed();
    } catch (error) {
      logger.error('Error restoring all from guest trash:', error);
      throw error;
    }
  }


  // ============================================
  // Folder Operations
  // ============================================

  /**
   * Get all folders from guest storage
   */
  async getFolders(): Promise<Folder[]> {
    if (typeof window === 'undefined') return [];
    
    try {
      const foldersData = localStorage.getItem(GUEST_STORAGE_KEYS.FOLDERS);
      if (!foldersData) return [];
      
      return JSON.parse(foldersData);
    } catch (error) {
      logger.error('Error getting guest folders:', error);
      return [];
    }
  }

  /**
   * Add a new folder to guest storage
   * Note: Sub-folder creation is restricted in guest mode
   */
  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot add folder: window is undefined');
    }
    
    // Guest mode restriction: no sub-folders allowed
    if (folder.parentId !== null) {
      throw new Error('Sub-folder creation is not available in guest mode. Please sign up for full access.');
    }
    
    try {
      const folders = await this.getFolders();
      const now = new Date().toISOString();
      
      // Check for duplicate folder names
      const existingFolder = folders.find(f => f.name.toLowerCase() === folder.name.toLowerCase());
      if (existingFolder) {
        throw new Error('A folder with this name already exists');
      }
      
      const newFolder: Folder = {
        ...folder,
        id: `guest_folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        parentId: null, // Always null in guest mode
      };
      
      folders.push(newFolder);
      localStorage.setItem(GUEST_STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      
      this.updateLastAccessed();
      return newFolder;
    } catch (error) {
      logger.error('Error adding guest folder:', error);
      throw error;
    }
  }

  /**
   * Update an existing folder in guest storage
   */
  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update folder: window is undefined');
    }
    
    // Guest mode restriction: cannot set parentId
    if (updates.parentId !== undefined && updates.parentId !== null) {
      throw new Error('Sub-folder creation is not available in guest mode. Please sign up for full access.');
    }
    
    try {
      const folders = await this.getFolders();
      const index = folders.findIndex(folder => folder.id === id);
      
      if (index === -1) {
        throw new Error(`Folder not found: ${id}`);
      }
      
      // Check for duplicate folder names if name is being updated
      if (updates.name) {
        const existingFolder = folders.find(
          f => f.id !== id && f.name.toLowerCase() === updates.name!.toLowerCase()
        );
        if (existingFolder) {
          throw new Error('A folder with this name already exists');
        }
      }
      
      const updatedFolder: Folder = {
        ...folders[index],
        ...updates,
        parentId: null, // Always null in guest mode
        updatedAt: new Date().toISOString(),
      };
      
      folders[index] = updatedFolder;
      localStorage.setItem(GUEST_STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
      
      this.updateLastAccessed();
      return updatedFolder;
    } catch (error) {
      logger.error('Error updating guest folder:', error);
      throw error;
    }
  }

  /**
   * Delete a folder from guest storage
   * Also moves all links in the folder to uncategorized
   */
  async deleteFolder(id: string): Promise<void> {
    if (typeof window === 'undefined') return;
    
    try {
      // Move all links in this folder to uncategorized
      const links = await this.getAllLinksIncludingDeleted();
      const now = new Date().toISOString();
      
      for (let i = 0; i < links.length; i++) {
        if (links[i].folderId === id) {
          links[i].folderId = null;
          links[i].updatedAt = now;
        }
      }
      localStorage.setItem(GUEST_STORAGE_KEYS.LINKS, JSON.stringify(links));
      
      // Remove the folder
      const folders = await this.getFolders();
      const filteredFolders = folders.filter(folder => folder.id !== id);
      localStorage.setItem(GUEST_STORAGE_KEYS.FOLDERS, JSON.stringify(filteredFolders));
      
      this.updateLastAccessed();
    } catch (error) {
      logger.error('Error deleting guest folder:', error);
      throw error;
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get storage usage information
   */
  getStorageInfo(): { used: number; linksCount: number; foldersCount: number } {
    if (typeof window === 'undefined') {
      return { used: 0, linksCount: 0, foldersCount: 0 };
    }
    
    try {
      let used = 0;
      let linksCount = 0;
      let foldersCount = 0;
      
      Object.values(GUEST_STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          used += data.length * 2; // UTF-16 encoding
        }
      });
      
      const linksData = localStorage.getItem(GUEST_STORAGE_KEYS.LINKS);
      if (linksData) {
        const links = JSON.parse(linksData);
        linksCount = links.filter((l: Link) => !l.deletedAt).length;
      }
      
      const foldersData = localStorage.getItem(GUEST_STORAGE_KEYS.FOLDERS);
      if (foldersData) {
        foldersCount = JSON.parse(foldersData).length;
      }
      
      return { used, linksCount, foldersCount };
    } catch (error) {
      logger.error('Error getting storage info:', error);
      return { used: 0, linksCount: 0, foldersCount: 0 };
    }
  }
}

// Export singleton instance
export const guestStorageService = new GuestStorageService();
