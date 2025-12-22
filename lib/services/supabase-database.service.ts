/**
 * @file lib/services/supabase-database.service.ts
 * @description Enhanced Supabase database service with smart caching and performance optimizations
 * @created 2025-11-02
 */

import { createClient } from '@/lib/supabase/client';
import { Link, Folder, AppSettings, Platform } from '@/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { globalCache, CACHE_CONFIGS, CacheOptions } from './cache-manager';
import { performanceMonitor } from './performance-monitor.service';
import {
  DatabaseError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors/app-error';
import {
  DatabaseLink,
  DatabaseFolder,
  LinkUpdateData,
  FolderUpdateData,
  BatchRequest,
  RequestQueueEntry,
} from '@/lib/types/database';
import {
  isLink,
  isFolder,
  isLinkArray,
  isFolderArray,
  isAppSettings,
} from '@/lib/utils/type-guards';
import { logger } from '@/lib/utils/logger';
import { debounce } from 'lodash';
import { databaseDebug } from '@/lib/services/database-debug.service';

/**
 * Enhanced Supabase Database Service
 * Provides CRUD operations with smart caching, request deduplication, and performance optimizations
 */
export class SupabaseDatabaseService {
  private supabase: SupabaseClient;
  private pendingRequests: Map<string, Promise<unknown>>;
  private activeChannels: Map<string, ReturnType<SupabaseClient['channel']>>;
  private requestQueue: Map<string, RequestQueueEntry<unknown>[]>;

  constructor() {
    this.supabase = createClient();
    this.pendingRequests = new Map();
    this.activeChannels = new Map();
    this.requestQueue = new Map();
  }

  /**
   * Enhanced request deduplication with smart caching
   * @param {string} key - Unique key for the request
   * @param {Function} fn - Function to execute
   * @param {CacheOptions} cacheOptions - Cache configuration
   * @returns {Promise<T>} - Result of the function
   */
  private async dedupeRequest<T>(
    key: string,
    fn: () => Promise<T>,
    cacheOptions?: CacheOptions
  ): Promise<T> {
    // Check cache first
    const cached = globalCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Execute new request
    const promise = fn()
      .then((result) => {
        // Cache the result with smart configuration
        if (cacheOptions) {
          globalCache.set(key, result, cacheOptions);
        }
        return result;
      })
      .catch((error) => {
        // Don't cache errors, but log them
        logger.error(`Request failed for key ${key}:`, error);
        throw error;
      })
      .finally(() => {
        // Clean up pending request
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Batch multiple requests for parallel execution
   * @param {Array} requests - Array of request configurations
   * @returns {Promise<T[]>} - Results of all requests
   */
  private async batchRequests<T>(requests: BatchRequest<T>[]): Promise<T[]> {
    const promises = requests.map(({ key, fn, cacheOptions }) =>
      this.dedupeRequest<T>(key, fn, cacheOptions)
    );

    return Promise.all(promises);
  }

  /**
   * Invalidate related caches when data changes
   * @param {string[]} tags - Cache tags to invalidate
   */
  private invalidateCache(tags: string[]): void {
    globalCache.invalidateByTags(tags);
  }

  /**
   * Generate cache key for user-specific data
   * @param {string} userId - User ID
   * @param {string} operation - Operation name
   * @param {string} params - Additional parameters
   * @returns {string} Cache key
   */
  private getCacheKey(userId: string, operation: string, params?: string): string {
    return `${userId}:${operation}${params ? `:${params}` : ''}`;
  }

  // ============================================
  // LINK OPERATIONS
  // ============================================

  /**
   * Get all links for current user (including deleted ones for trash functionality)
   * OPTIMIZED: Uses composite index (user_id, deleted_at, created_at DESC)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of links to fetch (default: 1000)
   * @param {number} options.offset - Offset for pagination (default: 0)
   * @returns {Promise<Link[]>} Array of links
   */
  async getLinks(options: { limit?: number; offset?: number } = {}): Promise<Link[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { limit = 1000, offset = 0 } = options;
    const cacheKey = this.getCacheKey(user.id, 'links', `limit:${limit}:offset:${offset}`);

    const queryId = databaseDebug.logQuery({
      operation: 'getLinks',
      queryType: 'select',
      cacheHit: false, // Will be updated if cache is used
      dataSize: limit,
      metadata: { userId: user.id, limit, offset }
    });

    return this.dedupeRequest(cacheKey, async () => {
      try {
        // ENHANCED: Add timeout protection to prevent hanging queries
        const queryPromise = this.supabase
          .from('links')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        // Race against timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Links query timeout')), 15000)
        );

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
          databaseDebug.markComplete(queryId, false, error.message);
          throw new DatabaseError('Failed to fetch links', { userId: user.id }, error as Error);
        }

        if (!data) {
          databaseDebug.markComplete(queryId, true);
          return [];
        }

        // Validate and transform database schema to app schema
        const links = data.map((dbLink: DatabaseLink) => {
          const link = this.transformLinkFromDB(dbLink);
          if (!isLink(link)) {
            logger.warn('Invalid link data received:', dbLink);
            return null;
          }
          return link;
        }).filter((link): link is Link => link !== null);

        databaseDebug.markComplete(queryId, true);
        return links;
      } catch (error) {
        logger.error('Error fetching links:', error);
        databaseDebug.markComplete(queryId, false, error instanceof Error ? error.message : 'Unknown error');
        if (error instanceof DatabaseError || error instanceof AuthenticationError) {
          throw error;
        }
        throw new DatabaseError('Failed to fetch links', { userId: user.id }, error as Error);
      }
    }, { ...CACHE_CONFIGS.LINKS, tags: [...CACHE_CONFIGS.LINKS.tags] });
  }

  /**
   * Add a new link
   * @param {Omit<Link, 'id' | 'createdAt' | 'updatedAt'>} link - Link data
   * @returns {Promise<Link>} Created link
   */
  async addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Link> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const linkData = {
        user_id: user.id,
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
      return createdLink;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add link', { link }, error as Error);
    }
  }

  /**
   * Update an existing link
   * @param {string} id - Link ID
   * @param {Partial<Link>} updates - Fields to update
   * @returns {Promise<Link>} Updated link
   */
  async updateLink(id: string, updates: Partial<Link>): Promise<Link> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

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
      return link;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update link', { linkId: id, updates }, error as Error);
    }
  }

  /**
   * Soft delete a link (move to trash)
   * @param {string} id - Link ID
   */
  async deleteLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to delete link', { linkId: id }, error as Error);
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete link', { linkId: id }, error as Error);
    }
  }

  /**
   * Restore a link from trash
   * @param {string} id - Link ID
   */
  async restoreLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to restore link', { linkId: id }, error as Error);
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to restore link', { linkId: id }, error as Error);
    }
  }

  /**
   * Permanently delete a link
   * @param {string} id - Link ID
   */
  async permanentlyDeleteLink(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const { error } = await this.supabase
        .from('links')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to permanently delete link', { linkId: id }, error as Error);
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to permanently delete link', { linkId: id }, error as Error);
    }
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

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const { error } = await this.supabase
        .from('links')
        .delete()
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) {
        throw new DatabaseError('Failed to empty trash', { userId: user.id }, error as Error);
      }
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

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

      const { error } = await this.supabase
        .from('links')
        .update({ deleted_at: null })
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null);

      if (error) {
        throw new DatabaseError('Failed to restore all from trash', { userId: user.id }, error as Error);
      }
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to restore all from trash', {}, error as Error);
    }
  }

  // ============================================
  // FOLDER OPERATIONS
  // ============================================

  /**
   * Get all folders for current user
   * OPTIMIZED: Uses composite index (user_id, parent_id, deleted_at)
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of folders to fetch (default: 500)
   * @returns {Promise<Folder[]>} Array of folders
   */
  async getFolders(options: { limit?: number } = {}): Promise<Folder[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { limit = 500 } = options;
    const cacheKey = this.getCacheKey(user.id, 'folders', `limit:${limit}`);

    return this.dedupeRequest(cacheKey, async () => {
      try {
        // ENHANCED: Add timeout protection to prevent hanging queries
        const queryPromise = this.supabase
          .from('folders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(limit);

        // Race against timeout
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

        // Validate and transform database schema to app schema
        const folders = data.map((dbFolder: DatabaseFolder) => {
          const folder = this.transformFolderFromDB(dbFolder);
          if (!isFolder(folder)) {
            logger.warn('Invalid folder data received:', dbFolder);
            return null;
          }
          return folder;
        }).filter((folder): folder is Folder => folder !== null);

        return folders;
      } catch (error) {
        logger.error('Error fetching folders:', error);
        if (error instanceof DatabaseError || error instanceof AuthenticationError) {
          throw error;
        }
        throw new DatabaseError('Failed to fetch folders', { userId: user.id }, error as Error);
      }
    }, { ...CACHE_CONFIGS.FOLDERS, tags: [...CACHE_CONFIGS.FOLDERS.tags] });
  }

  /**
   * Add a new folder
   * @param {Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>} folder - Folder data
   * @returns {Promise<Folder>} Created folder
   */
  async addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['folders', `user:${user.id}`]);

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
        // OPTIMIZED: Handle duplicate folder name error (409 Conflict)
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
      if (error instanceof DatabaseError || error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to add folder', { folderData: folder }, error as Error);
    }
  }

  /**
   * Update an existing folder
   * @param {string} id - Folder ID
   * @param {Partial<Folder>} updates - Fields to update
   * @returns {Promise<Folder>} Updated folder
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
      if (error instanceof DatabaseError || error instanceof AuthenticationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update folder', { folderId: id, updates }, error as Error);
    }
  }

  /**
   * Delete a folder
   * @param {string} id - Folder ID
   */
  async deleteFolder(id: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['folders', `user:${user.id}`]);

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

  // ============================================
  // SETTINGS OPERATIONS
  // ============================================

  /**
   * Get user settings
   * @returns {Promise<AppSettings | null>} User settings
   */
  async getSettings(): Promise<AppSettings | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        // Return null instead of throwing - settings are optional
        return null;
      }

      const cacheKey = this.getCacheKey(user.id, 'settings');

      return this.dedupeRequest(cacheKey, async () => {
        try {
          // Use maybeSingle() instead of single() to avoid 406 error when no rows exist
          const queryPromise = this.supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          // Race against timeout
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Settings query timeout')), 5000)
          );

          const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

          if (error) {
            // Log error without exposing sensitive details
            logger.warn('Settings fetch error (non-critical)');
            return null;
          }

          if (!data) return null;

          return {
            theme: data.theme as 'light' | 'dark' | 'system',
          };
        } catch (error) {
          // Silent fail for settings - they're not critical
          logger.warn('Settings unavailable, using defaults');
          return null;
        }
      }, { ...CACHE_CONFIGS.USER_SETTINGS, tags: [...CACHE_CONFIGS.USER_SETTINGS.tags] });
    } catch (error) {
      // Settings are optional, return null on any error
      return null;
    }
  }

  /**
   * Update user settings
   * @param {Partial<AppSettings>} settings - Settings to update
   * @returns {Promise<AppSettings>} Updated settings
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    let userId: string | undefined;
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }
      userId = user.id;

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['settings', `user:${user.id}`]);

      const updateData: {
        user_id: string;
        theme?: string;
      } = {
        user_id: user.id,
      };

      if (settings.theme !== undefined) updateData.theme = settings.theme;

      // Use proper upsert with conflict resolution
      const { data, error } = await this.supabase
        .from('user_settings')
        .upsert(updateData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        // If still getting constraint error, try update instead
        if (error.code === '23505') {
          const { data: updateDataResult, error: updateError } = await this.supabase
            .from('user_settings')
            .update({
              theme: settings.theme,
            })
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) {
            throw new DatabaseError('Failed to update settings', { userId: user.id }, updateError as Error);
          }
          if (!updateDataResult) {
            throw new DatabaseError('Failed to update settings - no data returned', { userId: user.id });
          }

          const result = {
            theme: updateDataResult.theme as 'light' | 'dark' | 'system',
          };

          if (!isAppSettings(result)) {
            throw new DatabaseError('Invalid settings data received', { userId: user.id });
          }

          return result;
        }
        throw new DatabaseError('Failed to update settings', { userId: user.id }, error as Error);
      }

      if (!data) {
        throw new DatabaseError('Failed to update settings - no data returned', { userId: user.id });
      }

      const result = {
        theme: data.theme as 'light' | 'dark' | 'system',
        viewMode: data.view_mode as 'grid' | 'list',
      };

      if (!isAppSettings(result)) {
        throw new DatabaseError('Invalid settings data received', { userId: user.id });
      }

      return result;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update settings', { userId: userId || 'unknown' }, error as Error);
    }
  }

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to link changes with improved error handling and race condition protection
   * @param {Function} callback - Callback function for changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToLinks(callback: (links: Link[]) => void): () => void {
    const channelName = 'links_changes';

    // Remove existing channel if it exists to prevent duplicates
    if (this.activeChannels.has(channelName)) {
      const existingChannel = this.activeChannels.get(channelName);
      try {
        if (existingChannel) {
          this.supabase.removeChannel(existingChannel);
        }
      } catch (error) {
        logger.warn('Error removing existing channel:', error);
      }
      this.activeChannels.delete(channelName);
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    let unsubscribeRequested = false;

    const createSubscription = async () => {
      if (unsubscribeRequested) return;

      // FIXED: Ensure user is authenticated before subscribing
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        logger.warn('[Realtime] Cannot subscribe to links: No authenticated user');
        return;
      }

      logger.info(`[Realtime] Creating links subscription for user: ${user.id.substring(0, 8)}...`);

      const channel = this.supabase
        .channel(channelName, {
          config: {
            presence: {
              key: 'user_id',
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'links',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            logger.debug(`[Realtime] Received ${payload.eventType} event on links table`);
            try {
              // Enhanced cache invalidation with race condition protection
              // Only invalidate cache for actual data changes, not metadata changes
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
                this.invalidateCache(['links', `user:${user.id}`]);
              }

              // Refetch all links when any change occurs with deduplication
              const links = await this.getLinks();

              // Add small delay to prevent overwhelming the UI with rapid updates
              setTimeout(() => {
                callback(links);
              }, 50);

            } catch (error) {
              logger.error('[Realtime] Error handling link changes:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                eventType: payload.eventType,
                table: payload.table,
                timestamp: new Date().toISOString()
              });
              performanceMonitor.trackError({
                message: `Realtime link change error: ${(error as Error).message}`,
                severity: 'medium',
                context: { event: payload.eventType, table: 'links' }
              });
            }
          }
        )
        .on('system', {}, (payload) => {
          logger.debug(`[Realtime] System event:`, payload);
          if (payload.status === 'CHANNEL_ERROR') {
            logger.error('[Realtime] Channel error for links:', payload);
            performanceMonitor.trackError({
              message: 'Realtime channel error',
              severity: 'high',
              context: { channel: 'links', payload }
            });
          }
        })
        .subscribe((status, err) => {
          logger.info(`[Realtime] Links subscription status: ${status}${err ? ` (error: ${err.message})` : ''}`);
          
          if (status === 'SUBSCRIBED') {
            logger.info('[Realtime] Successfully subscribed to links changes');
            retryCount = 0; // Reset retry count on successful connection
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('[Realtime] Failed to subscribe to links changes', err);

            // Retry connection with exponential backoff
            if (retryCount < maxRetries && !unsubscribeRequested) {
              retryCount++;
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              logger.info(`[Realtime] Retrying links subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);

              setTimeout(() => {
                if (this.activeChannels.has(channelName) && !unsubscribeRequested) {
                  const ch = this.activeChannels.get(channelName);
                  try {
                    if (ch) {
                      this.supabase.removeChannel(ch);
                    }
                  } catch (error) {
                    logger.warn('[Realtime] Error removing channel during retry:', error);
                  }
                  this.activeChannels.delete(channelName);
                  createSubscription();
                }
              }, delay);
            } else {
              logger.error('[Realtime] Max retries reached for links subscription');
              performanceMonitor.trackError({
                message: 'Links subscription failed after max retries',
                severity: 'high',
                context: { maxRetries, channelName }
              });
            }
          } else if (status === 'CLOSED') {
            logger.info('[Realtime] Links subscription closed');
          } else if (status === 'TIMED_OUT') {
            logger.warn('[Realtime] Links subscription timed out');
          }
        });

      this.activeChannels.set(channelName, channel);
    };

    createSubscription();

    return () => {
      unsubscribeRequested = true;
      logger.info('[Realtime] Unsubscribing from links changes');
      // Safely unsubscribe
      if (this.activeChannels.has(channelName)) {
        const ch = this.activeChannels.get(channelName);
        try {
          if (ch) {
            this.supabase.removeChannel(ch);
          }
        } catch (error) {
          logger.warn('[Realtime] Error removing channel during unsubscribe:', error);
        }
        this.activeChannels.delete(channelName);
      }
    };
  }

  /**
   * Subscribe to folder changes with improved error handling
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToFolders(callback: (folders: Folder[]) => void): () => void {
    const channelName = 'folders-changes';

    // Remove existing channel if it exists to prevent duplicates
    if (this.activeChannels.has(channelName)) {
      const existingChannel = this.activeChannels.get(channelName);
      try {
        if (existingChannel) {
          this.supabase.removeChannel(existingChannel);
        }
      } catch (error) {
        logger.warn('Error removing existing channel:', error);
      }
      this.activeChannels.delete(channelName);
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    let unsubscribeRequested = false;

    const createSubscription = () => {
      if (unsubscribeRequested) return;

      const channel = this.supabase
        .channel(channelName, {
          config: {
            presence: {
              key: 'user_id',
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'folders',
          },
          async (payload) => {
            try {
              // Clear cache to force fresh fetch
              const { data: { user } } = await this.supabase.auth.getUser();
              if (user) {
                this.invalidateCache(['folders', `user:${user.id}`]);
              }
              // Refetch all folders when any change occurs
              const folders = await this.getFolders();
              callback(folders);
            } catch (error) {
              logger.error('Error handling realtime folder changes:', error);
              performanceMonitor.trackError({
                message: `Realtime folder change error: ${(error as Error).message}`,
                severity: 'medium',
                context: { event: payload.eventType, table: 'folders' }
              });
            }
          }
        )
        .on('system', {}, (payload) => {
          if (payload.status === 'CHANNEL_ERROR') {
            logger.error('Realtime channel error for folders:', payload);
            performanceMonitor.trackError({
              message: 'Realtime channel error',
              severity: 'high',
              context: { channel: 'folders', payload }
            });
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug('Successfully subscribed to folders changes');
            retryCount = 0; // Reset retry count on successful connection
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('Failed to subscribe to folders changes');

            // Retry connection with exponential backoff
            if (retryCount < maxRetries && !unsubscribeRequested) {
              retryCount++;
              const delay = retryDelay * Math.pow(2, retryCount - 1);
              logger.debug(`Retrying folders subscription in ${delay}ms (attempt ${retryCount}/${maxRetries})`);

              setTimeout(() => {
                if (this.activeChannels.has(channelName) && !unsubscribeRequested) {
                  const ch = this.activeChannels.get(channelName);
                  try {
                    if (ch) {
                      this.supabase.removeChannel(ch);
                    }
                  } catch (error) {
                    logger.warn('Error removing channel during retry:', error);
                  }
                  this.activeChannels.delete(channelName);
                  createSubscription();
                }
              }, delay);
            } else {
              logger.error('Max retries reached for folders subscription');
              performanceMonitor.trackError({
                message: 'Folders subscription failed after max retries',
                severity: 'high',
                context: { maxRetries, channelName }
              });
            }
          } else if (status === 'CLOSED') {
            logger.debug('Folders subscription closed');
          }
        });

      this.activeChannels.set(channelName, channel);
    };

    createSubscription();

    return () => {
      unsubscribeRequested = true;
      // Safely unsubscribe
      if (this.activeChannels.has(channelName)) {
        const ch = this.activeChannels.get(channelName);
        try {
          if (ch) {
            this.supabase.removeChannel(ch);
          }
        } catch (error) {
          logger.warn('Error removing channel during unsubscribe:', error);
        }
        this.activeChannels.delete(channelName);
      }
    };
  }

  /**
   * Delete all links for current user
   */
  async deleteAllLinks(): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('links')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    // Clear cache after mutation
    this.invalidateCache(['links', `user:${user.id}`]);
  }

  /**
   * Delete all folders for current user
   */
  async deleteAllFolders(): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('folders')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    // Clear cache after mutation
    this.invalidateCache(['folders', `user:${user.id}`]);
  }

  /**
   * Delete user settings
   */
  async deleteUserSettings(): Promise<void> {
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if (authError || !user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    // Clear cache after mutation
    this.invalidateCache(['settings', `user:${user.id}`]);
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * Bulk update multiple links with the same updates
   * @param {string[]} ids - Array of link IDs to update
   * @param {Partial<Link>} updates - Updates to apply to all links
   * @returns {Promise<Link[]>} Updated links
   */
  async bulkUpdateLinks(ids: string[], updates: Partial<Link>): Promise<Link[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return [];

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);

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
        throw new DatabaseError('Failed to bulk update links - no data returned', { linkIds: ids });
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

      return links;
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk update links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk soft delete multiple links (move to trash)
   * @param {string[]} ids - Array of link IDs to delete
   * @returns {Promise<void>}
   */
  async bulkDeleteLinks(ids: string[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return;

      const { error } = await this.supabase
        .from('links')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to bulk delete links', { linkIds: ids }, error as Error);
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);
    } catch (error) {
      logger.error('Error bulk deleting links:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk delete links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk restore multiple links from trash
   * @param {string[]} ids - Array of link IDs to restore
   * @returns {Promise<void>}
   */
  async bulkRestoreLinks(ids: string[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return;

      const { error } = await this.supabase
        .from('links')
        .update({
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to bulk restore links', { linkIds: ids }, error as Error);
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);
    } catch (error) {
      logger.error('Error bulk restoring links:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk restore links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk permanently delete multiple links
   * @param {string[]} ids - Array of link IDs to permanently delete
   * @returns {Promise<void>}
   */
  async bulkPermanentlyDeleteLinks(ids: string[]): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new AuthenticationError('User not authenticated');
      }

      if (ids.length === 0) return;

      const { error } = await this.supabase
        .from('links')
        .delete()
        .in('id', ids)
        .eq('user_id', user.id);

      if (error) {
        throw new DatabaseError('Failed to bulk permanently delete links', { linkIds: ids }, error as Error);
      }

      // Invalidate cache BEFORE operation to prevent race conditions
      this.invalidateCache(['links', `user:${user.id}`]);
    } catch (error) {
      logger.error('Error bulk permanently deleting links:', error);
      if (error instanceof DatabaseError || error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Failed to bulk permanently delete links', { linkIds: ids }, error as Error);
    }
  }

  /**
   * Bulk move multiple links to a specific folder
   * @param {string[]} ids - Array of link IDs to move
   * @param {string | null} folderId - Target folder ID (null for root)
   * @returns {Promise<Link[]>} Updated links
   */
  async bulkMoveLinks(ids: string[], folderId: string | null): Promise<Link[]> {
    return this.bulkUpdateLinks(ids, { folderId });
  }

  /**
   * Bulk toggle favorite status for multiple links
   * @param {string[]} ids - Array of link IDs to toggle
   * @param {boolean} isFavorite - New favorite status
   * @returns {Promise<Link[]>} Updated links
   */
  async bulkToggleFavoriteLinks(ids: string[], isFavorite: boolean): Promise<Link[]> {
    return this.bulkUpdateLinks(ids, { isFavorite });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Transform link from database schema to app schema
   * @param {DatabaseLink} dbLink - Link from database
   * @returns {Link} Transformed link
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

  /**
   * Transform folder from database schema to app schema
   * @param {DatabaseFolder} dbFolder - Folder from database
   * @returns {Folder} Transformed folder
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
      platform: dbFolder.platform as Platform | undefined,
      createdAt: dbFolder.created_at,
      updatedAt: dbFolder.updated_at,
    };
  }

  /**
   * Unsubscribe from all active realtime subscriptions
   * Useful for cleanup on logout
   */
  unsubscribeAll(): void {
    try {
      logger.debug(`Unsubscribing from ${this.activeChannels.size} active channels`);

      // Remove all channels
      for (const [channelName, channel] of this.activeChannels.entries()) {
        try {
          this.supabase.removeChannel(channel);
          logger.debug(`Removed channel: ${channelName}`);
        } catch (error) {
          logger.warn(`Error removing channel ${channelName}:`, error);
        }
      }

      // Clear the map
      this.activeChannels.clear();
    } catch (error) {
      logger.error('Error unsubscribing from all channels:', error);
    }
  }
}

// Export singleton instance
export const supabaseDatabaseService = new SupabaseDatabaseService();
