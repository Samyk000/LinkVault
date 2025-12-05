/**
 * @file constants/index.ts
 * @description Application-wide constants and configuration
 * @created 2025-10-18
 */

import { Platform } from '@/types';

export const PLATFORM_CONFIG: Record<Platform, { 
  name: string; 
  color: string; 
  icon: string;
  domains: string[];
}> = {
  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    icon: 'Youtube',
    domains: ['youtube.com', 'youtu.be'],
  },
  twitter: {
    name: 'Twitter',
    color: '#1DA1F2',
    icon: 'Twitter',
    domains: ['twitter.com', 'x.com'],
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    icon: 'Instagram',
    domains: ['instagram.com'],
  },
  linkedin: {
    name: 'LinkedIn',
    color: '#0077B5',
    icon: 'Linkedin',
    domains: ['linkedin.com'],
  },
  tiktok: {
    name: 'TikTok',
    color: '#000000',
    icon: 'Music',
    domains: ['tiktok.com'],
  },
  github: {
    name: 'GitHub',
    color: '#181717',
    icon: 'Github',
    domains: ['github.com'],
  },
  medium: {
    name: 'Medium',
    color: '#00AB6C',
    icon: 'BookOpen',
    domains: ['medium.com'],
  },
  reddit: {
    name: 'Reddit',
    color: '#FF4500',
    icon: 'MessageCircle',
    domains: ['reddit.com'],
  },
  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    icon: 'Facebook',
    domains: ['facebook.com'],
  },
  other: {
    name: 'Other',
    color: '#6B7280',
    icon: 'Link',
    domains: [],
  },
};

export const STORAGE_KEYS = {
  LINKS: 'linkvault_links',
  FOLDERS: 'linkvault_folders',
  SETTINGS: 'linkvault_settings',
  CACHE: 'linkvault_cache',
} as const;

export const GUEST_STORAGE_KEYS = {
  SESSION: 'linksvault_guest_session',
  LINKS: 'linksvault_guest_links',
  FOLDERS: 'linksvault_guest_folders',
  SETTINGS: 'linksvault_guest_settings',
} as const;

export const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  viewMode: 'grid' as const,
};

// Timing constants
export const DEBOUNCE_DELAY = 300; // ms
export const SEARCH_DEBOUNCE_DELAY = 300; // ms
export const METADATA_FETCH_TIMEOUT = 10000; // ms
export const INITIAL_LOAD_DELAY = 50; // ms for lazy loading - reduced for faster LCP

// UI Animation constants
export const ANIMATION_DURATION = {
  FAST: 300, // ms - for quick transitions
  NORMAL: 500, // ms - for standard animations
  SLOW: 1000, // ms - for slow animations
} as const;

// Toast constants
export const TOAST_DURATION = 2000; // ms - Shorter duration for better UX
export const TOAST_REMOVE_DELAY = 2000; // ms - Shorter delay for smoother experience
export const LOGIN_TOAST_DURATION = 1500; // ms - Even shorter for login success

// Tooltip constants
export const TOOLTIP_DELAY = {
  SHORT: 300, // ms
  NORMAL: 500, // ms
} as const;

// Form validation constants
export const VALIDATION_LIMITS = {
  DESCRIPTION_MAX_LENGTH: 500,
  TITLE_MAX_LENGTH: 200,
  URL_MAX_LENGTH: 2048,
} as const;

// Layout constants
export const LAYOUT = {
  MIN_HEIGHT_EMPTY_STATE: 400, // px
  ICON_SIZE_SMALL: 16, // px
  ICON_SIZE_MEDIUM: 24, // px
  ICON_SIZE_LARGE: 32, // px
} as const;
