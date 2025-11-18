/**
 * @file services/folders.service.ts
 * @description Folder management service
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { Folder } from '@/types';
import { sanitizeFolderData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';

const supabase = createClient();

/**
 * Folders service
 * Handles all folder-related database operations
 */
export const foldersService = {
  /**
   * Adds a new folder to the database
   * @param {Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>} folderData - Folder data to create
   * @returns {Promise<Folder>} Created folder
   * @throws {Error} When folder creation fails
   */
  async addFolder(folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    const sanitizedData = sanitizeFolderData(folderData);
    
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        name: sanitizedData.name,
        description: sanitizedData.description,
        color: sanitizedData.color,
        icon: sanitizedData.icon,
        parent_id: sanitizedData.parentId,
        is_platform_folder: sanitizedData.isPlatformFolder,
        platform: sanitizedData.platform
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to add folder:', {
        error: error.message,
        folderData: { name: sanitizedData.name },
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to add folder: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when creating folder');
    }
    
    logger.debug('Folder added successfully:', { id: data.id, name: data.name });
    return data as Folder;
  },
  
  /**
   * Updates an existing folder
   * @param {string} id - Folder ID
   * @param {Partial<Folder>} updates - Fields to update
   * @returns {Promise<Folder>} Updated folder
   * @throws {Error} When folder update fails
   */
  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    const sanitizedUpdates = sanitizeFolderData(updates);
    
    const { data, error } = await supabase
      .from('folders')
      .update({
        ...(sanitizedUpdates.name && { name: sanitizedUpdates.name }),
        ...(sanitizedUpdates.description && { description: sanitizedUpdates.description }),
        ...(sanitizedUpdates.color && { color: sanitizedUpdates.color }),
        ...(sanitizedUpdates.icon && { icon: sanitizedUpdates.icon }),
        ...(sanitizedUpdates.parentId !== undefined && { parent_id: sanitizedUpdates.parentId }),
        ...(sanitizedUpdates.isPlatformFolder !== undefined && { is_platform_folder: sanitizedUpdates.isPlatformFolder }),
        ...(sanitizedUpdates.platform && { platform: sanitizedUpdates.platform }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to update folder:', {
        error: error.message,
        folderId: id,
        updates: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update folder: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when updating folder');
    }
    
    logger.debug('Folder updated successfully:', { id, updates: sanitizedUpdates });
    return data as Folder;
  },
  
  /**
   * Deletes a folder and moves its links to root
   * @param {string} id - Folder ID
   * @returns {Promise<void>}
   * @throws {Error} When folder deletion fails
   */
  async deleteFolder(id: string): Promise<void> {
    // First, move all links in this folder to root (null folder_id)
    const { error: linksError } = await supabase
      .from('links')
      .update({
        folder_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('folder_id', id);
    
    if (linksError) {
      logger.error('Failed to move links from deleted folder:', {
        error: linksError.message,
        folderId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to move links from deleted folder: ${linksError.message}`);
    }
    
    // Then delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Failed to delete folder:', {
        error: error.message,
        folderId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
    
    logger.debug('Folder deleted successfully:', { id });
  },
  
  /**
   * Fetches all folders for the current user with optional filtering
   * @param {Object} options - Query options
   * @param {string | null} options.parentId - Filter by parent ID (null for root folders)
   * @param {boolean} options.includePlatform - Include platform folders
   * @param {string} options.searchQuery - Search query
   * @returns {Promise<Folder[]>} Array of folders
   * @throws {Error} When fetching folders fails
   */
  async getFolders(options: {
    parentId?: string | null;
    includePlatform?: boolean;
    searchQuery?: string;
  } = {}): Promise<Folder[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId);
    
    // Apply filters
    if (options.parentId !== undefined) {
      query = options.parentId 
        ? query.eq('parent_id', options.parentId)
        : query.is('parent_id', null);
    }
    
    if (!options.includePlatform) {
      query = query.eq('is_platform_folder', false);
    }
    
    if (options.searchQuery) {
      query = query.or(`name.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`);
    }
    
    query = query.order('created_at', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Failed to fetch folders:', {
        error: error.message,
        options,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch folders: ${error.message}`);
    }
    
    return data || [];
  },
  
  /**
   * Gets a folder by ID with proper error handling
   * @param {string} id - Folder ID
   * @returns {Promise<Folder | null>} Folder or null if not found
   * @throws {Error} When fetching folder fails
   */
  async getFolderById(id: string): Promise<Folder | null> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - folder not found
        return null;
      }
      
      logger.error('Failed to fetch folder by ID:', {
        error: error.message,
        folderId: id,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch folder: ${error.message}`);
    }
    
    return data as Folder;
  },
  
  /**
   * Gets all subfolders for a given parent folder
   * @param {string} parentId - Parent folder ID
   * @returns {Promise<Folder[]>} Array of subfolders
   * @throws {Error} When fetching subfolders fails
   */
  async getSubfolders(parentId: string): Promise<Folder[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('parent_id', parentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) {
      logger.error('Failed to fetch subfolders:', {
        error: error.message,
        parentId,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch subfolders: ${error.message}`);
    }
    
    return data || [];
  },
  
  /**
   * Gets the folder tree structure for the current user
   * @param {Object} options - Query options
   * @param {boolean} options.includePlatform - Include platform folders
   * @returns {Promise<Folder[]>} Array of folders with hierarchy
   * @throws {Error} When fetching folder tree fails
   */
  async getFolderTree(options: {
    includePlatform?: boolean;
  } = {}): Promise<Folder[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId);
    
    if (!options.includePlatform) {
      query = query.eq('is_platform_folder', false);
    }
    
    query = query.order('created_at', { ascending: true });
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Failed to fetch folder tree:', {
        error: error.message,
        options,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch folder tree: ${error.message}`);
    }
    
    return data || [];
  },
  
  /**
   * Counts the number of links in a folder (excluding deleted links)
   * @param {string} folderId - Folder ID
   * @returns {Promise<number>} Number of links in folder
   * @throws {Error} When counting links fails
   */
  async countLinksInFolder(folderId: string): Promise<number> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { count, error } = await supabase
      .from('links')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('folder_id', folderId)
      .is('deleted_at', null);
    
    if (error) {
      logger.error('Failed to count links in folder:', {
        error: error.message,
        folderId,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to count links in folder: ${error.message}`);
    }
    
    return count || 0;
  },
  
  /**
   * Checks if a folder name already exists for the user
   * @param {string} name - Folder name to check
   * @param {string | null} excludeId - Folder ID to exclude from check (for updates)
   * @param {string | null} parentId - Parent folder ID
   * @returns {Promise<boolean>} True if name exists
   * @throws {Error} When checking name existence fails
   */
  async folderNameExists(
    name: string, 
    excludeId?: string | null, 
    parentId?: string | null
  ): Promise<boolean> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    let query = supabase
      .from('folders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('name', name);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    if (parentId !== undefined) {
      query = parentId 
        ? query.eq('parent_id', parentId)
        : query.is('parent_id', null);
    }
    
    const { count, error } = await query;
    
    if (error) {
      logger.error('Failed to check folder name existence:', {
        error: error.message,
        name,
        excludeId,
        parentId,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to check folder name: ${error.message}`);
    }
    
    return (count || 0) > 0;
  },
};

export type FoldersService = typeof foldersService;