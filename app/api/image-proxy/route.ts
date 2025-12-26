/**
 * @file app/api/image-proxy/route.ts
 * @description Image proxy for optimizing external images
 * @created 2025-12-26
 * 
 * This proxy fetches external images and returns them with proper cache headers,
 * allowing Next.js Image component to work with any external URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

// Cache for 24 hours, stale-while-revalidate for 7 days
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';

// Maximum image size to proxy (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Allowed image content types
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

// Block private/internal IPs for SSRF protection
function isPrivateIP(hostname: string): boolean {
  // Block localhost variations
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }
  
  // Block private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^0\./,
    /^fc00:/i,
    /^fe80:/i,
  ];
  
  return privateRanges.some(range => range.test(hostname));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Only allow HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Only HTTPS URLs are allowed' },
        { status: 400 }
      );
    }

    // SSRF protection
    if (isPrivateIP(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: 'Private IPs are not allowed' },
        { status: 400 }
      );
    }

    // Fetch the image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LinksVault-ImageProxy/1.0',
        'Accept': 'image/*',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: response.status }
      );
    }

    // Validate content type
    const contentType = response.headers.get('content-type')?.split(';')[0].trim();
    if (!contentType || !ALLOWED_CONTENT_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type' },
        { status: 400 }
      );
    }

    // Check content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large' },
        { status: 413 }
      );
    }

    // Stream the image
    const imageBuffer = await response.arrayBuffer();
    
    // Double-check size after download
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: 'Image too large' },
        { status: 413 }
      );
    }

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      );
    }

    logger.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' },
      { status: 500 }
    );
  }
}
