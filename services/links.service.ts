/**
 * @file services/links.service.ts
 * @description Link management service
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { Link } from '@/types';
import { sanitizeLinkData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';

const supabase = createClient();

/**
 * Links service
 * Handles all link-related database operations
 */
export const linksService = {
  /**
   * Adds a new link to the database
   * @param {Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>} linkData - Link data to create
   * @returns {Promise<Link>} Created link
   * @throws {Error} When link creation fails
   */
  async addLink(linkData: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link> {
    const sanitizedData = sanitizeLinkData(linkData);
    
    const { data, error } = await supabase
      .from('links')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        url: sanitizedData.url,
        title: sanitizedData.title,
        description: sanitizedData.description,
        thumbnail: sanitizedData.thumbnail,
        favicon_url: sanitizedData.faviconUrl,
        platform: sanitizedData.platform,
        folder_id: sanitizedData.folderId,
        is_favorite: sanitizedData.isFavorite,
        tags: sanitizedData.tags,
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to add link:', {
        error: error.message,
        linkData: { url: sanitizedData.url, title: sanitizedData.title },
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to add link: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when creating link');
    }
    
    logger.debug('Link added successfully:', { id: data.id, url: data.url });
    return data as Link;
  },
  
  /**
   * Updates an existing link
   * @param {string} id - Link ID
   * @param {Partial<Link>} updates - Fields to update
   * @returns {Promise<Link>} Updated link
   * @throws {Error} When link update fails
   */
  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    const sanitizedUpdates = sanitizeLinkData(updates);
    
    const { data, error } = await supabase
      .from('links')
      .update({
        ...(sanitizedUpdates.url && { url: sanitizedUpdates.url }),
        ...(sanitizedUpdates.title && { title: sanitizedUpdates.title }),
        ...(sanitizedUpdates.description && { description: sanitizedUpdates.description }),
        ...(sanitizedUpdates.thumbnail && { thumbnail: sanitizedUpdates.thumbnail }),
        ...(sanitizedUpdates.faviconUrl && { favicon_url: sanitizedUpdates.faviconUrl }),
        ...(sanitizedUpdates.platform && { platform: sanitizedUpdates.platform }),
        ...(sanitizedUpdates.folderId !== undefined && { folder_id: sanitizedUpdates.folderId }),
        ...(sanitizedUpdates.isFavorite !== undefined && { is_favorite: sanitizedUpdates.isFavorite }),
        ...(sanitizedUpdates.tags && { tags: sanitizedUpdates.tags }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Failed to update link:', {
        error: error.message,
        linkId: id,
        updates: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to update link: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('No data returned when updating link');
    }
    
    logger.debug('Link updated successfully:', { id, updates: sanitizedUpdates });
    return data as Link;
  },
  
  /**
   * Soft deletes a link (moves to trash)
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When link deletion fails
   */
  async deleteLink(id: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      logger.error('Failed to delete link:', {
        error: error.message,
        linkId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to delete link: ${error.message}`);
    }
    
    logger.debug('Link soft deleted:', { id });
  },
  
  /**
   * Restores a link from trash
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When link restoration fails
   */
  async restoreLink(id: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (error) {
      logger.error('Failed to restore link:', {
        error: error.message,
        linkId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to restore link: ${error.message}`);
    }
    
    logger.debug('Link restored from trash:', { id });
  },
  
  /**
   * Permanently deletes a link
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When permanent deletion fails
   */
  async permanentlyDeleteLink(id: string): Promise<void> {
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('id', id);
    
    if (error) {
      logger.error('Failed to permanently delete link:', {
        error: error.message,
        linkId: id,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to permanently delete link: ${error.message}`);
    }
    
    logger.debug('Link permanently deleted:', { id });
  },
  
  /**
   * Permanently deletes all trashed links for the current user
   * @returns {Promise<void>}
   * @throws {Error} When emptying trash fails
   */
  async emptyTrash(): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { error } = await supabase
      .from('links')
      .delete()
      .eq('user_id', userId)
      .not('deleted_at', 'is', null);
    
    if (error) {
      logger.error('Failed to empty trash:', {
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to empty trash: ${error.message}`);
    }
    
    logger.debug('Trash emptied successfully:', { userId });
  },
  
  /**
   * Restores all trashed links for the current user
   * @returns {Promise<void>}
   * @throws {Error} When restoration fails
   */
  async restoreAllFromTrash(): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .not('deleted_at', 'is', null);
    
    if (error) {
      logger.error('Failed to restore all from trash:', {
        error: error.message,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to restore all from trash: ${error.message}`);
    }
    
    logger.debug('All links restored from trash:', { userId });
  },
  
  /**
   * Bulk updates multiple links
   * @param {string[]} ids - Array of link IDs to update
   * @param {Partial<Link>} updates - Updates to apply to all links
   * @returns {Promise<void>}
   * @throws {Error} When bulk update fails
   */
  async bulkUpdateLinks(ids: string[], updates: Partial<Link>): Promise<void> {
    const sanitizedUpdates = sanitizeLinkData(updates);
    
    const { error } = await supabase
      .from('links')
      .update({
        ...(sanitizedUpdates.url && { url: sanitizedUpdates.url }),
        ...(sanitizedUpdates.title && { title: sanitizedUpdates.title }),
        ...(sanitizedUpdates.description && { description: sanitizedUpdates.description }),
        ...(sanitizedUpdates.thumbnail && { thumbnail: sanitizedUpdates.thumbnail }),
        ...(sanitizedUpdates.faviconUrl && { favicon_url: sanitizedUpdates.faviconUrl }),
        ...(sanitizedUpdates.platform && { platform: sanitizedUpdates.platform }),
        ...(sanitizedUpdates.folderId !== undefined && { folder_id: sanitizedUpdates.folderId }),
        ...(sanitizedUpdates.isFavorite !== undefined && { is_favorite: sanitizedUpdates.isFavorite }),
        ...(sanitizedUpdates.tags && { tags: sanitizedUpdates.tags }),
        updated_at: new Date().toISOString()
      })
      .in('id', ids);
    
    if (error) {
      logger.error('Failed to bulk update links:', {
        error: error.message,
        linkIds: ids,
        updates: sanitizedUpdates,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to bulk update links: ${error.message}`);
    }
    
    logger.debug('Links bulk updated:', { count: ids.length, updates: sanitizedUpdates });
  },
  
  /**
   * Bulk soft deletes multiple links
   * @param {string[]} ids - Array of link IDs to delete
   * @returns {Promise<void>}
   * @throws {Error} When bulk deletion fails
   */
  async bulkDeleteLinks(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', ids);
    
    if (error) {
      logger.error('Failed to bulk delete links:', {
        error: error.message,
        linkIds: ids,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to bulk delete links: ${error.message}`);
    }
    
    logger.debug('Links bulk deleted:', { count: ids.length });
  },
  
  /**
   * Bulk restores multiple links from trash
   * @param {string[]} ids - Array of link IDs to restore
   * @returns {Promise<void>}
   * @throws {Error} When bulk restoration fails
   */
  async bulkRestoreLinks(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);
    
    if (error) {
      logger.error('Failed to bulk restore links:', {
        error: error.message,
        linkIds: ids,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to bulk restore links: ${error.message}`);
    }
    
    logger.debug('Links bulk restored from trash:', { count: ids.length });
  },
  
  /**
   * Bulk moves multiple links to a specific folder
   * @param {string[]} ids - Array of link IDs to move
   * @param {string | null} folderId - Target folder ID (null for root)
   * @returns {Promise<void>}
   * @throws {Error} When bulk move fails
   */
  async bulkMoveLinks(ids: string[], folderId: string | null): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        folder_id: folderId,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);
    
    if (error) {
      logger.error('Failed to bulk move links:', {
        error: error.message,
        linkIds: ids,
        folderId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to bulk move links: ${error.message}`);
    }
    
    logger.debug('Links bulk moved:', { count: ids.length, folderId });
  },
  
  /**
   * Bulk toggles favorite status for multiple links
   * @param {string[]} ids - Array of link IDs to toggle
   * @param {boolean} isFavorite - New favorite status
   * @returns {Promise<void>}
   * @throws {Error} When bulk favorite toggle fails
   */
  async bulkToggleFavoriteLinks(ids: string[], isFavorite: boolean): Promise<void> {
    const { error } = await supabase
      .from('links')
      .update({
        is_favorite: isFavorite,
        updated_at: new Date().toISOString()
      })
      .in('id', ids);
    
    if (error) {
      logger.error('Failed to bulk toggle favorites:', {
        error: error.message,
        linkIds: ids,
        isFavorite,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to bulk toggle favorites: ${error.message}`);
    }
    
    logger.debug('Links favorite status bulk updated:', { count: ids.length, isFavorite });
  },
  
  /**
   * Fetches all links for the current user with optional filtering
   * @param {Object} options - Query options
   * @param {string | null} options.folderId - Filter by folder ID (null for all)
   * @param {boolean} options.includeDeleted - Include deleted links
   * @param {string} options.searchQuery - Search query
   * @returns {Promise<Link[]>} Array of links
   * @throws {Error} When fetching links fails
   */
  async getLinks(options: {
    folderId?: string | null;
    includeDeleted?: boolean;
    searchQuery?: string;
  } = {}): Promise<Link[]> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) {
      throw new Error('No authenticated user found');
    }
    
    let query = supabase
      .from('links')
      .select('*')
      .eq('user_id', userId);
    
    // Apply filters
    if (options.folderId !== undefined) {
      query = options.folderId 
        ? query.eq('folder_id', options.folderId)
        : query.is('folder_id', null);
    }
    
    if (!options.includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    if (options.searchQuery) {
      query = query.or(`title.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`);
    }
    
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('Failed to fetch links:', {
        error: error.message,
        options,
        userId,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Failed to fetch links: ${error.message}`);
    }
    
    return data || [];
  },
};

export type LinksService = typeof linksService;