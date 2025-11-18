/**
 * @file utils/platform.ts
 * @description Platform detection and URL utilities
 * @created 2025-10-18
 */

import { Platform } from '@/types';
import { PLATFORM_CONFIG } from '@/constants';

/**
 * Detects the platform from a given URL
 * @param url - The URL to analyze
 * @returns The detected platform type
 */
export function detectPlatform(url: string): Platform {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace('www.', '');

    for (const [platform, config] of Object.entries(PLATFORM_CONFIG)) {
      if (config.domains.some((domain) => hostname.includes(domain))) {
        return platform as Platform;
      }
    }

    return 'other';
  } catch (error) {
    return 'other';
  }
}

/**
 * Validates if a string is a valid URL
 * @param url - The string to validate
 * @returns True if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets platform configuration
 * @param platform - The platform type
 * @returns Platform configuration object
 */
export function getPlatformConfig(platform: Platform) {
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG['other'];
}

/**
 * Extracts domain from URL
 * @param url - The URL to extract domain from
 * @returns The domain name or empty string
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}
