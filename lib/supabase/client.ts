/**
 * @file lib/supabase/client.ts
 * @description Supabase client configuration for browser usage with optimized realtime settings and error handling
 * @created 2025-01-01
 */

// BUNDLE OPTIMIZED: Import only essential modules instead of full @supabase/ssr
import { createBrowserClient as createClientCore } from '@supabase/ssr';

// OPTIMIZED: Singleton instance to prevent multiple connections
let supabaseInstance: any = null;

export function createClient() {
  // Return existing instance if available
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // BUNDLE OPTIMIZED: Create lightweight client with minimal features
  supabaseInstance = createClientCore(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // BUNDLE OPTIMIZED: Simplified storage for smaller bundle
        storage: typeof window !== 'undefined' ? {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key);
            } catch (error) {
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value);
            } catch (error) {
              // Silently fail in production
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              // Silently fail in production
            }
          },
        } : undefined,
      },
      // BUNDLE OPTIMIZED: Minimal realtime config - disabled by default
      realtime: {
        params: {
          eventsPerSecond: 3, // Further reduced
        },
        heartbeatIntervalMs: 90000, // Increased to reduce network overhead
        timeout: 5000, // Reduced timeout
      },
      global: {
        headers: {
          'X-Client-Info': 'linkvault-web-optimized',
        },
        // BUNDLE OPTIMIZED: Minimal fetch config
        fetch: (input: any, init: any = {}) => {
          return fetch(input, {
            ...init,
            signal: AbortSignal.timeout(5000), // Reduced timeout
          }).catch((error) => {
            // Minimal error handling to reduce bundle size
            throw error;
          });
        },
      },
    }
  );

  return supabaseInstance;
}