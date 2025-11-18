/**
 * @file hooks/use-folder-descendants.ts
 * @description Custom hook for managing folder descendants with memoization
 * @created 2025-10-18
 */

import React, { useMemo } from 'react';
import { Folder } from '@/types';
import { getAllDescendantFolderIds } from '@/utils/folder-utils';

/**
 * Hook that memoizes descendant folder IDs for all folders
 * This prevents recalculating descendants on every render
 * 
 * Performance: O(n) calculation, cached for all folders
 * 
 * @param folders - Array of all folders
 * @returns Map of folderId to descendant IDs (including self)
 * 
 * @example
 * const descendantMap = useFolderDescendants(folders);
 * const allIds = descendantMap.get('parent-folder-id');
 * // Use allIds to filter links
 */
export function useFolderDescendants(folders: Folder[]): Map<string, string[]> {
  return useMemo(() => {
    const map = new Map<string, string[]>();
    
    // Pre-calculate descendants for all folders
    folders.forEach(folder => {
      map.set(folder.id, getAllDescendantFolderIds(folder.id, folders));
    });
    
    return map;
  }, [folders]);
}

/**
 * Hook that returns descendants for a specific folder ID
 * 
 * @param folderId - Target folder ID (null returns empty array)
 * @param folders - Array of all folders
 * @returns Array of descendant folder IDs including the folder itself
 * 
 * @example
 * const descendants = useSpecificFolderDescendants('work-id', folders);
 * // Returns: ['work-id', 'projects-id', 'clienta-id', ...]
 */
export function useSpecificFolderDescendants(
  folderId: string | null,
  folders: Folder[]
): string[] {
  return useMemo(() => {
    if (!folderId) return [];
    return getAllDescendantFolderIds(folderId, folders);
  }, [folderId, folders]);
}
