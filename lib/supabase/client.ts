/**
 * @file lib/supabase/client.ts
 * @description Supabase client configuration for browser usage with optimized settings
 * @created 2025-01-01
 * @modified 2025-01-21
 */

import { createBrowserClient as createClientCore } from '@supabase/ssr';
import { AUTH_CONSTANTS } from '@/constants/auth.constants';
import { logger } from '@/lib/utils/logger';

// Singleton instance to prevent multiple connections
let supabaseInstance: any = null;

/**
 * Creates or returns existing Supabase client instance
 * @returns Supabase client instance
 */
export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const error = 'Missing Supabase environment variables';
    logger.error(error);
    throw new Error(error);
  }

  try {
    // Create optimized client with sensible defaults
    supabaseInstance = createClientCore(
      supabaseUrl,
      supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          // Use Supabase default storage (more reliable than custom implementation)
        },
        // Optimized realtime config - minimal overhead
        realtime: {
          params: {
            eventsPerSecond: 3,
          },
          heartbeatIntervalMs: 90000, // 90s
          timeout: 5000,
        },
        global: {
          headers: {
            'X-Client-Info': 'linkvault-web-optimized',
          },
          // Improved fetch with proper headers and timeout
          fetch: (input: any, init: any = {}) => {
            // Ensure Accept header is set for Supabase REST API
            const headers = new Headers(init.headers || {});
            if (!headers.has('Accept')) {
              headers.set('Accept', 'application/json');
            }
            
            return fetch(input, {
              ...init,
              headers,
              signal: AbortSignal.timeout(AUTH_CONSTANTS.FETCH_TIMEOUT),
            }).catch((error) => {
              if (error.name === 'AbortError' || error.name === 'TimeoutError') {
                logger.warn('Supabase request timed out:', {
                  url: typeof input === 'string' ? input : input.url,
                  timeout: AUTH_CONSTANTS.FETCH_TIMEOUT,
                });
              }
              throw error;
            });
          },
        },
      }
    );

    logger.debug('Supabase client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    throw error;
  }
}

/**
 * Reset the singleton instance (useful for testing)
 * @internal
 */
export function resetClient() {
  supabaseInstance = null;
}