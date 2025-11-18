/**
 * @file lib/utils/sanitization.ts
 * @description Input sanitization utilities to prevent XSS and other injection attacks
 * @created 2025-11-11
 */

// Simple sanitization without external dependencies

/**
 * Sanitizes a string to prevent XSS attacks
 * @param {string} input - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Simple but effective sanitization without external dependencies
  return input
    .replace(/[<>]/g, '') // Remove angle brackets to prevent HTML injection
    .replace(/&/g, '&') // Escape ampersands
    .replace(/\"/g, '"') // Escape quotes
    .replace(/\'/g, '&#x27;') // Escape single quotes
    .replace(/\//g, '&#x2F;') // Escape forward slashes
    .trim();
}

/**
 * Sanitizes link data to prevent XSS and injection attacks
 * @param {Partial<Link> | Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>} data - Link data to sanitize
 * @returns {Partial<Link> | Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>} Sanitized link data
 */
export function sanitizeLinkData(
  data: Partial<any> | Omit<any, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): any {
  const sanitized: any = {};

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
    sanitized.platform = sanitizeString(String(data.platform)).substring(0, 50);
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
          .map((tag: any) => sanitizeString(String(tag)).substring(0, 50))
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
 * @param {Partial<Folder> | Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>} data - Folder data to sanitize
 * @returns {Partial<Folder> | Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>} Sanitized folder data
 */
export function sanitizeFolderData(
  data: Partial<any> | Omit<any, 'id' | 'createdAt' | 'updatedAt'>
): any {
  const sanitized: any = {};

  if (data.name !== undefined) {
    sanitized.name = sanitizeString(String(data.name)).substring(0, 100);
    if (!sanitized.name || sanitized.name.length === 0) {
      throw new Error('Folder name cannot be empty');
    }
  }

  if (data.description !== undefined) {
    sanitized.description = data.description 
      ? sanitizeString(String(data.description)).substring(0, 500)
      : null;
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
      ? sanitizeString(String(data.platform)).substring(0, 50)
      : null;
  }

  return sanitized;
}

/**
 * Validates and sanitizes a URL
 * @param {string} url - URL to validate and sanitize
 * @returns {string} Sanitized URL or empty string if invalid
 */
function validateAndSanitizeUrl(url: any): string {
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

    // Block private IP ranges and localhost in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedPatterns = [
        /^localhost$/i,
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^::1$/,
        /^fc00:/,
        /^fe80:/,
        /\.local$/i,
        /\.internal$/i,
      ];

      if (blockedPatterns.some(pattern => pattern.test(hostname))) {
        throw new Error('Private IP addresses and localhost are not allowed');
      }
    }

    // Return the validated URL
    return parsedUrl.toString();
  } catch (error) {
    // If URL parsing fails, return empty string
    return '';
  }
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
 * Validates UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} Whether the string is a valid UUID
 */
function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
 * @param {any} settings - Settings data to sanitize
 * @returns {any} Sanitized settings
 */
export function sanitizeSettingsData(settings: any): any {
  const sanitized: any = {};

  if (settings.theme !== undefined) {
    const validThemes = ['light', 'dark', 'system'];
    sanitized.theme = validThemes.includes(settings.theme) ? settings.theme : 'system';
  }

  if (settings.viewMode !== undefined) {
    const validViewModes = ['grid', 'list'];
    sanitized.viewMode = validViewModes.includes(settings.viewMode) ? settings.viewMode : 'grid';
  }

  return sanitized;
}