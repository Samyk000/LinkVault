/**
 * @file store/index.ts
 * @description Store composition and exports
 * @created 2025-11-12
 * @modified 2025-11-12
 */

// Export individual stores
export { useAuthStore } from './useAuthStore';
export { useLinksStore } from './useLinksStore';
export { useFoldersStore } from './useFoldersStore';
export { useSettingsStore } from './useSettingsStore';
export { useUIStore } from './useUIStore';

// Import types for the combined store
import { User } from '@supabase/supabase-js';
import { Link, Folder, AppSettings, SearchFilters } from '@/types';
import { useAuthStore } from './useAuthStore';
import { useLinksStore } from './useLinksStore';
import { useFoldersStore } from './useFoldersStore';
import { useSettingsStore } from './useSettingsStore';
import { useUIStore } from './useUIStore';

/**
 * Combined store interface for convenience
 * Provides a unified interface to all stores
 */
export interface AppStore {
  // Auth Store
  auth: {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSession: () => Promise<void>;
    clearError: () => void;
  };
  
  // Links Store
  links: {
    links: Link[];
    isLoading: boolean;
    editingLinkId: string | null;
    addLink: (linkData: Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => Promise<void>;
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
    setEditingLink: (linkId: string | null) => void;
  };
  
  // Folders Store
  folders: {
    folders: Folder[];
    isLoading: boolean;
    editingFolderId: string | null;
    parentFolderId: string | null;
    expandedFolders: Set<string>;
    addFolder: (folderData: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    toggleFolderExpanded: (id: string) => void;
    setParentFolder: (folderId: string | null) => void;
    setEditingFolder: (folderId: string | null) => void;
  };
  
  // Settings Store
  settings: {
    settings: AppSettings;
    isLoading: boolean;
    error: string | null;
    loadSettings: () => Promise<void>;
    updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
    clearError: () => void;
  };
  
  // UI Store
  ui: {
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
    parentFolderId: string | null;
    
    // View States
    currentView: 'all' | 'favorites' | 'trash';
    searchFilters: SearchFilters;
    expandedFolders: Set<string>;
    
    // Bulk Selection State
    selectedLinkIds: Set<string>;
    
    // Folder to Delete State
    folderToDelete: { id: string; name: string; linkCount: number } | null;
    
    // Actions
    setAddLinkModalOpen: (isOpen: boolean) => void;
    setCreateFolderModalOpen: (isOpen: boolean) => void;
    setSettingsModalOpen: (isOpen: boolean) => void;
    setProfileModalOpen: (isOpen: boolean) => void;
    setBulkDeleteModalOpen: (isOpen: boolean) => void;
    setBulkMoveModalOpen: (isOpen: boolean) => void;
    setFolderDeleteModalOpen: (isOpen: boolean) => void;
    setEmptyTrashModalOpen: (isOpen: boolean) => void;
    setRestoreAllModalOpen: (isOpen: boolean) => void;
    setSelectedFolder: (folderId: string | null) => void;
    setEditingLink: (linkId: string | null) => void;
    setEditingFolder: (folderId: string | null) => void;
    setParentFolder: (folderId: string | null) => void;
    setCurrentView: (view: 'all' | 'favorites' | 'trash') => void;
    setSearchFilters: (filters: Partial<SearchFilters>) => void;
    toggleFolderExpanded: (id: string) => void;
    toggleLinkSelection: (linkId: string) => void;
    clearLinkSelection: () => void;
    selectAllLinks: (linkIds: string[]) => void;
    setFolderToDelete: (folder: { id: string; name: string; linkCount: number } | null) => void;
    resetUIState: () => void;
  };
}

/**
 * Hook that combines all stores for convenience
 * @returns {AppStore} Combined store interface
 * @example
 * const { auth, links, folders, settings, ui } = useAppStore();
 * 
 * // Use individual stores
 * auth.signIn(email, password);
 * links.addLink(linkData);
 * folders.addFolder(folderData);
 * settings.updateSettings(newSettings);
 * ui.setAddLinkModalOpen(true);
 */
export function useAppStore(): AppStore {
  const authStore = useAuthStore();
  const linksStore = useLinksStore();
  const foldersStore = useFoldersStore();
  const settingsStore = useSettingsStore();
  const uiStore = useUIStore();
  
  return {
    auth: {
      user: authStore.user,
      isAuthenticated: authStore.isAuthenticated,
      isLoading: authStore.isLoading,
      error: authStore.error,
      signIn: authStore.signIn,
      signUp: authStore.signUp,
      signOut: authStore.signOut,
      refreshSession: authStore.refreshSession,
      clearError: authStore.clearError,
    },
    
    links: {
      links: linksStore.links,
      isLoading: linksStore.isLoading,
      editingLinkId: linksStore.editingLinkId,
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
      setEditingLink: linksStore.setEditingLink,
    },
    
    folders: {
      folders: foldersStore.folders,
      isLoading: foldersStore.isLoading,
      editingFolderId: foldersStore.editingFolderId,
      parentFolderId: foldersStore.parentFolderId,
      expandedFolders: foldersStore.expandedFolders,
      addFolder: foldersStore.addFolder,
      updateFolder: foldersStore.updateFolder,
      deleteFolder: foldersStore.deleteFolder,
      toggleFolderExpanded: foldersStore.toggleFolderExpanded,
      setParentFolder: foldersStore.setParentFolder,
      setEditingFolder: foldersStore.setEditingFolder,
    },
    
    settings: {
      settings: settingsStore.settings,
      isLoading: settingsStore.isLoading,
      error: settingsStore.error,
      loadSettings: settingsStore.loadSettings,
      updateSettings: settingsStore.updateSettings,
      clearError: settingsStore.clearError,
    },
    
    ui: {
      // Modal States
      isAddLinkModalOpen: uiStore.isAddLinkModalOpen,
      isCreateFolderModalOpen: uiStore.isCreateFolderModalOpen,
      isSettingsModalOpen: uiStore.isSettingsModalOpen,
      isProfileModalOpen: uiStore.isProfileModalOpen,
      isBulkDeleteModalOpen: uiStore.isBulkDeleteModalOpen,
      isBulkMoveModalOpen: uiStore.isBulkMoveModalOpen,
      isFolderDeleteModalOpen: uiStore.isFolderDeleteModalOpen,
      isEmptyTrashModalOpen: uiStore.isEmptyTrashModalOpen,
      isRestoreAllModalOpen: uiStore.isRestoreAllModalOpen,
      
      // Selection States
      selectedFolderId: uiStore.selectedFolderId,
      editingLinkId: uiStore.editingLinkId,
      editingFolderId: uiStore.editingFolderId,
      parentFolderId: uiStore.parentFolderId,
      
      // View States
      currentView: uiStore.currentView,
      searchFilters: uiStore.searchFilters,
      expandedFolders: uiStore.expandedFolders,
      
      // Bulk Selection State
      selectedLinkIds: uiStore.selectedLinkIds,
      
      // Folder to Delete State
      folderToDelete: uiStore.folderToDelete,
      
      // Actions
      setAddLinkModalOpen: uiStore.setAddLinkModalOpen,
      setCreateFolderModalOpen: uiStore.setCreateFolderModalOpen,
      setSettingsModalOpen: uiStore.setSettingsModalOpen,
      setProfileModalOpen: uiStore.setProfileModalOpen,
      setBulkDeleteModalOpen: uiStore.setBulkDeleteModalOpen,
      setBulkMoveModalOpen: uiStore.setBulkMoveModalOpen,
      setFolderDeleteModalOpen: uiStore.setFolderDeleteModalOpen,
      setEmptyTrashModalOpen: uiStore.setEmptyTrashModalOpen,
      setRestoreAllModalOpen: uiStore.setRestoreAllModalOpen,
      setSelectedFolder: uiStore.setSelectedFolder,
      setEditingLink: uiStore.setEditingLink,
      setEditingFolder: uiStore.setEditingFolder,
      setParentFolder: uiStore.setParentFolder,
      setCurrentView: uiStore.setCurrentView,
      setSearchFilters: uiStore.setSearchFilters,
      toggleFolderExpanded: uiStore.toggleFolderExpanded,
      toggleLinkSelection: uiStore.toggleLinkSelection,
      clearLinkSelection: uiStore.clearLinkSelection,
      selectAllLinks: uiStore.selectAllLinks,
      setFolderToDelete: uiStore.setFolderToDelete,
      resetUIState: uiStore.resetUIState,
    },
  };
}

/**
 * Alternative hook that provides direct access to individual stores
 * @returns {Object} Object containing all store hooks
 * @example
 * const stores = useStores();
 * stores.auth.signIn(email, password);
 * stores.links.addLink(linkData);
 */
export function useStores() {
  return {
    auth: useAuthStore,
    links: useLinksStore,
    folders: useFoldersStore,
    settings: useSettingsStore,
    ui: useUIStore,
  };
}

// Re-export types for convenience (types are not exported from individual stores)
export type { User } from '@supabase/supabase-js';
export type { Link, Folder, AppSettings, SearchFilters } from '@/types';