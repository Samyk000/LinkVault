/**
 * @file app/api/fetch-metadata/route.ts
 * @description API route to fetch URL metadata (Open Graph tags)
 * @created 2025-10-18
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sanitizeString } from '@/lib/utils/sanitization';
import { createRateLimiter, createRateLimitResponse } from '@/lib/middleware/rate-limit';

// Configure this route to run on Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// OPTIMIZED: Add caching headers for better performance
export const revalidate = 3600; // Revalidate every hour

// CRITICAL: Rate limiting configuration
const rateLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute per IP
});

// Simple in-memory cache for metadata (in production, use Redis or similar)
const metadataCache = new Map<string, { data: any; timestamp: number; errorCount?: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
const ERROR_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for errors
const MAX_CACHE_SIZE = 500; // Reduced cache size to prevent memory issues
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests
const MAX_RECENT_ERRORS = 3; // Max errors before temporarily blocking

// Validation schema for request body
const RequestSchema = z.object({
  url: z.string()
    .min(1, 'URL is required')
    .url('Invalid URL format')
    .refine((url) => {
      // Additional URL validation
      try {
        const parsedUrl = new URL(url);
        // Only allow http and https protocols
        return ['http:', 'https:'].includes(parsedUrl.protocol);
      } catch {
        return false;
      }
    }, 'URL must use http or https protocol')
    .refine((url) => {
      // SECURITY: Always prevent localhost/private IP access (not just production)
      // This prevents SSRF attacks including DNS rebinding
      try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();
        
        // Block localhost, private IPs, internal domains, and dangerous patterns
        const blockedPatterns = [
          /^localhost$/i,
          /^127\./,                              // IPv4 loopback
          /^10\./,                               // Private Class A
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./,     // Private Class B
          /^192\.168\./,                         // Private Class C
          /^169\.254\./,                         // Link-local
          /^0\.0\.0\.0$/,                        // All interfaces
          /^::1$/,                               // IPv6 loopback
          /^::ffff:/i,                           // IPv6 mapped IPv4 addresses
          /^\[::1\]$/,                           // IPv6 loopback in brackets
          /^\[::ffff:/i,                         // IPv6 mapped in brackets
          /^fc00:/i,                             // IPv6 unique local
          /^fe80:/i,                             // IPv6 link-local
          /^fd[0-9a-f]{2}:/i,                    // IPv6 unique local (fd00::/8)
          /\.local$/i,                           // mDNS local domain
          /\.localhost$/i,                       // .localhost TLD
          /\.internal$/i,                        // Internal domain
          /^0\./,                                // 0.0.0.0/8 network
        ];
        
        return !blockedPatterns.some(pattern => pattern.test(hostname));
      } catch {
        return false;
      }
    }, 'URL not allowed - private/internal addresses are blocked'),
});

// Response schema for type safety
const MetadataResponseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().url().optional(),
  siteName: z.string().optional(),
  url: z.string().url(),
  favicon: z.string().optional(),
  domain: z.string().optional(),
});

/**
 * Checks if URL is a YouTube video
 */
function isYouTubeUrl(url: string): boolean {
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /youtube\.com\/shorts\/([^&\?\/]+)/
  ];
  return youtubePatterns.some(pattern => pattern.test(url));
}

/**
 * Extracts YouTube video ID from URL
 */
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\/]+)/,
    /youtube\.com\/embed\/([^&\?\/]+)/,
    /youtube\.com\/shorts\/([^&\?\/]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Fetches YouTube metadata using oEmbed API (no API key required)
 */
async function fetchYouTubeMetadata(url: string) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Use YouTube's official oEmbed API (works on serverless)
  const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  
  const response = await axios.get(oEmbedUrl, {
    timeout: 10000,
  });

  const data = response.data;

  return {
    title: data.title || 'YouTube Video',
    description: `Watch "${data.title}" by ${data.author_name}`,
    image: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    siteName: 'YouTube',
    favicon: 'https://www.youtube.com/favicon.ico',
    domain: 'youtube.com',
  };
}

/**
 * POST handler for metadata fetching with enhanced error handling and retry logic
 * @param {Request} req - Next.js request object
 * @returns {Promise<NextResponse>} JSON response with metadata or error
 */
export async function POST(req: Request) {
  let requestedUrl: string = '';
  const startTime = Date.now();

  // CRITICAL: Apply rate limiting
  const rateLimit = rateLimiter.check(req);
  
  if (!rateLimit.allowed) {
    return createRateLimitResponse(
      rateLimit.allowed,
      rateLimit.remaining,
      rateLimit.resetTime
    );
  }

  try {
    // Parse and validate request body with timeout protection
    const bodyPromise = req.json();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request parsing timeout')), 5000)
    );

    const body = await Promise.race([bodyPromise, timeoutPromise]);

    // Validate input using Zod schema
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues[0]?.message || 'Invalid request data';
      return NextResponse.json(
        {
          error: errorMessage,
          details: validationResult.error.issues,
          processingTime: Date.now() - startTime
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;
    requestedUrl = url;

    // ENHANCED: Check cache first with better cache management
    const cacheKey = `metadata:${url}`;
    const cached = metadataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for URL: ${url}`);
      return NextResponse.json({
        ...cached.data,
        processingTime: Date.now() - startTime,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // ENHANCED: Clean cache if it's too large (more aggressive cleanup)
    if (metadataCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest 20% of entries
      const entries = Array.from(metadataCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        metadataCache.delete(entries[i][0]);
      }
      console.log(`Cleaned ${toRemove} old cache entries`);
    }

    // Check if URL has too many recent errors
    const errorCacheKey = `error:${url}`;
    const errorEntry = metadataCache.get(errorCacheKey);
    if (errorEntry && (errorEntry.errorCount || 0) >= MAX_RECENT_ERRORS) {
      const errorAge = Date.now() - errorEntry.timestamp;
      if (errorAge < ERROR_CACHE_TTL) {
        console.log(`URL temporarily blocked due to repeated errors: ${url}`);
        return NextResponse.json({
          error: 'This URL has failed multiple times recently. Please try a different URL or wait before retrying.',
          processingTime: Date.now() - startTime,
          temporarilyBlocked: true
        }, { status: 429 });
      } else {
        metadataCache.delete(errorCacheKey);
      }
    }

    // Check if it's a YouTube URL - use oEmbed API
    if (isYouTubeUrl(url)) {
      try {
        const metadata = await fetchYouTubeMetadata(url);
        // Cache the result
        metadataCache.set(cacheKey, { data: { ...metadata, processingTime: Date.now() - startTime, cached: false }, timestamp: Date.now() });
        return NextResponse.json({ ...metadata, processingTime: Date.now() - startTime, cached: false }, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            'X-Cache': 'MISS'
          }
        });
      } catch (error: any) {
        console.error('YouTube oEmbed error:', error.message);
        // Fall back to generic scraping if oEmbed fails
      }
    }

    // Try metadata.party for other URLs
    try {
      const res = await axios.get(`https://metadata.party/api?url=${encodeURIComponent(url)}`, {
        timeout: 3000,
        signal: AbortSignal.timeout(3000),
      });
      let data;
      try {
        data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      } catch (parseError) {
        console.log('metadata.party returned invalid JSON for', url);
        throw new Error('Invalid JSON response');
      }
      const metadata = {
        title: data.title?.slice(0, 200) || 'Untitled',
        description: data.description?.slice(0, 500) || data.excerpt?.slice(0, 500) || '',
        image: data.image || data['og:image'] || data['twitter:image'] || '',
        siteName: data.siteName || new URL(url).hostname,
        url: url,
        favicon: data.favicon || `https://${new URL(url).hostname}/favicon.ico`,
        domain: new URL(url).hostname,
      };
      // Validate and resolve image URL
      if (metadata.image && !metadata.image.startsWith('http')) {
        try {
          const urlObj = new URL(url);
          metadata.image = new URL(metadata.image, urlObj.origin).toString();
        } catch {
          metadata.image = '';
        }
      }
      // Cache and return
      metadataCache.set(cacheKey, { data: { ...metadata, processingTime: Date.now() - startTime, cached: false }, timestamp: Date.now() });
      return NextResponse.json({ ...metadata, processingTime: Date.now() - startTime, cached: false }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Cache': 'MISS'
        }
      });
    } catch (error) {
      console.log('metadata.party failed for', url, error instanceof Error ? error.message : 'Unknown error');
    }

    // Rate limiting delay between requests
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    // For remaining URLs, scrape with improved headers and enhanced retry logic
    // ENHANCED: Better timeout management and error handling
    let response;
    let lastError: unknown = null;
    const maxRetries = 2; // REDUCED: Fewer retries to be less aggressive

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching metadata for ${url} (attempt ${attempt + 1}/${maxRetries + 1})`);

        response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          timeout: 5000, // REDUCED: Shorter timeout to fail faster
          maxRedirects: 3, // REDUCED: Fewer redirects
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
          signal: AbortSignal.timeout(5000),
        });

        // SECURITY: Validate Content-Type to prevent fetching binary files
        const contentType = response.headers['content-type'] || '';
        if (!contentType.includes('text/html') && 
            !contentType.includes('application/xhtml+xml') &&
            !contentType.includes('text/plain')) {
          console.log(`Non-HTML content type for ${url}: ${contentType}`);
          return NextResponse.json({
            error: 'URL does not return HTML content',
            contentType: contentType,
            processingTime: Date.now() - startTime,
          }, { status: 400 });
        }

        console.log(`Successfully fetched ${url} with status ${response.status}`);
        // If we got a response (even if error status), break retry loop
        break;
      } catch (error: unknown) {
        lastError = error;
        console.warn(`Attempt ${attempt + 1} failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');

        // Track errors for this URL
        const errorCacheKey = `error:${url}`;
        const existingErrorEntry = metadataCache.get(errorCacheKey);
        const newErrorCount = (existingErrorEntry?.errorCount || 0) + 1;
        
        metadataCache.set(errorCacheKey, {
          data: null,
          timestamp: Date.now(),
          errorCount: newErrorCount
        });

        // Don't retry on client errors (4xx) - these won't change
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
          console.log(`Client error ${error.response.status} for ${url}, not retrying`);
          break; // Don't throw, just break to return cached error
        }

        // Don't retry on specific errors that won't improve
        if (axios.isAxiosError(error) && error.code === 'ENOTFOUND') {
          console.log(`DNS resolution failed for ${url}, not retrying`);
          break;
        }

        // Retry on network errors, timeouts, or server errors (5xx)
        if (attempt < maxRetries) {
          // Shorter delay between retries
          const delay = 500 + (attempt * 250); // Start with 500ms, increase by 250ms each retry
          console.log(`Retrying ${url} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Last attempt failed, don't throw - return fallback
        console.error(`All retry attempts failed for ${url}`);
      }
    }

    if (!response) {
      // Return fallback metadata instead of throwing error
      const fallbackData = {
        title: new URL(url).hostname,
        description: 'Unable to fetch metadata. Please add a description manually.',
        image: '',
        siteName: new URL(url).hostname,
        url: url,
        favicon: `https://${new URL(url).hostname}/favicon.ico`,
        domain: new URL(url).hostname,
        processingTime: Date.now() - startTime,
        cached: false,
        fallback: true
      };

      // Cache the fallback result
      const cacheKey = `metadata:${url}`;
      metadataCache.set(cacheKey, {
        data: fallbackData,
        timestamp: Date.now()
      });

      console.log(`Returning fallback metadata for ${url}`);
      return NextResponse.json(fallbackData, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', // 30 min cache for fallbacks
          'X-Cache': 'FALLBACK'
        }
      });
    }

    // Load HTML into Cheerio with error handling
    let $: ReturnType<typeof cheerio.load>;
    try {
      $ = cheerio.load(response.data as string);
    } catch (error) {
      console.error('Failed to parse HTML for', url, error);
      throw new Error('Invalid HTML response from website');
    }

    // Extract Open Graph metadata with comprehensive fallbacks
    const metadata = {
      title:
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').first().text() ||
        $('h1').first().text() ||
        'No title found',

      image:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[property="og:image:url"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        $('meta[name="twitter:image:src"]').attr('content') ||
        $('link[rel="image_src"]').attr('href') ||
        '',

      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[property="og:site_name"]').attr('content') ||
        '',

      siteName:
        $('meta[property="og:site_name"]').attr('content') ||
        $('meta[name="application-name"]').attr('content') ||
        new URL(url).hostname,

      url: url, // Include the original URL for reference

      favicon:
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        `https://${new URL(url).hostname}/favicon.ico`,

      domain: new URL(url).hostname,
    };

    // Clean up the data with better sanitization
    metadata.title = sanitizeString(metadata.title.trim().substring(0, 200));
    metadata.description = sanitizeString(metadata.description.trim().substring(0, 500));
    metadata.siteName = sanitizeString(metadata.siteName?.trim().substring(0, 100) || '');

    // Resolve relative image URLs to absolute with better error handling
    if (metadata.image && !metadata.image.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        const resolvedUrl = new URL(metadata.image, urlObj.origin).toString();
        // Validate the resolved URL
        new URL(resolvedUrl); // This will throw if invalid
        metadata.image = resolvedUrl;
      } catch (error) {
        console.warn('Error resolving image URL:', metadata.image, error);
        metadata.image = ''; // Clear invalid image URLs
      }
    }

    // Resolve relative favicon URLs
    if (metadata.favicon && !metadata.favicon.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        const resolvedUrl = new URL(metadata.favicon, urlObj.origin).toString();
        new URL(resolvedUrl);
        metadata.favicon = resolvedUrl;
      } catch (error) {
        console.warn('Error resolving favicon URL:', metadata.favicon, error);
        metadata.favicon = `https://${new URL(url).hostname}/favicon.ico`;
      }
    }

    // Validate final metadata
    if (!metadata.title || metadata.title === 'No title found') {
      console.warn('No valid title found for', url);
    }

    // Cache the result with processing time
    const processingTime = Date.now() - startTime;
    const cacheData = {
      ...metadata,
      processingTime,
      cached: false,
      fetchedAt: new Date().toISOString()
    };

    metadataCache.set(cacheKey, { data: cacheData, timestamp: Date.now() });

    console.log(`Successfully processed metadata for ${url} in ${processingTime}ms`);

    return NextResponse.json(cacheData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS',
        'X-Processing-Time': processingTime.toString()
      }
    });
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;

    // Handle different error types with user-friendly messages and enhanced logging
    if (axios.isAxiosError(error)) {
      // Network/timeout errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        console.error('Metadata fetch timeout:', {
          url: requestedUrl,
          processingTime,
          timeout: true
        });

        return NextResponse.json(
          {
            error: 'Request timeout. The website took too long to respond. Please try again.',
            processingTime,
            timeout: true
          },
          { status: 408 }
        );
      }

      // HTTP status errors
      if (error.response) {
        const status = error.response.status;
        console.warn('Metadata fetch HTTP error:', {
          url: requestedUrl,
          status,
          processingTime
        });

        if (status === 403 || status === 401) {
          return NextResponse.json(
            {
              error: 'This website has restrictions preventing metadata fetching. You can still add the link manually by entering the title and description yourself.',
              restriction: true,
              processingTime
            },
            { status: 403 }
          );
        }

        if (status === 404) {
          return NextResponse.json(
            {
              error: 'URL not found. Please check the URL and try again.',
              processingTime
            },
            { status: 404 }
          );
        }

        if (status === 429) {
          return NextResponse.json(
            {
              error: 'Too many requests. Please wait a moment and try again.',
              processingTime,
              rateLimited: true
            },
            { status: 429 }
          );
        }

        if (status >= 500) {
          return NextResponse.json(
            {
              error: 'The website is experiencing issues. Please try again later.',
              processingTime,
              serverError: true
            },
            { status: 500 }
          );
        }
      }

      // CORS or network errors
      if (error.message.includes('CORS') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
        console.warn('Metadata fetch network/CORS error:', {
          url: requestedUrl,
          error: error.message,
          processingTime
        });

        return NextResponse.json(
          {
            error: 'This website has restrictions preventing metadata fetching. You can still add the link manually.',
            restriction: true,
            processingTime,
            corsError: true
          },
          { status: 403 }
        );
      }
    }

    // Log detailed error for server-side debugging with structured logging
    console.error('Metadata fetch error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: axios.isAxiosError(error) ? error.code : undefined,
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      requestedUrl: requestedUrl,
      processingTime,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    // Generic error message with processing time
    return NextResponse.json(
      {
        error: 'Unable to fetch link details. The website may have restrictions or be temporarily unavailable. You can still add the link manually.',
        restriction: true,
        processingTime,
        fallback: true
      },
      { status: 500 }
    );
  }
}
