/**
 * @file store/useUIStore.ts
 * @description UI state management
 * @created 2025-11-12
 * @modified 2025-11-12
 */

import { create } from 'zustand';
import { SearchFilters } from '@/types';

interface UIState {
  // App State
  isHydrated: boolean;
  isLoadingData: boolean; // NEW: Track overall data loading state
  
  // Modal States
  isAddLinkModalOpen: boolean;
  isCreateFolderModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isProfileModalOpen: boolean;
  isBulkDeleteModalOpen: boolean;
  isBulkMoveModalOpen: boolean;
  isFolderDeleteModalOpen: boolean;
  isEmptyTrashModalOpen: boolean;
  isRestoreAllModalOpen: boolean;
  
  // Selection States
  selectedFolderId: string | null;
  editingLinkId: string | null;
  editingFolderId: string | null;
  parentFolderId: string | null; // For creating sub-folders
  
  // View States
  currentView: 'all' | 'favorites' | 'trash';
  searchFilters: SearchFilters;
  expandedFolders: Set<string>;
  
  // Bulk Selection State
  selectedLinkIds: Set<string>;
  
  // Folder to Delete State
  folderToDelete: { id: string; name: string; linkCount: number } | null;
  
  // Actions - App State
  setHydrated: (isHydrated: boolean) => void;
  setIsLoadingData: (isLoading: boolean) => void; // NEW: Track data loading
  
  // Actions - Modal Controls
  setAddLinkModalOpen: (isOpen: boolean) => void;
  setCreateFolderModalOpen: (isOpen: boolean) => void;
  setSettingsModalOpen: (isOpen: boolean) => void;
  setProfileModalOpen: (isOpen: boolean) => void;
  setBulkDeleteModalOpen: (isOpen: boolean) => void;
  setBulkMoveModalOpen: (isOpen: boolean) => void;
  setFolderDeleteModalOpen: (isOpen: boolean) => void;
  setEmptyTrashModalOpen: (isOpen: boolean) => void;
  setRestoreAllModalOpen: (isOpen: boolean) => void;
  
  // Actions - Selection Controls
  setSelectedFolder: (folderId: string | null) => void;
  setEditingLink: (linkId: string | null) => void;
  setEditingFolder: (folderId: string | null) => void;
  setParentFolder: (folderId: string | null) => void;
  
  // Actions - View Controls
  setCurrentView: (view: 'all' | 'favorites' | 'trash') => void;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  toggleFolderExpanded: (id: string) => void;
  
  // Actions - Bulk Selection
  toggleLinkSelection: (linkId: string) => void;
  clearLinkSelection: () => void;
  selectAllLinks: (linkIds: string[]) => void;
  
  // Actions - Folder Delete
  setFolderToDelete: (folder: { id: string; name: string; linkCount: number } | null) => void;
  
  // Actions - UI State Reset
  resetUIState: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial App State
  isHydrated: false,
  isLoadingData: false, // NEW: Initial state
  
  // Initial Modal States
  isAddLinkModalOpen: false,
  isCreateFolderModalOpen: false,
  isSettingsModalOpen: false,
  isProfileModalOpen: false,
  isBulkDeleteModalOpen: false,
  isBulkMoveModalOpen: false,
  isFolderDeleteModalOpen: false,
  isEmptyTrashModalOpen: false,
  isRestoreAllModalOpen: false,
  
  // Initial Selection States
  selectedFolderId: null,
  editingLinkId: null,
  editingFolderId: null,
  parentFolderId: null,
  
  // Initial View States
  currentView: 'all',
  searchFilters: {
    query: '',
  },
  expandedFolders: new Set<string>(),
  
  // Initial Bulk Selection State
  selectedLinkIds: new Set<string>(),
  
  // Initial Folder to Delete State
  folderToDelete: null,
  
  /**
   * Sets the hydration state of the app
   * @param {boolean} isHydrated - Whether the app has been hydrated
   */
  setHydrated: (isHydrated) => set({ isHydrated }),
  
  /**
   * Sets the overall data loading state
   * @param {boolean} isLoading - Whether data is loading
   */
  setIsLoadingData: (isLoading) => set({ isLoadingData: isLoading }),
  
  /**
   * Sets the add link modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setAddLinkModalOpen: (isOpen) => {
    set({ isAddLinkModalOpen: isOpen });
  },
  
  /**
   * Sets the create folder modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setCreateFolderModalOpen: (isOpen) => {
    set({ isCreateFolderModalOpen: isOpen });
  },
  
  /**
   * Sets the settings modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setSettingsModalOpen: (isOpen) => {
    set({ isSettingsModalOpen: isOpen });
  },
  
  /**
   * Sets the profile modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setProfileModalOpen: (isOpen) => {
    set({ isProfileModalOpen: isOpen });
  },
  
  /**
   * Sets the bulk delete modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setBulkDeleteModalOpen: (isOpen) => {
    set({ isBulkDeleteModalOpen: isOpen });
  },
  
  /**
   * Sets the bulk move modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setBulkMoveModalOpen: (isOpen) => {
    set({ isBulkMoveModalOpen: isOpen });
  },
  
  /**
   * Sets the folder delete modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setFolderDeleteModalOpen: (isOpen) => {
    set({ isFolderDeleteModalOpen: isOpen });
  },
  
  /**
   * Sets the empty trash modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setEmptyTrashModalOpen: (isOpen) => {
    set({ isEmptyTrashModalOpen: isOpen });
  },
  
  /**
   * Sets the restore all modal open state
   * @param {boolean} isOpen - Whether modal should be open
   */
  setRestoreAllModalOpen: (isOpen) => {
    set({ isRestoreAllModalOpen: isOpen });
  },
  
  /**
   * Sets the selected folder ID
   * @param {string | null} folderId - Folder ID to select
   */
  setSelectedFolder: (folderId) => {
    set({ selectedFolderId: folderId });
  },
  
  /**
   * Sets the currently editing link ID
   * @param {string | null} linkId - Link ID to edit
   */
  setEditingLink: (linkId) => {
    set({ editingLinkId: linkId });
  },
  
  /**
   * Sets the currently editing folder ID
   * @param {string | null} folderId - Folder ID to edit
   */
  setEditingFolder: (folderId) => {
    set({ editingFolderId: folderId });
  },
  
  /**
   * Sets the parent folder ID for creating sub-folders
   * @param {string | null} folderId - Parent folder ID (null for root)
   */
  setParentFolder: (folderId) => {
    set({ parentFolderId: folderId });
  },
  
  /**
   * Sets the current view (all, favorites, or trash)
   * @param {'all' | 'favorites' | 'trash'} view - View to set
   */
  setCurrentView: (view) => {
    set({ currentView: view });
  },
  
  /**
   * Updates search filters
   * @param {Partial<SearchFilters>} filters - Filters to update
   */
  setSearchFilters: (filters) => {
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...filters },
    }));
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
   * Toggles the selection state of a link
   * @param {string} linkId - Link ID to toggle
   */
  toggleLinkSelection: (linkId) => {
    set((state) => {
      const newSelected = new Set(state.selectedLinkIds);
      if (newSelected.has(linkId)) {
        newSelected.delete(linkId);
      } else {
        newSelected.add(linkId);
      }
      return { selectedLinkIds: newSelected };
    });
  },
  
  /**
   * Clears all link selections
   */
  clearLinkSelection: () => {
    set({ selectedLinkIds: new Set<string>() });
  },
  
  /**
   * Selects all links (would need to be called with actual link IDs)
   * @param {string[]} linkIds - Array of all link IDs to select
   */
  selectAllLinks: (linkIds) => {
    set({ selectedLinkIds: new Set(linkIds) });
  },
  
  /**
   * Sets the folder to delete with its metadata
   * @param {{ id: string; name: string; linkCount: number } | null} folder - Folder to delete
   */
  setFolderToDelete: (folder) => {
    set({ folderToDelete: folder });
  },
  
  /**
   * Resets all UI state to initial values
   */
  resetUIState: () => {
    set({
      // Reset Modal States
      isAddLinkModalOpen: false,
      isCreateFolderModalOpen: false,
      isSettingsModalOpen: false,
      isProfileModalOpen: false,
      isBulkDeleteModalOpen: false,
      isBulkMoveModalOpen: false,
      isFolderDeleteModalOpen: false,
      isEmptyTrashModalOpen: false,
      isRestoreAllModalOpen: false,
      
      // Reset Selection States
      selectedFolderId: null,
      editingLinkId: null,
      editingFolderId: null,
      parentFolderId: null,
      
      // Reset View States
      currentView: 'all',
      searchFilters: { query: '' },
      expandedFolders: new Set<string>(),
      
      // Reset Bulk Selection State
      selectedLinkIds: new Set<string>(),
      
      // Reset Folder to Delete State
      folderToDelete: null,
      
      // Reset Data Loading State
      isLoadingData: false, // NEW: Reset data loading state
    });
  },
}));