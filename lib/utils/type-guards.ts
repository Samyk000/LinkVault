/**
 * @file lib/utils/type-guards.ts
 * @description Runtime type guards for type safety
 * @created 2025-01-01
 */

import { Link, Folder, AppSettings, Platform } from '@/types';

/**
 * Type guard for Link
 */
export function isLink(value: unknown): value is Link {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.thumbnail === 'string' &&
    typeof obj.platform === 'string' &&
    typeof obj.isFavorite === 'boolean' &&
    (obj.folderId === null || typeof obj.folderId === 'string') &&
    (obj.deletedAt === null || typeof obj.deletedAt === 'string') &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Type guard for Folder
 */
export function isFolder(value: unknown): value is Folder {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.color === 'string' &&
    typeof obj.icon === 'string' &&
    typeof obj.isPlatformFolder === 'boolean' &&
    (obj.parentId === null || typeof obj.parentId === 'string') &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
  );
}

/**
 * Type guard for AppSettings
 */
export function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== 'object') return false;
  
  const obj = value as Record<string, unknown>;
  return (
    (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') &&
    (obj.viewMode === 'grid' || obj.viewMode === 'list')
  );
}

/**
 * Type guard for Platform
 */
export function isPlatform(value: unknown): value is Platform {
  return (
    typeof value === 'string' &&
    [
      'youtube',
      'twitter',
      'instagram',
      'linkedin',
      'tiktok',
      'github',
      'medium',
      'reddit',
      'facebook',
      'other',
    ].includes(value)
  );
}

/**
 * Type guard for array of Links
 */
export function isLinkArray(value: unknown): value is Link[] {
  return Array.isArray(value) && value.every(isLink);
}

/**
 * Type guard for array of Folders
 */
export function isFolderArray(value: unknown): value is Folder[] {
  return Array.isArray(value) && value.every(isFolder);
}

/**
 * Type guard for valid URL string
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

