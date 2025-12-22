/**
 * @file lib/services/links-database.service.ts
 * @description Database operations specifically for links
 * @created 2025-11-12
 */

import { createClient } from '@/lib/supabase/client';
import { Link, Platform } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { globalCache, CACHE_CONFIGS } from './cache-manager';
import { debugLogger } from './debug-logger.service';
import { DatabaseLink, LinkUpdateData } from '@/lib/types/database';
import { isLink } from '@/lib/utils/type-guards';
import { logger } from '@/lib/utils/logger';
import {
  DatabaseError,
  AuthenticationError,
  NotFoundError,
} from '@/lib/errors/app-error';

/**
 * Links-specific database operations
 * Focused on link CRUD operations with optimized caching
 */
export class LinksDatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient();
  }

  /**
   * Generate cache key for user-specific data
   * @param userId - User ID
   * @param operation - Operation name
   * @param params - Additional parameters
   */
  private getCacheKey(userId: string, operation: string, params?: string): string {
    return `${userId}:links:${operation}${params ? `:${params}` : ''}`;
  }

  /**
   * Invalidate links-related caches
   * @param userId - User ID to invalidate caches for
   */
  private invalidateUserCache(userId: string): void {
    globalCache.invalidateByTags(['links', `user:${userId}`]);
  }

  /**
   * Get all links for current user
   * @param options - Query options
   */
  async getLinks(options: { limit?: number; offset?: number } = {}): Promise<Link[]> {
    const startTime = Date.now();
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { limit = 1000, offset = 0 } = options;
    const cacheKey = this.getCacheKey(user.id, 'get', `limit:${limit}:offset:${offset}`);

    // Check cache first with performance tracking
    const cached = globalCache.get<Link[]>(cacheKey);
    if (cached !== null) {
      // Log cache hit performance
      debugLogger.database({
        operation: 'getLinks',
        success: true,
        duration: Date.now() - startTime,
        cacheHit: true,
        dataSize: cached.length
      });
      return cached;
    }

    try {
      const queryStartTime = Date.now();

      // Optimized query with better indexing strategy
      const queryPromise = this.supabase
        .from('links')
        .select(`
          id,
          user_id,
          url,
          title,
          description,
          thumbnail,
          platform,
          folder_id,
          is_favorite,
          tags,
          favicon_url,
          created_at,
          updated_at,
          deleted_at
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .is('deleted_at', null) // Only active links
        .order('updated_at', { ascending: false }) // Better for recent updates
        .range(offset, offset + limit - 1);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Links query timeout')), 10000) // Reduced timeout
      );

      const { data, error, count } = await Promise.race([queryPromise, timeoutPromise]);

      const queryDuration = Date.now() - queryStartTime;

      if (error) {
        debugLogger.database({
          operation: 'getLinks',
          success: false,
          duration: queryDuration,
          error: error.message
        });
        throw new DatabaseError('Failed to fetch links', { userId: user.id }, error as Error);
      }

      if (!data) {
        // Log empty result performance
        debugLogger.database({
          operation: 'getLinks',
          success: true,
          duration: Date.now() - startTime,
          cacheHit: false,
          dataSize: 0
        });
        return [];
      }

      // Transform data efficiently
      const links = data.map((dbLink: DatabaseLink) => {
        const link = this.transformLinkFromDB(dbLink);
        if (!isLink(link)) {
          logger.warn('Invalid link data received:', dbLink);
          return null;
        }
        return link;
      }).filter((link): link is Link => link !== null);

      const totalDuration = Date.now() - startTime;

      // Cache the result
      globalCache.set(cacheKey, links, {
        ...CACHE_CONFIGS.LINKS,
        tags: [...CACHE_CONFIGS.LINKS.tags, `user:${user.id}`]
      });

      // Log successful query performance
      debugLogger.database({
        operation: 'getLinks',
        success: true,
        duration: totalDuration,
        cacheHit: false,
        dataSize: links.length,
        queryType: 'database_query'
      });

      return links;
    } catch (error) {
      logger.error('Error fetching links:', error);
      debugLogger.database({
        operation: 'getLinks',
        success: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch links', { userId: user.id }, error as Error);
    }
  }

  /**
   * Add a new link
   * FIX 2: Accepts userId as parameter - no getUser() call
   * Auth validation is done at the UI/store layer before calling this
   * @param link - Link data
   * @param userId - Authenticated user ID (required)
   */
  async addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, userId: string): Promise<Link> {
    try {
      // FIX 2: No getUser() call - userId is passed from caller
      // This eliminates the redundant network call that could timeout
      if (!userId) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache
      // Cache invalidation moved to after success

      const linkData = {
        user_id: userId,
        url: link.url,
        title: link.title,
        description: link.description || null,
        thumbnail: link.thumbnail || null,
        platform: link.platform,
        folder_id: link.folderId || null,
        is_favorite: link.isFavorite || false,
        tags: link.tags || [],
        favicon_url: link.faviconUrl || null,
        is_archived: false,
        click_count: 0,
        last_clicked_at: null,
        deleted_at: null,
      };

      const { data, error } = await this.supabase
        .from('links')
        .insert(linkData)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to create link', { linkData }, error as Error);
      }
      if (!data) {
        throw new DatabaseError('Failed to create link - no data returned', { linkData });
      }

      const createdLink = this.transformLinkFromDB(data);
      if (!isLink(createdLink)) {
        throw new DatabaseError('Invalid link data received from database', { linkId: data.id });
      }

      // Invalidate cache after successful creation
      this.invalidateUserCache(userId);

      return createdLink;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to add link', { link }, error as Error);
    }
  }

  /**
   * Update an existing link
   * @param id - Link ID
   * @param updates - Fields to update
   */
  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const updateData: LinkUpdateData = {};

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
      if (updates.faviconUrl !== undefined) updateData.favicon_url = updates.faviconUrl;
      if (updates.platform !== undefined) updateData.platform = updates.platform;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
      if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt;

      const { data, error } = await this.supabase
        .from('links')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError('Failed to update link', { linkId: id }, error as Error);
      }
      if (!data) {
        throw new NotFoundError('Link', id);
      }

      const link = this.transformLinkFromDB(data);
      if (!isLink(link)) {
        throw new DatabaseError('Invalid link data received from database', { linkId: data.id });
      }

      // Invalidate cache after successful update
      this.invalidateUserCache(user.id);

      return link;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update link', { linkId: id, updates }, error as Error);
    }
  }

  /**
   * Delete a link (soft delete)
   * @param id - Link ID
   */
  async deleteLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to delete link', { linkId: id }, error as Error);
      }

      // Invalidate cache after successful deletion
      this.invalidateUserCache(user.id);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete link', { linkId: id }, error as Error);
    }
  }

  /**
   * Restore a link from trash
   * @param id - Link ID
   */
  async restoreLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to restore link', { linkId: id }, error as Error);
      }

      // Invalidate cache after successful restoration
      this.invalidateUserCache(user.id);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to restore link', { linkId: id }, error as Error);
    }
  }

  /**
   * Permanently delete a link
   * @param id - Link ID
   */
  async permanentlyDeleteLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const { error } = await this.supabase
        .from('links')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to permanently delete link', { linkId: id }, error as Error);
      }

      // Invalidate cache after successful deletion
      this.invalidateUserCache(user.id);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to permanently delete link', { linkId: id }, error as Error);
    }
  }

  /**
   * Bulk update multiple links with the same updates
   */
  async bulkUpdateLinks(ids: string[], updates: Partial<Link>): Promise<Link[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return [];

      const updateData: LinkUpdateData & { updated_at: string } = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.url !== undefined) updateData.url = updates.url;
      if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
      if (updates.faviconUrl !== undefined) updateData.favicon_url = updates.faviconUrl;
      if (updates.platform !== undefined) updateData.platform = updates.platform;
      if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
      if (updates.isFavorite !== undefined) updateData.is_favorite = updates.isFavorite;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.deletedAt !== undefined) updateData.deleted_at = updates.deletedAt;

      const { data, error } = await this.supabase
        .from('links')
        .update(updateData)
        .in('id', ids)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw new DatabaseError('Failed to bulk update links', { linkIds: ids }, error as Error);
      }

      if (!data || data.length === 0) {
        logger.warn('Bulk update matched 0 rows', { ids, userId: user.id });
        throw new DatabaseError('No links were updated. Please try again.', { linkIds: ids });
      }

      // Validate and transform results
      const links = data.map((dbLink: DatabaseLink) => {
        const link = this.transformLinkFromDB(dbLink);
        if (!isLink(link)) {
          logger.warn('Invalid link data received in bulk update:', dbLink);
          return null;
        }
        return link;
      }).filter((link): link is Link => link !== null);

      // Invalidate cache after successful bulk update
      this.invalidateUserCache(user.id);

      return links;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk update links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk delete multiple links
   */
  async bulkDeleteLinks(ids: string[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return;

      logger.debug('Bulk deleting links:', { userId: user.id, count: ids.length, ids });

      const { error, data } = await this.supabase
        .from('links')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('user_id', user.id)
        .select('id');

      if (error) {
        throw new DatabaseError('Failed to bulk delete links', { linkIds: ids }, error as Error);
      }

      if (!data || data.length === 0) {
        logger.warn('Bulk delete matched 0 rows', { ids, userId: user.id });
        throw new DatabaseError('No links were deleted. Please try again.', { linkIds: ids });
      }

      logger.debug('Bulk delete result:', { count: data.length });

      // Invalidate cache after successful bulk deletion
      this.invalidateUserCache(user.id);
    } catch (error) {
      logger.error('Error bulk deleting links:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk delete links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk restore multiple links
   */
  async bulkRestoreLinks(ids: string[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return;

      const { error, data } = await this.supabase
        .from('links')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('user_id', user.id)
        .select('id');

      if (error) {
        throw new DatabaseError('Failed to bulk restore links', { linkIds: ids }, error as Error);
      }

      if (!data || data.length === 0) {
        logger.warn('Bulk restore matched 0 rows', { ids, userId: user.id });
        throw new DatabaseError('No links were restored. Please try again.', { linkIds: ids });
      }

      // Invalidate cache after successful bulk restoration
      this.invalidateUserCache(user.id);
    } catch (error) {
      logger.error('Error bulk restoring links:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk restore links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk move multiple links to a specific folder
   */
  async bulkMoveLinks(ids: string[], folderId: string | null): Promise<Link[]> {
    return this.bulkUpdateLinks(ids, { folderId });
  }

  /**
   * Bulk toggle favorite status for multiple links
   */
  async bulkToggleFavoriteLinks(ids: string[], isFavorite: boolean): Promise<Link[]> {
    return this.bulkUpdateLinks(ids, { isFavorite });
  }

  /**
   * Empty trash (permanently delete all trashed links)
   */
  async emptyTrash(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const { error } = await this.supabase
        .from('links')
        .delete()
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) {
        throw new DatabaseError('Failed to empty trash', { userId: user.id }, error as Error);
      }

      // Invalidate cache after successful operation
      this.invalidateUserCache(user.id);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to empty trash', {}, error as Error);
    }
  }

  /**
   * Restore all links from trash
   */
  async restoreAllFromTrash(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Cache invalidation moved to after success

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: null })
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) {
        throw new DatabaseError('Failed to restore all from trash', { userId: user.id }, error as Error);
      }

      // Invalidate cache after successful operation
      this.invalidateUserCache(user.id);
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to restore all from trash', {}, error as Error);
    }
  }

  /**
   * Transform link from database schema to app schema
   */
  private transformLinkFromDB(dbLink: DatabaseLink): Link {
    return {
      id: dbLink.id,
      url: dbLink.url,
      title: dbLink.title || '',
      description: dbLink.description || '',
      thumbnail: dbLink.thumbnail || '',
      faviconUrl: dbLink.favicon_url || '',
      platform: dbLink.platform as Platform,
      folderId: dbLink.folder_id,
      isFavorite: dbLink.is_favorite || false,
      tags: dbLink.tags || [],
      deletedAt: dbLink.deleted_at,
      createdAt: dbLink.created_at,
      updatedAt: dbLink.updated_at,
    };
  }
}

// Export singleton instance
export const linksDatabaseService = new LinksDatabaseService();