/**
 * @file utils/platform.ts
 * @description Platform detection and URL utilities with mobile browser support
 * @created 2025-10-18
 * @modified 2025-11-08 - Added mobile browser detection and storage capabilities
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

/**
 * Mobile browser detection utilities
 */
export interface MobileBrowserInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  supportsPersistentStorage: boolean;
  supportsBroadcastChannel: boolean;
  userAgent: string;
}

/**
 * Detects mobile browser capabilities and limitations
 * @returns Mobile browser information
 */
export function detectMobileBrowser(): MobileBrowserInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      supportsPersistentStorage: true,
      supportsBroadcastChannel: true,
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /mobile|tablet/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
  const isChrome = /chrome/.test(userAgent) && !/edg/.test(userAgent);
  const isFirefox = /firefox/.test(userAgent);

  // Determine storage capabilities based on browser and platform
  let supportsPersistentStorage = true;

  if (isIOS && isSafari) {
    // Safari on iOS has very aggressive storage policies
    supportsPersistentStorage = false;
  } else if (isMobile && isChrome) {
    // Chrome mobile has some limitations but better than Safari
    supportsPersistentStorage = true;
  } else if (isAndroid && isFirefox) {
    // Firefox on Android is generally reliable
    supportsPersistentStorage = true;
  }

  // Check for BroadcastChannel support (needed for cross-tab communication)
  const supportsBroadcastChannel = typeof BroadcastChannel !== 'undefined';

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isFirefox,
    supportsPersistentStorage,
    supportsBroadcastChannel,
    userAgent,
  };
}

/**
 * Checks if the current environment has reliable storage capabilities
 * @returns True if storage is reliable, false if it may be cleared
 */
export function hasReliableStorage(): boolean {
  const browserInfo = detectMobileBrowser();

  // Desktop browsers generally have reliable storage
  if (!browserInfo.isMobile) {
    return true;
  }

  // Mobile browsers with known storage issues
  if (browserInfo.isIOS && browserInfo.isSafari) {
    return false;
  }

  // Chrome mobile is generally reliable for foreground tabs
  if (browserInfo.isAndroid && browserInfo.isChrome) {
    return true;
  }

  // Default to cautious approach for unknown mobile browsers
  return false;
}

/**
 * Safely checks if localStorage is available and functional
 * @returns True if localStorage is available and working
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Safely checks if sessionStorage is available and functional
 * @returns True if sessionStorage is available and working
 */
export function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const testKey = '__session_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Gets the best available storage mechanism for the current browser
 * @returns 'localStorage', 'sessionStorage', or 'memory'
 */
export function getBestStorageMechanism(): 'localStorage' | 'sessionStorage' | 'memory' {
  if (isLocalStorageAvailable()) {
    return 'localStorage';
  }

  if (isSessionStorageAvailable()) {
    return 'sessionStorage';
  }

  return 'memory';
}

/**
 * Determines if the current browser needs special session handling
 * @returns True if special mobile handling is needed
 */
export function needsMobileSessionHandling(): boolean {
  const browserInfo = detectMobileBrowser();
  return browserInfo.isMobile && (!browserInfo.supportsPersistentStorage || browserInfo.isIOS);
}