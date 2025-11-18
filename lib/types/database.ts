/**
 * @file lib/types/database.ts
 * @description Database-specific types for Supabase operations
 * @created 2025-01-01
 */

import { Link, Folder } from '@/types';

/**
 * Database link record (snake_case from Supabase)
 */
export interface DatabaseLink {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  favicon_url: string | null;
  platform: string;
  folder_id: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database folder record (snake_case from Supabase)
 */
export interface DatabaseFolder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  parent_id: string | null;
  is_platform_folder: boolean;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Link update data for database operations
 */
export interface LinkUpdateData {
  title?: string;
  description?: string;
  url?: string;
  thumbnail?: string;
  favicon_url?: string;
  platform?: string;
  folder_id?: string | null;
  is_favorite?: boolean;
  tags?: string[] | null;
  deleted_at?: string | null;
}

/**
 * Folder update data for database operations
 */
export interface FolderUpdateData {
  name?: string;
  description?: string | null;
  color?: string;
  icon?: string;
  parent_id?: string | null;
  is_platform_folder?: boolean;
  platform?: string | null;
}

/**
 * Batch request configuration
 */
export interface BatchRequest<T> {
  key: string;
  fn: () => Promise<T>;
  cacheOptions?: {
    ttl?: number;
    tags?: string[];
    priority?: 'low' | 'medium' | 'high';
    persist?: boolean;
  };
}

/**
 * Request queue entry
 */
export interface RequestQueueEntry<T> {
  resolve: (value: T) => void;
  reject: (reason?: Error) => void;
}

