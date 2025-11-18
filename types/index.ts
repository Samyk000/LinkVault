/**
 * @file types/index.ts
 * @description Central type definitions for LinkVault application
 * @created 2025-10-18
 */

export interface Link {
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  faviconUrl?: string; // Favicon URL for the link
  platform: Platform;
  folderId: string | null;
  isFavorite: boolean;
  tags?: string[]; // Tags for categorization
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Supabase integration fields
  userId?: string; // Owner of the link
  syncedAt?: string; // Last sync timestamp
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  parentId: string | null;
  isPlatformFolder: boolean;
  platform?: Platform;
  createdAt: string;
  updatedAt: string;
  // Supabase integration fields
  userId?: string; // Owner of the folder
  syncedAt?: string; // Last sync timestamp
  // Sharing functionality
  shareable?: boolean; // Whether the folder is shared
  shareId?: string; // Unique share identifier
  shareCreatedAt?: string; // When sharing was enabled
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  viewMode: 'grid' | 'list';
}

export type Platform = 
  | 'youtube'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'github'
  | 'medium'
  | 'reddit'
  | 'facebook'
  | 'other';

export interface MetadataResponse {
  title: string;
  image: string;
  description: string;
}

export interface SearchFilters {
  query: string;
}
