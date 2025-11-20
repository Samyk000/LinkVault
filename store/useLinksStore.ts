/**
 * @file store/useLinksStore.ts
 * @description Link state management
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { create } from 'zustand';
import { Link } from '@/types';
import { linksDatabaseService } from '@/lib/services/links-database.service';
import { sanitizeLinkData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';
import { detectMobileBrowser } from '@/lib/utils/platform';
import { createClient } from '@/lib/supabase/client';

interface LinksState {
  // State
  links: Link[];
  isLoading: boolean;
  editingLinkId: string | null;

  // Actions - State Management
  setLinks: (links: Link[]) => void;
  setLoading: (isLoading: boolean) => void;

  // Actions - Single Link Operations
  addLink: (linkData: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => Promise<void>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  restoreLink: (id: string) => Promise<void>;
  permanentlyDeleteLink: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;

  // Actions - Bulk Link Operations
  bulkUpdateLinks: (ids: string[], updates: Partial<Link>) => Promise<void>;
  bulkDeleteLinks: (ids: string[]) => Promise<void>;
  bulkRestoreLinks: (ids: string[]) => Promise<void>;
  bulkMoveLinks: (ids: string[], folderId: string | null) => Promise<void>;
  bulkToggleFavoriteLinks: (ids: string[], isFavorite: boolean) => Promise<void>;

  // Actions - Trash Operations
  emptyTrash: () => Promise<void>;
  restoreAllFromTrash: () => Promise<void>;

  // Actions - UI State
  setEditingLink: (linkId: string | null) => void;
}

export const useLinksStore = create<LinksState>((set, get) => ({
  // Initial State
  links: [],
  isLoading: false,
  editingLinkId: null,

  /**
   * Sets the links array directly
   * @param {Link[]} links - Array of links to set
   */
  setLinks: (links) => set({ links }),

  /**
   * Sets the loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Adds a new link with enhanced session validation and reliability
   * @param {Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>} linkData - Link data to create
   * @returns {Promise<void>}
   * @throws {Error} When link creation fails
   */
  addLink: async (linkData) => {
    const browserInfo = detectMobileBrowser();

    try {
      // CRITICAL: Sanitize input data to prevent XSS
      const sanitizedData = sanitizeLinkData(linkData);

      // ENHANCED: Validate session before attempting to save
      let user = null;
      try {
        const { data: { user: currentUser } } = await createClient().auth.getUser();
        user = currentUser;

        if (!user) {
          throw new Error('User not authenticated. Please log in again.');
        }
      } catch (sessionError) {
        logger.warn('Session validation failed before adding link:', sessionError);
        // Wait a moment and retry session validation (helps with timing issues)
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: { user: retryUser } } = await createClient().auth.getUser();
        user = retryUser;

        if (!user) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }
      }

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tempLink: Link = {
        ...sanitizedData,
        id: tempId,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update with conflict detection
      set((state) => {
        // Check for existing links with same URL to prevent duplicates
        const existingLink = state.links.find(link =>
          !link.id.startsWith('temp-') &&
          link.url === linkData.url &&
          link.deletedAt === null
        );

        if (existingLink) {
          logger.warn('Duplicate link detected, skipping optimistic update');
          return state;
        }

        return { links: [...state.links, tempLink] };
      });

      // ENHANCED: Add timeout protection with mobile-specific duration and retry logic
      const timeoutDuration = browserInfo.isMobile ? 12000 : 8000; // Reduced timeout for better UX (8s desktop, 12s mobile)
      const maxRetries = 1; // Reduce retries to 1 to fail faster
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const savePromise = linksDatabaseService.addLink(sanitizedData);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Add link timeout - please check your connection')), timeoutDuration)
          );

          const newLink = await Promise.race([savePromise, timeoutPromise]);

          // Replace temp link with real link, handling potential conflicts
          set((state) => {
            const filteredLinks = state.links.filter((link) => link.id !== tempId);
            // Check if real link already exists (from real-time subscription)
            const existingRealLink = filteredLinks.find(link => link.id === newLink.id);
            if (existingRealLink) {
              logger.debug('Link already exists from real-time update, skipping duplicate');
              return { links: filteredLinks };
            }
            return { links: [...filteredLinks, newLink] };
          });

          logger.debug('Link added successfully:', {
            id: newLink.id,
            url: newLink.url,
            attempt: attempt + 1
          });
          return; // Success, exit the function

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');

          // Don't retry on certain errors that won't improve
          if (error instanceof Error && (
            error.message?.includes('authentication') ||
            error.message?.includes('not authenticated') ||
            error.message?.includes('timeout'))) {
            break;
          }

          // Wait before retry with exponential backoff
          if (attempt < maxRetries) {
            const delay = 500 * Math.pow(2, attempt); // 500ms, 1s
            logger.warn(`Link save attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // If we get here, all retries failed
      throw lastError || new Error('Failed to save link after multiple attempts');

    } catch (error) {
      // Enhanced error handling with rollback
      set((state) => ({
        links: state.links.filter((link) => !link.id.startsWith('temp-')),
      }));

      logger.error('Error adding link:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        linkData: { url: linkData.url, title: linkData.title },
        isMobile: browserInfo.isMobile,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Updates an existing link with sanitization and validation
   * @param {string} id - Link ID
   * @param {Partial<Link>} updates - Fields to update
   * @returns {Promise<void>}
   * @throws {Error} When link update fails
   */
  updateLink: async (id, updates) => {
    try {
      const originalLink = get().links.find((link) => link.id === id);
      if (!originalLink) {
        throw new Error(`Link with ID ${id} not found`);
      }

      // CRITICAL: Sanitize update data to prevent XSS
      const sanitizedUpdates = sanitizeLinkData(updates);

      // Optimistic update with validation
      const updatedLink = {
        ...originalLink,
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
      };

      set((state) => ({
        links: state.links.map((link) =>
          link.id === id ? updatedLink : link
        ),
      }));

      // ENHANCED: Add timeout protection to prevent hanging updates
      const updatePromise = linksDatabaseService.updateLink(id, sanitizedUpdates);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Update link timeout - please check your connection and try again')), 10000)
      );

      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error) {
      // Revert optimistic update on error
      const originalLink = get().links.find((link) => link.id === id);
      if (originalLink) {
        set((state) => ({
          links: state.links.map((link) => (link.id === id ? originalLink : link)),
        }));
      }

      logger.error('Error updating link:', {
        linkId: id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Soft deletes a link (moves to trash)
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When link deletion fails
   */
  deleteLink: async (id) => {
    const deletedAt = new Date().toISOString();
    const originalLink = get().links.find((link) => link.id === id);

    if (!originalLink) {
      throw new Error(`Link with ID ${id} not found`);
    }

    try {
      // Optimistic update with validation
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id ? { ...link, deletedAt, updatedAt: deletedAt } : link
        ),
      }));

      // ENHANCED: Add timeout protection to prevent hanging deletes
      const deletePromise = linksDatabaseService.deleteLink(id);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Delete link timeout - please check your connection and try again')), 10000)
      );

      await Promise.race([deletePromise, timeoutPromise]);
    } catch (error) {
      // Revert optimistic update on error
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id ? { ...link, deletedAt: null, updatedAt: originalLink.updatedAt } : link
        ),
      }));

      logger.error('Error deleting link:', {
        linkId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Restores a link from trash
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When link restoration fails
   */
  restoreLink: async (id) => {
    try {
      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id
            ? { ...link, deletedAt: null, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.restoreLink(id);
    } catch (error) {
      // Revert on error
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id
            ? { ...link, deletedAt: new Date().toISOString() }
            : link
        ),
      }));
      logger.error('Error restoring link:', error);
      throw error;
    }
  },

  /**
   * Permanently deletes a link
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When permanent deletion fails
   */
  permanentlyDeleteLink: async (id) => {
    // Store for rollback BEFORE optimistic update
    const linkToDelete = get().links.find((link) => link.id === id);
    if (!linkToDelete) {
      throw new Error('Link not found');
    }

    try {
      // Optimistic delete
      set((state) => ({ links: state.links.filter((link) => link.id !== id) }));

      // Delete from database
      await linksDatabaseService.permanentlyDeleteLink(id);
    } catch (error) {
      // Revert on error - restore the deleted link
      set((state) => ({ links: [...state.links, linkToDelete] }));
      logger.error('Error permanently deleting link:', error);
      throw error;
    }
  },

  /**
   * Toggles favorite status of a link
   * @param {string} id - Link ID
   * @returns {Promise<void>}
   * @throws {Error} When favorite toggle fails
   */
  toggleFavorite: async (id) => {
    try {
      const link = get().links.find((l) => l.id === id);
      if (!link) return;

      const newFavoriteState = !link.isFavorite;

      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id
            ? { ...link, isFavorite: newFavoriteState, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.updateLink(id, { isFavorite: newFavoriteState });
    } catch (error) {
      // Revert on error
      set((state) => ({
        links: state.links.map((link) =>
          link.id === id ? { ...link, isFavorite: !link.isFavorite } : link
        ),
      }));
      logger.error('Error toggling favorite:', error);
      throw error;
    }
  },

  /**
   * Bulk updates multiple links with the same updates
   * @param {string[]} ids - Array of link IDs to update
   * @param {Partial<Link>} updates - Updates to apply to all links
   * @returns {Promise<void>}
   * @throws {Error} When bulk update fails
   */
  bulkUpdateLinks: async (ids, updates) => {
    if (ids.length === 0) return;

    const browserInfo = detectMobileBrowser();

    try {
      // Store original links for rollback with enhanced conflict detection
      const originalLinks = get().links.filter(link => ids.includes(link.id));

      // Optimistic update with conflict detection
      set((state) => {
        const updatedLinks = state.links.map((link) => {
          if (ids.includes(link.id)) {
            // Check for version conflicts (if updatedAt is newer)
            const original = originalLinks.find(orig => orig.id === link.id);
            if (original && link.updatedAt > original.updatedAt) {
              logger.warn('Version conflict detected, skipping optimistic update for link:', link.id);
              return link; // Keep the newer version
            }
            return { ...link, ...updates, updatedAt: new Date().toISOString() };
          }
          return link;
        });
        return { links: updatedLinks };
      });

      // Update in database with timeout protection
      const timeoutDuration = browserInfo.isMobile ? 20000 : 15000;
      const updatePromise = linksDatabaseService.bulkUpdateLinks(ids, updates);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Bulk update timeout - please check your connection')), timeoutDuration)
      );

      await Promise.race([updatePromise, timeoutPromise]);
    } catch (error) {
      // Enhanced rollback with conflict resolution
      const originalLinks = get().links.filter(link => ids.includes(link.id));
      set((state) => ({
        links: state.links.map((link) => {
          const original = originalLinks.find(orig => orig.id === link.id);
          return original || link;
        }),
      }));

      logger.error('Error bulk updating links:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        linkIds: ids,
        updates,
        isMobile: browserInfo.isMobile,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Bulk soft deletes multiple links (moves to trash)
   * @param {string[]} ids - Array of link IDs to delete
   * @returns {Promise<void>}
   * @throws {Error} When bulk deletion fails
   */
  bulkDeleteLinks: async (ids) => {
    if (ids.length === 0) return;

    const deletedAt = new Date().toISOString();

    try {
      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id)
            ? { ...link, deletedAt, updatedAt: deletedAt }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.bulkDeleteLinks(ids);
    } catch (error) {
      // Revert on error
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id) ? { ...link, deletedAt: null } : link
        ),
      }));
      logger.error('Error bulk deleting links:', error);
      throw error;
    }
  },

  /**
   * Bulk restores multiple links from trash
   * @param {string[]} ids - Array of link IDs to restore
   * @returns {Promise<void>}
   * @throws {Error} When bulk restoration fails
   */
  bulkRestoreLinks: async (ids) => {
    if (ids.length === 0) return;

    try {
      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id)
            ? { ...link, deletedAt: null, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.bulkRestoreLinks(ids);
    } catch (error) {
      // Revert on error
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id)
            ? { ...link, deletedAt: new Date().toISOString() }
            : link
        ),
      }));
      logger.error('Error bulk restoring links:', error);
      throw error;
    }
  },

  /**
   * Bulk moves multiple links to a specific folder
   * @param {string[]} ids - Array of link IDs to move
   * @param {string | null} folderId - Target folder ID (null for root)
   * @returns {Promise<void>}
   * @throws {Error} When bulk move fails
   */
  bulkMoveLinks: async (ids, folderId) => {
    if (ids.length === 0) return;

    // Store original folder IDs for rollback BEFORE optimistic update
    const originalLinks = get().links
      .filter(link => ids.includes(link.id))
      .map(link => ({ id: link.id, folderId: link.folderId }));

    try {
      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id)
            ? { ...link, folderId, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database with timeout protection
      await Promise.race([
        linksDatabaseService.bulkMoveLinks(ids, folderId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Move links timeout - please check your connection')), 10000)
        )
      ]);
    } catch (error) {
      // Revert on error - restore original folder IDs
      set((state) => ({
        links: state.links.map((link) => {
          const original = originalLinks.find(orig => orig.id === link.id);
          return original ? { ...link, folderId: original.folderId } : link;
        }),
      }));
      logger.error('Error bulk moving links:', error);
      throw error;
    }
  },

  /**
   * Bulk toggles favorite status for multiple links
   * @param {string[]} ids - Array of link IDs to toggle
   * @param {boolean} isFavorite - New favorite status
   * @returns {Promise<void>}
   * @throws {Error} When bulk favorite toggle fails
   */
  bulkToggleFavoriteLinks: async (ids, isFavorite) => {
    if (ids.length === 0) return;

    try {
      // Store original favorite states for rollback
      const originalLinks = get().links.filter(link => ids.includes(link.id));

      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          ids.includes(link.id)
            ? { ...link, isFavorite, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.bulkToggleFavoriteLinks(ids, isFavorite);
    } catch (error) {
      // Revert on error
      const originalLinks = get().links.filter(link => ids.includes(link.id));
      set((state) => ({
        links: state.links.map((link) => {
          const original = originalLinks.find(orig => orig.id === link.id);
          return original || link;
        }),
      }));
      logger.error('Error bulk toggling favorites:', error);
      throw error;
    }
  },

  /**
   * Permanently deletes all trashed links
   * @returns {Promise<void>}
   * @throws {Error} When emptying trash fails
   */
  emptyTrash: async () => {
    // Store deleted links for rollback BEFORE optimistic update
    const deletedLinks = get().links.filter((link) => link.deletedAt !== null);

    try {
      // Optimistic delete
      set((state) => ({
        links: state.links.filter((link) => link.deletedAt === null),
      }));

      // Delete from database
      await linksDatabaseService.emptyTrash();
    } catch (error) {
      // Revert on error - restore deleted links
      set((state) => ({ links: [...state.links, ...deletedLinks] }));
      logger.error('Error emptying trash:', error);
      throw error;
    }
  },

  /**
   * Restores all trashed links
   * @returns {Promise<void>}
   * @throws {Error} When restoring all from trash fails
   */
  restoreAllFromTrash: async () => {
    // Store original state BEFORE optimistic update
    const originalLinks = get().links.map(link => ({ ...link }));

    try {
      // Optimistic update
      set((state) => ({
        links: state.links.map((link) =>
          link.deletedAt !== null
            ? { ...link, deletedAt: null, updatedAt: new Date().toISOString() }
            : link
        ),
      }));

      // Update in database
      await linksDatabaseService.restoreAllFromTrash();
    } catch (error) {
      // Revert on error - restore original state
      set({ links: originalLinks });
      logger.error('Error restoring all from trash:', error);
      throw error;
    }
  },

  /**
   * Sets the currently editing link ID
   * @param {string | null} linkId - Link ID to edit
   */
  setEditingLink: (linkId) => {
    set({ editingLinkId: linkId });
  },
}));