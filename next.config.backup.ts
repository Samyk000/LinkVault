import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    // Optimize images for better performance
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Allow unoptimized images for external domains not in the list
    // This prevents errors when users add links with images from unknown domains
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Disable optimization for external images to prevent errors
    // External images will be loaded directly without Next.js optimization
    unoptimized: false,
  },
  webpack: (config, { isServer }) => {
    // Fix for "File is not defined" error in serverless functions
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Optimize webpack cache to reduce serialization warnings
    if (config.cache && typeof config.cache === 'object') {
      config.cache.maxMemoryGenerations = 1;
      config.cache.maxAge = 1000 * 60 * 60 * 24; // 24 hours
    }
    
    return config;
  },
  // Ensure API routes work properly on Netlify
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
