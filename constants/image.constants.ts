/**
 * @file constants/image.constants.ts
 * @description Image loading and optimization constants
 * @created 2025-11-21
 */

/**
 * Image quality and performance constants
 */
export const IMAGE_CONSTANTS = {
    // Quality settings for Next.js Image component
    QUALITY_HIGH: 75,      // Used for priority/above-the-fold images
    QUALITY_STANDARD: 60,  // Used for lazy-loaded images (30-40% smaller file size)

    // Priority image settings
    PRIORITY_IMAGE_COUNT: 2,  // Number of images to load eagerly for LCP optimization

    // Lazy loading configuration
    INITIAL_LOAD_COUNT: 8,   // Initial batch of items to display
    LOAD_MORE_COUNT: 8,      // Number of items to load when scrolling

    // Blur placeholder for priority images (SVG base64)
    BLUR_DATA_URL: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4=',

    /**
     * Allowed image domains for Next.js Image optimization
     * These domains are configured in next.config.ts remotePatterns
     * Keep this list in sync with remotePatterns for isAllowedImageDomain() checks
     */
    ALLOWED_DOMAINS: [
        // YouTube
        'img.youtube.com',
        'i.ytimg.com',
        // Twitter/X
        'pbs.twimg.com',
        // Instagram
        'scontent.cdninstagram.com',
        'instagram.com',
        // LinkedIn
        'media.licdn.com',
        // GitHub
        'avatars.githubusercontent.com',
        'github.com',
        'favicons.githubusercontent.com',
        'opengraph.githubassets.com',
        'repository-images.githubusercontent.com',
        // Medium
        'miro.medium.com',
        'cdn-images-1.medium.com',
        // Reddit
        'external-preview.redd.it',
        'preview.redd.it',
        // Facebook
        'scontent.xx.fbcdn.net',
        // TikTok
        'p16-sign-sg.tiktokcdn.com',
        // Common CDNs
        'images.unsplash.com',
        'via.placeholder.com',
        // Favicon services
        'c1.tablecdn.com',
        'www.google.com',
        'www.google.com.sg',
        'logo.clearbit.com',
        'icons.duckduckgo.com',
        'www.favicon.cc',
        // Vercel
        'vercel.app',
        'frontend-blog-ngrok.vercel.app',
        // Other common OG image sources
        'buffer.com',
        'luvvoice.com',
        'filemock.com',
        'dos.zone',
        'localhost',
    ] as const,
} as const;

/**
 * Fetch priority values for browser-level resource hints
 */
export const FETCH_PRIORITY = {
    HIGH: 'high',
    LOW: 'low',
} as const;
