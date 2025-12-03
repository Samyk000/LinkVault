/**
 * @file lib/services/supabase-storage.service.ts
 * @description Supabase storage adapter implementing StorageService interface
 * @created 2025-12-03
 */

import { Link, Folder, AppSettings } from '@/types';
import { StorageService } from './storage.interface';
import { linksDatabaseService } from './links-database.service';
import { foldersDatabaseService } from './folders-database.service';
import { settingsDatabaseService } from './settings-database.service';
import { logger } from '@/lib/utils/logger';

/**
 * SupabaseStorageService wraps existing database services to implement
 * the unified StorageService interface for authenticated users.
 */
export class SupabaseStorageService implements StorageService {
  // ============================================
  // Links Operations
  // ============================================

  async getLinks(): Promise<Link[]> {
    return linksDatabaseService.getLinks();
  }

  async addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link> {
    return linksDatabaseService.addLink(link);
  }

  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    return linksDatabaseService.updateLink(id, updates);
  }

  async deleteLink(id: string): Promise<void> {
    return linksDatabaseService.deleteLink(id);
  }

  async restoreLink(id: string): Promise<void> {
    return linksDatabaseService.restoreLink(id);
  }

  async permanentlyDeleteLink(id: string): Promise<void> {
    return linksDatabaseService.permanentlyDeleteLink(id);
  }

  async bulkDeleteLinks(ids: string[]): Promise<void> {
    return linksDatabaseService.bulkDeleteLinks(ids);
  }

  async bulkRestoreLinks(ids: string[]): Promise<void> {
    return linksDatabaseService.bulkRestoreLinks(ids);
  }

  async bulkMoveLinks(ids: string[], folderId: string | null): Promise<void> {
    await linksDatabaseService.bulkMoveLinks(ids, folderId);
  }

  async emptyTrash(): Promise<void> {
    return linksDatabaseService.emptyTrash();
  }

  async restoreAllFromTrash(): Promise<void> {
    return linksDatabaseService.restoreAllFromTrash();
  }

  // ============================================
  // Folders Operations
  // ============================================

  async getFolders(): Promise<Folder[]> {
    return foldersDatabaseService.getFolders();
  }

  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    return foldersDatabaseService.addFolder(folder);
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    return foldersDatabaseService.updateFolder(id, updates);
  }

  async deleteFolder(id: string): Promise<void> {
    return foldersDatabaseService.deleteFolder(id);
  }

  // ============================================
  // Settings Operations
  // ============================================

  async getSettings(): Promise<AppSettings | null> {
    return settingsDatabaseService.getSettings();
  }

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    return settingsDatabaseService.updateSettings(settings);
  }

  // ============================================
  // Export/Import Operations
  // ============================================

  async exportData(): Promise<string> {
    try {
      const [links, folders, settings] = await Promise.all([
        this.getLinks(),
        this.getFolders(),
        this.getSettings(),
      ]);

      const data = {
        links,
        folders,
        settings,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      logger.error('Error exporting data from Supabase:', error);
      throw error;
    }
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format');
      }

      // Import links
      if (Array.isArray(data.links)) {
        for (const link of data.links) {
          if (link && typeof link === 'object' && link.url) {
            const { id, createdAt, updatedAt, deletedAt, ...linkData } = link;
            await this.addLink(linkData);
          }
        }
      }

      // Import folders
      if (Array.isArray(data.folders)) {
        for (const folder of data.folders) {
          if (folder && typeof folder === 'object' && folder.name) {
            const { id, createdAt, updatedAt, ...folderData } = folder;
            await this.addFolder(folderData);
          }
        }
      }

      // Import settings
      if (data.settings && typeof data.settings === 'object') {
        await this.updateSettings(data.settings);
      }

      logger.info('Data imported successfully to Supabase');
      return true;
    } catch (error) {
      logger.error('Error importing data to Supabase:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supabaseStorageService = new SupabaseStorageService();
