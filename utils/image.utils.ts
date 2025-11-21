/**
 * @file utils/image.utils.ts
 * @description Image optimization and validation utilities
 * @created 2025-11-21
 */

import { IMAGE_CONSTANTS, FETCH_PRIORITY } from '@/constants/image.constants';

/**
 * Check if an image URL is from an allowed domain for Next.js Image optimization
 * 
 * @example
 * isAllowedImageDomain('https://img.youtube.com/vi/abc/maxresdefault.jpg')
 * // Returns: true
 * 
 * isAllowedImageDomain('https://unknown-domain.com/image.jpg')
 * // Returns: false
 * 
 * @param url - Image URL to validate
 * @returns Whether the domain is in the allowed list
 */
export function isAllowedImageDomain(url: string): boolean {
    try {
        const urlObj = new URL(url);
        return IMAGE_CONSTANTS.ALLOWED_DOMAINS.some(
            domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
    } catch {
        // If URL parsing fails, assume it's not allowed
        return false;
    }
}

/**
 * Get image quality based on priority
 * Priority images use higher quality for better LCP (Largest Contentful Paint)
 * Non-priority images use lower quality to reduce bandwidth usage
 * 
 * @example
 * getImageQuality(true)  // Returns: 75
 * getImageQuality(false) // Returns: 60
 * 
 * @param priority - Whether this is a priority/above-the-fold image
 * @returns Image quality value (0-100)
 */
export function getImageQuality(priority: boolean): number {
    return priority ? IMAGE_CONSTANTS.QUALITY_HIGH : IMAGE_CONSTANTS.QUALITY_STANDARD;
}

/**
 * Get fetchPriority attribute value for browser-level optimization
 * Priority images get "high" to load them faster
 * Non-priority images get "low" to defer loading
 * 
 * @example
 * getFetchPriority(true)  // Returns: 'high'
 * getFetchPriority(false) // Returns: 'low'
 * 
 * @param priority - Whether this is a priority/above-the-fold image
 * @returns fetchPriority attribute value
 */
export function getFetchPriority(priority: boolean): typeof FETCH_PRIORITY.HIGH | typeof FETCH_PRIORITY.LOW {
    return priority ? FETCH_PRIORITY.HIGH : FETCH_PRIORITY.LOW;
}

/**
 * Get blur data URL for priority images
 * Only priority images should use blur placeholders to reduce overhead
 * 
 * @example
 * getBlurDataURL(true)  // Returns: 'data:image/svg+xml;base64...'
 * getBlurDataURL(false) // Returns: undefined
 * 
 * @param priority - Whether this is a priority/above-the-fold image
 * @returns Blur data URL or undefined
 */
export function getBlurDataURL(priority: boolean): string | undefined {
    return priority ? IMAGE_CONSTANTS.BLUR_DATA_URL : undefined;
}

/**
 * Get placeholder type for Next.js Image component
 * 
 * @example
 * getPlaceholder(true)  // Returns: 'blur'
 * getPlaceholder(false) // Returns: 'empty'
 * 
 * @param priority - Whether this is a priority/above-the-fold image
 * @returns Placeholder type for Image component
 */
export function getPlaceholder(priority: boolean): 'blur' | 'empty' {
    return priority ? 'blur' : 'empty';
}
