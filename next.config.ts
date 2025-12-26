import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set explicit output file tracing root to silence workspace warning
  outputFileTracingRoot: __dirname,

  // SECURITY: Add security headers + PERFORMANCE: Add caching headers
  async headers() {
    return [
      // Security headers for all routes
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
      // PERFORMANCE: Cache immutable static assets (hashed filenames)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // PERFORMANCE: Cache optimized images with stale-while-revalidate
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
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
      {
        protocol: 'https',
        hostname: 'opengraph.githubassets.com',
      },
      {
        protocol: 'https',
        hostname: 'repository-images.githubusercontent.com',
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
      // Additional OG image sources
      {
        protocol: 'https',
        hostname: 'luvvoice.com',
      },
      {
        protocol: 'https',
        hostname: 'filemock.com',
      },
      {
        protocol: 'https',
        hostname: 'dos.zone',
      },
      // Vercel domains
      {
        protocol: 'https',
        hostname: '*.vercel.app',
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
    // OPTIMIZED: Image optimization settings for Vercel
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    qualities: [50, 60, 75, 80, 90, 100], // Valid quality values
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Note: Individual <Image> components use unoptimized={!isAllowedImageDomain(url)}
    // for external URLs not in remotePatterns to prevent runtime errors
    loader: 'default',
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

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // OPTIMIZED: Enable optimistic client cache
    optimisticClientCache: true,
  },

  // URL configuration
  trailingSlash: false,

};

export default nextConfig;
