/**
 * @file lib/utils/sanitization.ts
 * @description Input sanitization utilities to prevent XSS and other injection attacks
 * @created 2025-11-11
 * @updated 2025-12-26 - Improved type safety
 */

import { Link, Folder, AppSettings, Platform } from '@/types';

// Type definitions for sanitization inputs and outputs
type LinkInput = Partial<Omit<Link, 'id' | 'createdAt' | 'updatedAt'>>;
type FolderInput = Partial<Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} input - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // SECURITY: Proper HTML entity encoding to prevent XSS
  // CRITICAL: Ampersand MUST be escaped first to avoid double-encoding
  return input
    .replace(/&/g, '&amp;')      // Escape ampersands FIRST
    .replace(/</g, '&lt;')       // Escape less-than
    .replace(/>/g, '&gt;')       // Escape greater-than
    .replace(/"/g, '&quot;')     // Escape double quotes
    .replace(/'/g, '&#x27;')     // Escape single quotes
    .replace(/\//g, '&#x2F;')    // Escape forward slashes
    .trim();
}

/**
 * Sanitizes link data to prevent XSS and injection attacks
 * @param {LinkInput} data - Link data to sanitize
 * @returns {LinkInput} Sanitized link data
 */
export function sanitizeLinkData(data: LinkInput): LinkInput {
  const sanitized: LinkInput = {};

  if (data.url !== undefined) {
    // URL should be validated, not just sanitized
    sanitized.url = validateAndSanitizeUrl(data.url);
  }

  if (data.title !== undefined) {
    sanitized.title = sanitizeString(String(data.title)).substring(0, 200);
  }

  if (data.description !== undefined) {
    sanitized.description = sanitizeString(String(data.description)).substring(0, 500);
  }

  if (data.thumbnail !== undefined) {
    sanitized.thumbnail = validateAndSanitizeUrl(data.thumbnail);
  }

  if (data.faviconUrl !== undefined) {
    sanitized.faviconUrl = validateAndSanitizeUrl(data.faviconUrl);
  }

  if (data.platform !== undefined) {
    sanitized.platform = sanitizePlatform(data.platform);
  }

  if (data.folderId !== undefined) {
    sanitized.folderId = data.folderId; // UUID, validate format
    if (data.folderId && !isValidUuid(data.folderId)) {
      throw new Error('Invalid folder ID format');
    }
  }

  if (data.isFavorite !== undefined) {
    sanitized.isFavorite = Boolean(data.isFavorite);
  }

  if (data.tags !== undefined) {
    sanitized.tags = Array.isArray(data.tags)
      ? data.tags
          .map((tag: unknown) => sanitizeString(String(tag)).substring(0, 50))
          .filter((tag: string) => tag.length > 0)
      : [];
  }

  if (data.deletedAt !== undefined) {
    sanitized.deletedAt = data.deletedAt; // Should be ISO date string or null
  }

  return sanitized;
}

/**
 * Sanitizes folder data to prevent XSS and injection attacks
 * @param {FolderInput} data - Folder data to sanitize
 * @returns {FolderInput} Sanitized folder data
 */
export function sanitizeFolderData(data: FolderInput): FolderInput {
  const sanitized: FolderInput = {};

  if (data.name !== undefined) {
    sanitized.name = sanitizeString(String(data.name)).substring(0, 100);
    if (!sanitized.name || sanitized.name.length === 0) {
      throw new Error('Folder name cannot be empty');
    }
  }

  if (data.description !== undefined) {
    sanitized.description = data.description 
      ? sanitizeString(String(data.description)).substring(0, 500)
      : undefined;
  }

  if (data.color !== undefined) {
    sanitized.color = validateAndSanitizeColor(data.color);
  }

  if (data.icon !== undefined) {
    sanitized.icon = sanitizeString(String(data.icon)).substring(0, 50);
  }

  if (data.parentId !== undefined) {
    sanitized.parentId = data.parentId; // UUID or null
    if (data.parentId && !isValidUuid(data.parentId)) {
      throw new Error('Invalid parent folder ID format');
    }
  }

  if (data.isPlatformFolder !== undefined) {
    sanitized.isPlatformFolder = Boolean(data.isPlatformFolder);
  }

  if (data.platform !== undefined) {
    sanitized.platform = data.platform 
      ? sanitizePlatform(data.platform)
      : undefined;
  }

  return sanitized;
}

/**
 * Validates and sanitizes a URL
 * @param {unknown} url - URL to validate and sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
function validateAndSanitizeUrl(url: unknown): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Parse URL to validate structure
    const parsedUrl = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }

    // SECURITY: Always block private IP ranges and localhost (not just production)
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\.0\.0\.0$/,
      /^::1$/,
      /^::ffff:/i,
      /^fc00:/i,
      /^fe80:/i,
      /^fd[0-9a-f]{2}:/i,
      /\.local$/i,
      /\.localhost$/i,
      /\.internal$/i,
    ];

    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      return '';
    }

    // Return the validated URL
    return parsedUrl.toString();
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
}

/**
 * Validates and sanitizes a platform value
 * @param {unknown} platform - Platform to validate
 * @returns {Platform} Valid platform or 'other'
 */
function sanitizePlatform(platform: unknown): Platform {
  const validPlatforms: Platform[] = [
    'youtube', 'twitter', 'instagram', 'linkedin', 'tiktok',
    'github', 'medium', 'reddit', 'facebook', 'other'
  ];
  
  if (typeof platform === 'string' && validPlatforms.includes(platform as Platform)) {
    return platform as Platform;
  }
  
  return 'other';
}

/**
 * Validates and sanitizes a color hex code
 * @param {string} color - Color hex code to validate
 * @returns {string} Validated color hex code or default blue
 */
function validateAndSanitizeColor(color: any): string {
  if (!color || typeof color !== 'string') {
    return '#3B82F6'; // Default blue
  }

  // Match hex color pattern (#RRGGBB)
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  const sanitized = color.trim();

  return hexColorRegex.test(sanitized) ? sanitized : '#3B82F6';
}

/**
 * Validates UUID format or guest mode ID format
 * @param {string} id - ID to validate
 * @returns {boolean} Whether the string is a valid UUID or guest ID
 */
function isValidUuid(id: string): boolean {
  // Standard UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  // Guest mode ID format (guest_link_xxx or guest_folder_xxx)
  const guestIdRegex = /^guest_(link|folder)_\d+_[a-z0-9]+$/i;
  
  return uuidRegex.test(id) || guestIdRegex.test(id);
}

/**
 * Sanitizes search query to prevent injection attacks
 * @param {string} query - Search query to sanitize
 * @returns {string} Sanitized search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  // Remove special characters that could be used for injection
  return query
    .replace(/[<>\"';&]/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Sanitizes user settings data
 * @param {Partial<AppSettings>} settings - Settings data to sanitize
 * @returns {Partial<AppSettings>} Sanitized settings
 */
export function sanitizeSettingsData(settings: Partial<AppSettings>): Partial<AppSettings> {
  const sanitized: Partial<AppSettings> = {};

  if (settings.theme !== undefined) {
    const validThemes: AppSettings['theme'][] = ['light', 'dark', 'system'];
    sanitized.theme = validThemes.includes(settings.theme) ? settings.theme : 'system';
  }

  return sanitized;
}