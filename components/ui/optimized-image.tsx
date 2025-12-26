/**
 * @file components/ui/optimized-image.tsx
 * @description Optimized image component that handles external images via proxy
 * @created 2025-12-26
 */

'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useCallback } from 'react';
import { isAllowedImageDomain } from '@/utils/image.utils';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
}

/**
 * Optimized image component that:
 * 1. Uses Next.js Image optimization for allowed domains
 * 2. Proxies external images through /api/image-proxy for optimization
 * 3. Falls back to unoptimized if proxy fails
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder-image.svg',
  onError,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Determine if we should use the proxy
  const shouldUseProxy = useCallback((url: string): boolean => {
    if (!url || url.startsWith('/') || url.startsWith('data:')) {
      return false;
    }
    
    try {
      const parsedUrl = new URL(url);
      // Don't proxy if it's an allowed domain (Next.js can optimize directly)
      if (isAllowedImageDomain(url)) {
        return false;
      }
      // Only proxy HTTPS URLs
      return parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }, []);

  // Get the optimized source URL
  const getOptimizedSrc = useCallback((url: string): string => {
    if (shouldUseProxy(url)) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, [shouldUseProxy]);

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      // If proxy failed, try direct URL
      if (imgSrc.startsWith('/api/image-proxy')) {
        setImgSrc(src);
      } else if (fallbackSrc) {
        setImgSrc(fallbackSrc);
      }
    }
    onError?.(e);
  }, [hasError, imgSrc, src, fallbackSrc, onError]);

  const optimizedSrc = hasError ? imgSrc : getOptimizedSrc(imgSrc);
  
  // Use unoptimized for proxied images (they're already optimized by the proxy)
  // or for non-allowed domains that failed proxy
  const shouldUnoptimize = optimizedSrc.startsWith('/api/image-proxy') || 
    (hasError && !isAllowedImageDomain(imgSrc));

  return (
    <Image
      {...props}
      src={optimizedSrc}
      alt={alt}
      onError={handleError}
      unoptimized={shouldUnoptimize}
    />
  );
}
