import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set explicit output file tracing root to silence workspace warning
  outputFileTracingRoot: __dirname,

  // SECURITY: Add security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      // YouTube thumbnails
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      // Twitter/X images
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      // Instagram images
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'instagram.com',
      },
      // LinkedIn images
      {
        protocol: 'https',
        hostname: 'media.licdn.com',
      },
      // GitHub images
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      // Medium images
      {
        protocol: 'https',
        hostname: 'miro.medium.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn-images-1.medium.com',
      },
      // Reddit images
      {
        protocol: 'https',
        hostname: 'external-preview.redd.it',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
      },
      // Facebook images
      {
        protocol: 'https',
        hostname: 'scontent.xx.fbcdn.net',
      },
      // TikTok images
      {
        protocol: 'https',
        hostname: 'p16-sign-sg.tiktokcdn.com',
      },
      // Common CDNs and image services
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // Favicon and icon CDNs
      {
        protocol: 'https',
        hostname: 'c1.tablecdn.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com.sg',
      },
      {
        protocol: 'https',
        hostname: 'favicons.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      // Common favicon services
      {
        protocol: 'https',
        hostname: 'icons.duckduckgo.com',
      },
      {
        protocol: 'https',
        hostname: 'www.favicon.cc',
      },
      // Buffer.com (from your error log)
      {
        protocol: 'https',
        hostname: 'buffer.com',
      },
      // Allow localhost for development
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
    // OPTIMIZED: Image optimization settings
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // Increased from 60s to 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: true, // CRITICAL: Required for Netlify image optimization
    // OPTIMIZED: Add loader for external images
    loader: 'default',
    // OPTIMIZED: Limit concurrent image optimization requests
    domains: [], // Deprecated, use remotePatterns instead
  },

  // OPTIMIZED: Webpack optimization for bundle size
  webpack: (config, { isServer, dev }) => {
    // Fix for "File is not defined" error in serverless functions
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Suppress Supabase Edge Runtime warnings by excluding problematic modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Suppress process.version warnings from Supabase
        'process': 'process/browser',
      };
    }

    // BUNDLE OPTIMIZED: Advanced chunk splitting to reduce main bundle
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        // BUNDLE OPTIMIZED: More aggressive chunk splitting
        splitChunks: {
          chunks: 'all',
          minSize: 20000, // Reduced from default to create smaller chunks
          maxSize: 250000, // Prevent overly large chunks
          cacheGroups: {
            default: false,
            vendors: false,

            // BUNDLE OPTIMIZED: Very high priority for large vendor libraries
            'supabase-vendor': {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase-vendor',
              chunks: 'all',
              priority: 50,
              enforce: true,
            },

            // BUNDLE OPTIMIZED: Radix UI - separate chunk with high priority
            'radix-vendor': {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'radix-vendor',
              chunks: 'all',
              priority: 45,
              enforce: true,
            },

            // BUNDLE OPTIMIZED: React ecosystem - separate chunk
            'react-vendor': {
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
              name: 'react-vendor',
              chunks: 'all',
              priority: 40,
              enforce: true,
            },

            // BUNDLE OPTIMIZED: UI components and utils
            'ui-vendor': {
              test: /[\\/]node_modules[\\/](class-variance-authority|clsx|tailwind-merge|lucide-react)[\\/]/,
              name: 'ui-vendor',
              chunks: 'all',
              priority: 35,
              enforce: true,
            },

            // BUNDLE OPTIMIZED: Forms and validation
            'forms-vendor': {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms-vendor',
              chunks: 'all',
              priority: 30,
              enforce: true,
            },

            // Common chunk for shared app code with higher threshold
            common: {
              name: 'common',
              minChunks: 3, // Increased from 2 to reduce common chunk size
              chunks: 'all',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    // Optimize webpack cache
    if (config.cache && typeof config.cache === 'object') {
      config.cache.maxMemoryGenerations = 1;
      config.cache.maxAge = 1000 * 60 * 60 * 24; // 24 hours
    }

    return config;
  },

  // OPTIMIZED: Production optimizations
  productionBrowserSourceMaps: false, // Disable source maps in production
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression

  // OPTIMIZED: Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep error and warn logs
    } : false,
  },

  // Ensure API routes work properly on Netlify
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // OPTIMIZED: Enable optimistic client cache
    optimisticClientCache: true,
    // OPTIMIZED: Enable partial prerendering (Next.js 14+)
    // ppr: true, // Uncomment when stable
  },

  // OPTIMIZED: Remove standalone output for Netlify compatibility
  // output: 'standalone', // Commented out - causes routing issues on Netlify

  // CRITICAL: Add Netlify-specific configurations
  trailingSlash: false, // Changed to false to fix sitemap.xml and robots.txt 404s

};

export default nextConfig;

