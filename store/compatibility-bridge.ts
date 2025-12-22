/**
 * @file store/compatibility-bridge.ts
 * @description Compatibility bridge between old useStore pattern and new modular stores
 * @created 2025-11-12
 * 
 * This bridge allows existing code using useStore to work with new modular stores
 * without requiring changes to 18+ files. This enables:
 * - Zero-risk deployment
 * - Immediate use of new architecture
 * - Gradual migration path
 * - Backwards compatibility
 */

import { useLinksStore } from './useLinksStore';
import { useFoldersStore } from './useFoldersStore';
import { useSettingsStore } from './useSettingsStore';
import { useUIStore } from './useUIStore';
import { useAuthStore } from './useAuthStore';
import { Link, Folder, AppSettings, SearchFilters } from '@/types';
import { User } from '@supabase/supabase-js';

/**
 * Combined store interface that matches the old useStore structure
 * This ensures complete backwards compatibility
 */
interface CombinedStore {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  
  // Data
  links: Link[];
  folders: Folder[];
  settings: AppSettings;
  
  // Loading states
  isLoadingData: boolean;
  isLoadingFolders: boolean;
  isLoadingLinks: boolean;
  isHydrated: boolean;
  
  // UI State
  isAddLinkModalOpen: boolean;
  isCreateFolderModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isProfileModalOpen: boolean;
  isBulkDeleteModalOpen: boolean;
  isBulkMoveModalOpen: boolean;
  isFolderDeleteModalOpen: boolean;
  isEmptyTrashModalOpen: boolean;
  isRestoreAllModalOpen: boolean;
  isShareFolderModalOpen: boolean;
  
  selectedFolderId: string | null;
  editingLinkId: string | null;
  editingFolderId: string | null;
  parentFolderId: string | null;
  currentView: 'all' | 'favorites' | 'trash';
  searchFilters: SearchFilters;
  expandedFolders: Set<string>;
  selectedLinkIds: Set<string>;
  folderToDelete: { id: string; name: string; linkCount: number } | null;
  folderToShare: { id: string; name: string; linkCount: number } | null;
  
  // Actions - Links
  addLink: (link: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>, userId?: string) => Promise<void>;
  updateLink: (id: string, updates: Partial<Link>) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  restoreLink: (id: string) => Promise<void>;
  permanentlyDeleteLink: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  bulkUpdateLinks: (ids: string[], updates: Partial<Link>) => Promise<void>;
  bulkDeleteLinks: (ids: string[]) => Promise<void>;
  bulkRestoreLinks: (ids: string[]) => Promise<void>;
  bulkMoveLinks: (ids: string[], folderId: string | null) => Promise<void>;
  bulkToggleFavoriteLinks: (ids: string[], isFavorite: boolean) => Promise<void>;
  emptyTrash: () => Promise<void>;
  restoreAllFromTrash: () => Promise<void>;
  
  // Actions - Folders
  addFolder: (folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderExpanded: (id: string) => void;
  
  // Actions - Settings
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  
  // Actions - UI
  setAddLinkModalOpen: (isOpen: boolean) => void;
  setCreateFolderModalOpen: (isOpen: boolean) => void;
  setSettingsModalOpen: (isOpen: boolean) => void;
  setProfileModalOpen: (isOpen: boolean) => void;
  setBulkDeleteModalOpen: (isOpen: boolean) => void;
  setBulkMoveModalOpen: (isOpen: boolean) => void;
  setFolderDeleteModalOpen: (isOpen: boolean) => void;
  setEmptyTrashModalOpen: (isOpen: boolean) => void;
  setRestoreAllModalOpen: (isOpen: boolean) => void;
  setShareFolderModalOpen: (isOpen: boolean) => void;
  setSelectedFolder: (folderId: string | null) => void;
  setEditingLink: (linkId: string | null) => void;
  setEditingFolder: (folderId: string | null) => void;
  setParentFolder: (folderId: string | null) => void;
  setCurrentView: (view: 'all' | 'favorites' | 'trash') => void;
  setSearchFilters: (filters: Partial<SearchFilters>) => void;
  toggleLinkSelection: (linkId: string) => void;
  clearLinkSelection: () => void;
  selectAllLinks: (linkIds: string[]) => void;
  setFolderToDelete: (folder: { id: string; name: string; linkCount: number } | null) => void;
  setFolderToShare: (folder: { id: string; name: string; linkCount: number } | null) => void;
  resetUIState: () => void;
  
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  
  // Legacy compatibility methods
  loadFromStorage: () => Promise<void>;
  clearData: () => void;
  exportData: () => string;
  importData: (jsonString: string) => Promise<boolean>;
}

/**
 * Compatibility hook that combines all modular stores
 * Usage remains exactly the same as old useStore:
 * 
 * @example
 * const { links, addLink, folders } = useStore();
 * const links = useStore((state) => state.links);
 */
export function useStoreCompat<T = CombinedStore>(
  selector?: (state: CombinedStore) => T
): T extends undefined ? CombinedStore : T {
  // Get all modular stores
  const authStore = useAuthStore();
  const linksStore = useLinksStore();
  const foldersStore = useFoldersStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();
  
  // Combine all stores into single interface
  const combined: CombinedStore = {
    // Auth
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signOut: authStore.signOut,
    refreshSession: authStore.refreshSession,
    
    // Links
    links: linksStore.links,
    isLoadingLinks: linksStore.isLoading,
    addLink: linksStore.addLink,
    updateLink: linksStore.updateLink,
    deleteLink: linksStore.deleteLink,
    restoreLink: linksStore.restoreLink,
    permanentlyDeleteLink: linksStore.permanentlyDeleteLink,
    toggleFavorite: linksStore.toggleFavorite,
    bulkUpdateLinks: linksStore.bulkUpdateLinks,
    bulkDeleteLinks: linksStore.bulkDeleteLinks,
    bulkRestoreLinks: linksStore.bulkRestoreLinks,
    bulkMoveLinks: linksStore.bulkMoveLinks,
    bulkToggleFavoriteLinks: linksStore.bulkToggleFavoriteLinks,
    emptyTrash: linksStore.emptyTrash,
    restoreAllFromTrash: linksStore.restoreAllFromTrash,
    
    // Folders
    folders: foldersStore.folders,
    isLoadingFolders: foldersStore.isLoading,
    expandedFolders: foldersStore.expandedFolders,
    addFolder: foldersStore.addFolder,
    updateFolder: foldersStore.updateFolder,
    deleteFolder: foldersStore.deleteFolder,
    toggleFolderExpanded: foldersStore.toggleFolderExpanded,
    
    // Settings
    settings: settingsStore.settings,
    loadSettings: settingsStore.loadSettings,
    updateSettings: settingsStore.updateSettings,
    
    // UI
    isAddLinkModalOpen: uiStore.isAddLinkModalOpen,
    isCreateFolderModalOpen: uiStore.isCreateFolderModalOpen,
    isSettingsModalOpen: uiStore.isSettingsModalOpen,
    isProfileModalOpen: uiStore.isProfileModalOpen,
    isBulkDeleteModalOpen: uiStore.isBulkDeleteModalOpen,
    isBulkMoveModalOpen: uiStore.isBulkMoveModalOpen,
    isFolderDeleteModalOpen: uiStore.isFolderDeleteModalOpen,
    isEmptyTrashModalOpen: uiStore.isEmptyTrashModalOpen,
    isRestoreAllModalOpen: uiStore.isRestoreAllModalOpen,
    isShareFolderModalOpen: uiStore.isShareFolderModalOpen,
    selectedFolderId: uiStore.selectedFolderId,
    editingLinkId: uiStore.editingLinkId,
    editingFolderId: uiStore.editingFolderId,
    parentFolderId: uiStore.parentFolderId,
    currentView: uiStore.currentView,
    searchFilters: uiStore.searchFilters,
    selectedLinkIds: uiStore.selectedLinkIds,
    folderToDelete: uiStore.folderToDelete,
    folderToShare: uiStore.folderToShare,
    setAddLinkModalOpen: uiStore.setAddLinkModalOpen,
    setCreateFolderModalOpen: uiStore.setCreateFolderModalOpen,
    setSettingsModalOpen: uiStore.setSettingsModalOpen,
    setProfileModalOpen: uiStore.setProfileModalOpen,
    setBulkDeleteModalOpen: uiStore.setBulkDeleteModalOpen,
    setBulkMoveModalOpen: uiStore.setBulkMoveModalOpen,
    setFolderDeleteModalOpen: uiStore.setFolderDeleteModalOpen,
    setEmptyTrashModalOpen: uiStore.setEmptyTrashModalOpen,
    setRestoreAllModalOpen: uiStore.setRestoreAllModalOpen,
    setShareFolderModalOpen: uiStore.setShareFolderModalOpen,
    setSelectedFolder: uiStore.setSelectedFolder,
    setEditingLink: uiStore.setEditingLink,
    setEditingFolder: uiStore.setEditingFolder,
    setParentFolder: uiStore.setParentFolder,
    setCurrentView: uiStore.setCurrentView,
    setSearchFilters: uiStore.setSearchFilters,
    toggleLinkSelection: uiStore.toggleLinkSelection,
    clearLinkSelection: uiStore.clearLinkSelection,
    selectAllLinks: uiStore.selectAllLinks,
    setFolderToDelete: uiStore.setFolderToDelete,
    setFolderToShare: uiStore.setFolderToShare,
    resetUIState: uiStore.resetUIState,
    
    // Combined loading states
    isLoadingData: uiStore.isLoadingData, // NEW: Use the dedicated data loading state
    isHydrated: uiStore.isHydrated, // NEW: Use the UI store's hydration state
    
    // Legacy compatibility methods
    loadFromStorage: async () => {
      await Promise.all([
        settingsStore.loadSettings(),
        // Links and folders are loaded automatically by their stores
      ]);
    },
    clearData: () => {
      // Clear all stores
      linksStore.setLinks([]);
      foldersStore.setFolders([]);
      uiStore.resetUIState();
    },
    exportData: () => {
      // Export all data as JSON
      const exportObject = {
        links: linksStore.links,
        folders: foldersStore.folders,
        settings: settingsStore.settings,
        version: '1.0',
        exportDate: new Date().toISOString(),
      };
      return JSON.stringify(exportObject, null, 2);
    },
    importData: async (jsonString: string) => {
      try {
        const data = JSON.parse(jsonString);
        
        // Validate data structure
        if (!data.links || !data.folders || !data.settings) {
          throw new Error('Invalid data format');
        }
        
        // Import data into stores
        linksStore.setLinks(data.links);
        foldersStore.setFolders(data.folders);
        await settingsStore.updateSettings(data.settings);
        
        return true;
      } catch (error) {
        console.error('Failed to import data:', error);
        return false;
      }
    },
  };
  
  // Apply selector if provided, otherwise return full store
  if (selector) {
    return selector(combined) as any;
  }
  
  return combined as any;
}

// Export as both useStore (for compatibility) and useStoreCompat (for clarity)
export { useStoreCompat as useStore };
export default useStoreCompat;

