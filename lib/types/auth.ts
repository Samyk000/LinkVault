/**
 * @file lib/types/auth.ts
 * @description TypeScript types for authentication and user management
 * @created 2025-01-01
 */

import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  default_folder_id: string | null;
  links_per_page: number;
  show_thumbnails: boolean;
  show_favicons: boolean;
  auto_archive_days: number | null;
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  last_backup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  link_count?: number;
}

export interface Link {
  id: string;
  user_id: string;
  folder_id: string | null;
  url: string;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  thumbnail_url: string | null;
  platform: string | null;
  tags: string[];
  is_favorite: boolean;
  is_archived: boolean;
  click_count: number;
  last_clicked_at: string | null;
  created_at: string;
  updated_at: string;
  folder_name?: string;
}

export interface AuthUser extends User {
  profile?: UserProfile;
  settings?: UserSettings;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: AuthError | null;
}