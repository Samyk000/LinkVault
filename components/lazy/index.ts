/**
 * @file components/lazy/index.ts
 * @description Lazy-loaded components for better performance and reduced bundle size
 * @created 2025-01-27
 * @optimized 2025-11-09 - Bundle optimization
 */

import React, { lazy, ReactNode } from 'react';

// Lazy load heavy modal components to reduce initial bundle size
export const LazyAddLinkModal = lazy(() => 
  import('@/components/modals/add-link-modal').then(module => ({ 
    default: module.AddLinkModal 
  }))
);

export const LazySettingsModal = lazy(() => 
  import('@/components/modals/settings-modal').then(module => ({ 
    default: module.SettingsModal 
  }))
);

export const LazyBulkMoveModal = lazy(() => 
  import('@/components/modals/bulk-move-modal').then(module => ({ 
    default: module.BulkMoveModal 
  }))
);

export const LazyBulkDeleteModal = lazy(() => 
  import('@/components/modals/bulk-delete-modal').then(module => ({ 
    default: module.BulkDeleteModal 
  }))
);

export const LazyCreateFolderModal = lazy(() => 
  import('@/components/modals/create-folder-modal').then(module => ({ 
    default: module.CreateFolderModal 
  }))
);

export const LazyEmptyTrashModal = lazy(() => 
  import('@/components/modals/empty-trash-modal').then(module => ({ 
    default: module.EmptyTrashModal 
  }))
);

export const LazyRestoreAllModal = lazy(() => 
  import('@/components/modals/restore-all-modal').then(module => ({ 
    default: module.RestoreAllModal 
  }))
);

export const LazyConfirmModal = lazy(() => 
  import('@/components/modals/confirm-modal').then(module => ({ 
    default: module.ConfirmModal 
  }))
);

export const LazyProfileModal = lazy(() => 
  import('@/components/modals/profile-modal').then(module => ({ 
    default: module.ProfileModal 
  }))
);

// Lazy load heavy UI components
export const LazyFolderDeleteModal = lazy(() => 
  import('@/components/layout/folder-delete-modal').then(module => ({ 
    default: module.FolderDeleteModal 
  }))
);

// Lazy load complex folder tree component
export const LazyFolderTreeSelect = lazy(() => 
  import('@/components/folders/folder-tree-select').then(module => ({ 
    default: module.FolderTreeSelect 
  }))
);

// imports removed - already defined above

// Wrapper component for lazy loading with loading states
export function LazyComponent({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return React.createElement(React.Fragment, null, children || fallback);
}