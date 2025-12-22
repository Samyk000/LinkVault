/**
 * @file store/useFoldersStore.ts
 * @description Folder state management
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { create } from 'zustand';
import { Folder } from '@/types';
import { supabaseDatabaseService } from '@/lib/services/supabase-database.service';
import { guestStorageService } from '@/lib/services/guest-storage.service';
import { sanitizeFolderData } from '@/lib/utils/sanitization';
import { logger } from '@/lib/utils/logger';

/**
 * Helper to check if guest mode is active
 */
const isGuestMode = (): boolean => {
  return guestStorageService.isGuestMode();
};

interface FoldersState {
  // State
  folders: Folder[];
  isLoading: boolean;
  editingFolderId: string | null;
  parentFolderId: string | null; // For creating sub-folders
  expandedFolders: Set<string>;

  // Actions - State Management
  setFolders: (folders: Folder[]) => void;
  setLoading: (isLoading: boolean) => void;

  // Actions - Single Folder Operations
  addFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderExpanded: (id: string) => void;
  setParentFolder: (folderId: string | null) => void;

  // Actions - UI State
  setEditingFolder: (folderId: string | null) => void;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  // Initial State
  folders: [],
  isLoading: false,
  editingFolderId: null,
  parentFolderId: null,
  expandedFolders: new Set<string>(),

  /**
   * Sets the folders array directly
   * @param {Folder[]} folders - Array of folders to set
   */
  setFolders: (folders) => set({ folders }),

  /**
   * Sets the loading state
   * @param {boolean} isLoading - Loading state
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Adds a new folder with sanitization and validation
   * @param {Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>} folderData - Folder data to create
   * @returns {Promise<void>}
   * @throws {Error} When folder creation fails
   */
  addFolder: async (folderData) => {
    const tempId = `temp-${Date.now()}`; // Declare outside try block for catch block access

    try {
      // CRITICAL: Sanitize input data to prevent XSS
      const sanitizedData = sanitizeFolderData(folderData);

      // GUEST MODE: Use local storage instead of database
      if (isGuestMode()) {
        const newFolder = await guestStorageService.addFolder(sanitizedData);
        set((state) => ({ folders: [...state.folders, newFolder] }));
        logger.debug('Folder added in guest mode:', { id: newFolder.id, name: newFolder.name });
        return;
      }

      const tempFolder: Folder = {
        ...sanitizedData,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      set((state) => ({ folders: [...state.folders, tempFolder] }));

      // PHASE 2B FIX: Increased timeout from 5s to 15s for better reliability on slow connections
      const savePromise = supabaseDatabaseService.addFolder(sanitizedData);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Folder creation timeout - please check your connection and try again')), 15000)
      );

      const newFolder = await Promise.race([savePromise, timeoutPromise]);

      // Replace temp folder with real folder from database
      set((state) => ({
        folders: state.folders.map((folder) => (folder.id === tempId ? newFolder : folder)),
      }));

      logger.debug('Folder added successfully:', { id: newFolder.id, name: newFolder.name });
    } catch (error) {
      // Revert optimistic update on error
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== tempId && !folder.id.startsWith('temp-')),
      }));

      logger.error('Error adding folder:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        folderData: { name: folderData.name },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Updates an existing folder with sanitization and validation
   * @param {string} id - Folder ID
   * @param {Partial<Folder>} updates - Fields to update
   * @returns {Promise<void>}
   * @throws {Error} When folder update fails
   */
  updateFolder: async (id, updates) => {
    try {
      const originalFolder = get().folders.find((folder) => folder.id === id);
      if (!originalFolder) {
        throw new Error(`Folder with ID ${id} not found`);
      }

      // CRITICAL: Sanitize update data to prevent XSS
      const sanitizedUpdates = sanitizeFolderData(updates);

      // Optimistic update with validation
      const updatedFolder = {
        ...originalFolder,
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
      };

      set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === id ? updatedFolder : folder
        ),
      }));

      // GUEST MODE: Use local storage instead of database
      if (isGuestMode()) {
        await guestStorageService.updateFolder(id, sanitizedUpdates);
        return;
      }

      // ENHANCED: Add timeout protection with better error message
      const updatePromise = supabaseDatabaseService.updateFolder(id, sanitizedUpdates);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Update folder timeout - please check your connection and try again')), 10000)
      );

      await Promise.race([updatePromise, timeoutPromise]);

      logger.debug('Folder updated successfully:', { id, updates });
    } catch (error) {
      // Revert optimistic update on error
      const originalFolder = get().folders.find((folder) => folder.id === id);
      if (originalFolder) {
        set((state) => ({
          folders: state.folders.map((folder) => (folder.id === id ? originalFolder : folder)),
        }));
      }

      logger.error('Error updating folder:', {
        folderId: id,
        updates,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Deletes a folder and moves its links to root
   * @param {string} id - Folder ID
   * @returns {Promise<void>}
   * @throws {Error} When folder deletion fails
   */
  deleteFolder: async (id) => {
    // Store original state for rollback BEFORE optimistic update
    const originalFolders = [...get().folders];

    try {
      const folderToDelete = get().folders.find((folder) => folder.id === id);
      if (!folderToDelete) {
        throw new Error(`Folder with ID ${id} not found`);
      }

      // Optimistic update - remove folder immediately
      // Note: Links are handled separately by the database service (folderId set to null)
      set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== id),
      }));

      // GUEST MODE: Use local storage instead of database
      if (isGuestMode()) {
        await guestStorageService.deleteFolder(id);
        logger.debug('Folder deleted in guest mode:', { id, name: folderToDelete.name });
        return;
      }

      // ENHANCED: Add timeout protection with better error message
      const deletePromise = supabaseDatabaseService.deleteFolder(id);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Delete folder timeout - please check your connection and try again')), 10000)
      );

      await Promise.race([deletePromise, timeoutPromise]);

      logger.debug('Folder deleted successfully:', { id, name: folderToDelete.name });
    } catch (error) {
      // Revert optimistic update on error - restore original state
      const folderToDelete = get().folders.find((folder) => folder.id === id);
      if (!folderToDelete) {
        // Restore folder if it was deleted optimistically - use captured original state
        set((state) => ({
          folders: originalFolders,
        }));
      }

      logger.error('Error deleting folder:', {
        folderId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  },

  /**
   * Toggles the expanded state of a folder
   * @param {string} id - Folder ID
   */
  toggleFolderExpanded: (id) => {
    set((state) => {
      const newExpanded = new Set(state.expandedFolders);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return { expandedFolders: newExpanded };
    });
  },

  /**
   * Sets the parent folder ID for creating sub-folders
   * @param {string | null} folderId - Parent folder ID (null for root)
   */
  setParentFolder: (folderId) => {
    set({ parentFolderId: folderId });
  },

  /**
   * Sets the currently editing folder ID
   * @param {string | null} folderId - Folder ID to edit
   */
  setEditingFolder: (folderId) => {
    set({ editingFolderId: folderId });
  },
}));