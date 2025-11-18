/**
 * @file services/database.interface.ts
 * @description Database abstraction layer interface for easy migration to Supabase
 * @created 2025-10-30
 */

import { Link, Folder, AppSettings } from '@/types';

/**
 * Database service interface
 * Abstracts storage operations to easily switch between localStorage and Supabase
 */
export interface DatabaseService {
  // Link operations
  getLinks(userId?: string): Promise<Link[]>;
  addLink(link: Omit<Link, 'id' | 'createdAt' | 'updatedAt'>): Promise<Link>;
  updateLink(id: string, updates: Partial<Link>): Promise<Link>;
  deleteLink(id: string): Promise<void>;
  
  // Folder operations
  getFolders(userId?: string): Promise<Folder[]>;
  addFolder(folder: Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Folder>;
  updateFolder(id: string, updates: Partial<Folder>): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
  
  // Settings operations
  getSettings(userId?: string): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>, userId?: string): Promise<AppSettings>;
  
  // Bulk operations
  bulkDeleteLinks(ids: string[]): Promise<void>;
  emptyTrash(userId?: string): Promise<void>;
  
  // Data export/import
  exportData(userId?: string): Promise<string>;
  importData(data: string, userId?: string): Promise<boolean>;
}

/**
 * LocalStorage implementation (current)
 * This is the current implementation using localStorage
 * When migrating to Supabase, create a SupabaseService that implements DatabaseService
 */

/**
 * Future Supabase implementation example:
 * 
 * export class SupabaseService implements DatabaseService {
 *   constructor(private supabase: SupabaseClient) {}
 *   
 *   async getLinks(userId?: string): Promise<Link[]> {
 *     const { data, error } = await this.supabase
 *       .from('links')
 *       .select('*')
 *       .eq('userId', userId)
 *       .is('deletedAt', null);
 *     
 *     if (error) throw error;
 *     return data;
 *   }
 *   
 *   // ... implement other methods
 * }
 */
