/**
 * @file utils/folder-utils.ts
 * @description Utility functions for folder operations and hierarchy management
 * @created 2025-10-18
 */

import { Folder } from '@/types';

/**
 * Maximum number of sub-folders allowed per parent folder
 * Only parent folders (root level) can have sub-folders
 * Sub-folders cannot have their own sub-folders (1 level nesting only)
 */
export const MAX_SUB_FOLDERS_PER_FOLDER = 10;

/**
 * Gets all descendant folder IDs recursively for a given parent folder
 * Used to filter links that belong to a folder and all its sub-folders
 * 
 * @param folderId - Parent folder ID to get descendants for
 * @param folders - Array of all folders
 * @returns Array of folder IDs including the parent and all descendants
 * 
 * @example
 * // Folder structure: Work > Projects > ClientA
 * getAllDescendantFolderIds('work-id', folders)
 * // Returns: ['work-id', 'projects-id', 'clienta-id']
 */
export function getAllDescendantFolderIds(
  folderId: string,
  folders: Folder[]
): string[] {
  const descendants: string[] = [folderId];
  const visited = new Set<string>([folderId]); // Prevent infinite loops
  
  /**
   * Recursively gets all children of a parent folder.
   * Prevents circular references by tracking visited nodes.
   * @param parentId - Parent folder ID to get children for
   */
  const getChildren = (parentId: string) => {
    const children = folders.filter(f => f.parentId === parentId);
    
    children.forEach(child => {
      // Prevent circular references
      if (visited.has(child.id)) {
        console.error(`Circular reference detected: ${child.id} already visited`);
        return;
      }
      
      visited.add(child.id);
      descendants.push(child.id);
      getChildren(child.id); // Recursive call
    });
  };
  
  getChildren(folderId);
  return descendants;
}

/**
 * Calculates the nesting depth of a folder
 * Depth is the number of parent folders above the given folder
 * 
 * @param folderId - Folder ID to calculate depth for
 * @param folders - Array of all folders
 * @returns Depth level (0 for root folders, 1+ for nested folders)
 * 
 * @example
 * // Root folder
 * getFolderDepth('root-id', folders) // Returns: 0
 * 
 * // Nested folder: Root > Level1 > Level2
 * getFolderDepth('level2-id', folders) // Returns: 2
 */
export function getFolderDepth(
  folderId: string,
  folders: Folder[]
): number {
  let depth = 0;
  let currentId: string | null = folderId;
  const visited = new Set<string>(); // Prevent infinite loops
  
  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    
    if (!folder) {
      console.warn(`Folder not found: ${currentId}`);
      break;
    }
    
    if (!folder.parentId) {
      // Reached root folder
      break;
    }
    
    // Check for circular reference
    if (visited.has(folder.parentId)) {
      console.error(`Circular reference detected at folder: ${folder.id}`);
      break;
    }
    
    visited.add(currentId);
    currentId = folder.parentId;
    depth++;
  }
  
  return depth;
}

/**
 * Checks if a folder is allowed to have sub-folders
 * Only root folders (folders with no parent) can have sub-folders
 * This enforces a single level of nesting: Parent → Sub-folder (no deeper)
 * 
 * @param folderId - Folder ID to check
 * @param folders - Array of all folders
 * @returns True if folder can have sub-folders, false if it's already a sub-folder
 * 
 * @example
 * // Root folder (parentId: null)
 * canHaveSubFolders('root-id', folders) // Returns: true
 * 
 * // Sub-folder (parentId: 'root-id')
 * canHaveSubFolders('sub-id', folders) // Returns: false
 */
export function canHaveSubFolders(
  folderId: string,
  folders: Folder[]
): boolean {
  const folder = folders.find(f => f.id === folderId);
  // Only folders with no parent (root level) can have sub-folders
  return folder ? folder.parentId === null : false;
}

/**
 * Checks if a folder can accept more sub-folders based on the limit
 * Maximum of 10 sub-folders per parent folder is enforced
 * Also checks if the parent folder is allowed to have sub-folders
 * 
 * @param parentId - Parent folder ID to check
 * @param folders - Array of all folders
 * @returns True if more sub-folders can be added, false otherwise
 * 
 * @example
 * canAddSubFolder('parent-id', folders) // Returns: true if < 10 sub-folders exist and parent is root
 */
export function canAddSubFolder(
  parentId: string,
  folders: Folder[]
): boolean {
  // First check if this folder is allowed to have sub-folders
  if (!canHaveSubFolders(parentId, folders)) {
    return false;
  }
  
  const existingSubFolders = folders.filter(f => f.parentId === parentId);
  return existingSubFolders.length < MAX_SUB_FOLDERS_PER_FOLDER;
}

/**
 * Gets the count of immediate sub-folders for a given folder
 * 
 * @param parentId - Parent folder ID
 * @param folders - Array of all folders
 * @returns Number of direct sub-folders
 */
export function getSubFolderCount(
  parentId: string,
  folders: Folder[]
): number {
  return folders.filter(f => f.parentId === parentId).length;
}

/**
 * Validates if a folder can be set as a parent of another folder
 * Prevents circular references where a folder becomes its own ancestor
 * 
 * @param folderId - Folder being moved/created
 * @param newParentId - Proposed parent folder ID
 * @param folders - Array of all folders
 * @returns True if valid parent assignment, false if circular reference would occur
 * 
 * @example
 * // Prevent Work > Projects, then Projects > Work
 * validateFolderParent('work-id', 'projects-id', folders)
 * // Returns: false (circular reference)
 */
export function validateFolderParent(
  folderId: string,
  newParentId: string,
  folders: Folder[]
): boolean {
  // Can't be its own parent
  if (folderId === newParentId) {
    return false;
  }
  
  // Check if newParent is a descendant of folder
  // This would create a circular reference
  const descendants = getAllDescendantFolderIds(folderId, folders);
  return !descendants.includes(newParentId);
}

/**
 * Gets all root folders (folders with no parent)
 * 
 * @param folders - Array of all folders
 * @returns Array of root folders
 */
export function getRootFolders(folders: Folder[]): Folder[] {
  return folders.filter(f => f.parentId === null);
}

/**
 * Gets immediate children of a folder
 * 
 * @param parentId - Parent folder ID (null for root level)
 * @param folders - Array of all folders
 * @returns Array of child folders
 */
export function getChildFolders(
  parentId: string | null,
  folders: Folder[]
): Folder[] {
  return folders.filter(f => f.parentId === parentId);
}

/**
 * Builds a folder breadcrumb path from root to the given folder
 * 
 * @param folderId - Target folder ID
 * @param folders - Array of all folders
 * @returns Array of folder objects from root to target
 * 
 * @example
 * // Folder path: Work > Projects > Client A
 * getFolderPath('clienta-id', folders)
 * // Returns: [Work, Projects, Client A] folder objects
 */
export function getFolderPath(
  folderId: string,
  folders: Folder[]
): Folder[] {
  const path: Folder[] = [];
  let currentId: string | null = folderId;
  const visited = new Set<string>();
  
  while (currentId) {
    const folder = folders.find(f => f.id === currentId);
    
    if (!folder || visited.has(currentId)) {
      break;
    }
    
    visited.add(currentId);
    path.unshift(folder); // Add to beginning of array
    currentId = folder.parentId;
  }
  
  return path;
}

/**
 * Checks if a folder has any sub-folders
 * 
 * @param folderId - Folder ID to check
 * @param folders - Array of all folders
 * @returns True if folder has children, false otherwise
 */
export function hasSubFolders(
  folderId: string,
  folders: Folder[]
): boolean {
  return folders.some(f => f.parentId === folderId);
}
