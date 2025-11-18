/**
 * @file lib/services/folders-database.service.ts
 * @description Database operations specifically for folders
 * @created 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { Folder } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { globalCache, CACHE_CONFIGS } from './cache-manager';
import { DatabaseFolder, FolderUpdateData } from '@/lib/types/database';
import { isFolder } from '@/lib/utils/type-guards';
import { logger } from '@/lib/utils/logger';
import {
  DatabaseError,
  AuthenticationError,
  NotFoundError,
} from '@/lib/errors/app-error';

/**
 * Folders-specific database operations
 * Focused on folder CRUD operations with optimized caching
 */
export class FoldersDatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Generate cache key for user-specific data
   */
  private getCacheKey(userId: string, operation: string, params?: string): string {
    return `${userId}:folders:${operation}${params ? `:${params}` : ''}`;
  }

  /**
   * Invalidate folders-related caches
   */
  private invalidateUserCache(userId: string): void {
    globalCache.invalidateByTags(['folders', `user:${userId}`]);
  }

  /**
   * Get all folders for current user
   */
  async getFolders(options: { limit?: number } = {}): Promise<Folder[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { limit = 500 } = options;
    const cacheKey = this.getCacheKey(user.id, 'get', `limit:${limit}`);

    // Check cache first
    const cached = globalCache.get<Folder[]>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const queryPromise = this.supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(limit);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Folders query timeout')), 10000)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        throw new DatabaseError('Failed to fetch folders', { userId: user.id }, error as Error);
      }

      if (!data) {
        return [];
      }

      const folders = data.map((dbFolder: DatabaseFolder) => {
        const folder = this.transformFolderFromDB(dbFolder);
        if (!isFolder(folder)) {
          logger.warn('Invalid folder data received:', dbFolder);
          return null;
        }
        return folder;
      }).filter((folder): folder is Folder => folder !== null);

      // Cache the result
      globalCache.set(cacheKey, folders, { ...CACHE_CONFIGS.FOLDERS, tags: [...CACHE_CONFIGS.FOLDERS.tags] });

      return folders;
    } catch (error) {
      logger.error('Error fetching folders:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch folders', { userId: user.id }, error as Error);
    }
  }

  /**
   * Add a new folder
   */
  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      this.invalidateUserCache(user.id);

      const folderData = {
        user_id: user.id,
        name: folder.name,
        description: folder.description || null,
        color: folder.color,
        icon: folder.icon,
        parent_id: folder.parentId || null,
        is_platform_folder: folder.isPlatformFolder || false,
        platform: folder.platform || null,
        is_default: false,
      };

      const { data, error } = await this.supabase
        .from('folders')
        .insert(folderData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          throw new DatabaseError('A folder with this name already exists', { folderData }, error as Error);
        }
        throw new DatabaseError('Failed to create folder', { folderData }, error as Error);
      }
      if (!data) {
        throw new DatabaseError('Failed to create folder - no data returned', { folderData });
      }

      const createdFolder = this.transformFolderFromDB(data);
      if (!isFolder(createdFolder)) {
        throw new DatabaseError('Invalid folder data received from database', { folderId: data.id });
      }
      return createdFolder;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to add folder', { folder }, error as Error);
    }
  }

  /**
   * Update an existing folder
   */
  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      const updateData: FolderUpdateData = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;

      const { data, error } = await this.supabase
        .from('folders')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to update folder', { folderId: id }, error as Error);
      }
      if (!data) {
        throw new NotFoundError('Folder', id);
      }

      const folder = this.transformFolderFromDB(data);
      if (!isFolder(folder)) {
        throw new DatabaseError('Invalid folder data received from database', { folderId: data.id });
      }
      return folder;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update folder', { folderId: id, updates }, error as Error);
    }
  }

  /**
   * Delete a folder
   */
  async deleteFolder(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      this.invalidateUserCache(user.id);

      // First, set folder_id to null for all links in this folder
      const { error: linksError } = await this.supabase
        .from('links')
        .update({ folder_id: null })
        .eq('folder_id', id)
        .eq('user_id', user.id);

      if (linksError) {
        throw new DatabaseError('Failed to update links before folder deletion', { folderId: id }, linksError as Error);
      }

      // Then delete the folder
      const { error } = await this.supabase
        .from('folders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to delete folder', { folderId: id }, error as Error);
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete folder', { folderId: id }, error as Error);
    }
  }

  /**
   * Transform folder from database schema to app schema
   */
  private transformFolderFromDB(dbFolder: DatabaseFolder): Folder {
    return {
      id: dbFolder.id,
      name: dbFolder.name,
      description: dbFolder.description || '',
      color: dbFolder.color,
      icon: dbFolder.icon,
      parentId: dbFolder.parent_id,
      isPlatformFolder: dbFolder.is_platform_folder || false,
      platform: dbFolder.platform as any, // Platform type
      createdAt: dbFolder.created_at,
      updatedAt: dbFolder.updated_at,
    };
  }
}

// Export singleton instance
export const foldersDatabaseService = new FoldersDatabaseService();