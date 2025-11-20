/**
 * @file middleware.ts
 * @description Enhanced middleware with improved authentication handling and error recovery
 * @created 2025-01-01
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Simple logger for Edge runtime (can't use Node.js modules)
const logger = {
  error: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Middleware]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Middleware]', ...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Middleware]', ...args);
    }
  },
};

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 500,
  maxDelay: 5000,
};

/**
 * Exponential backoff retry mechanism
 * @param {Function} operation - Operation to retry
 * @param {number} attempt - Current attempt number
 * @returns {Promise<T>} Operation result
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  attempt: number = 0
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
      RETRY_CONFIG.maxDelay
    );

    // Only log retries in development
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`Middleware operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return retryWithBackoff(operation, attempt + 1);
  }
}

/**
 * Check if the path requires authentication
 * @param {string} pathname - Request pathname
 * @returns {boolean} Whether authentication is required
 */
function requiresAuth(pathname: string): boolean {
  if (pathname === '/') return false;
  const publicPaths = ['/login', '/signup', '/auth', '/api/auth', '/share'];
  return !publicPaths.some(path => pathname.startsWith(path));
}

/**
 * Check if the path is an auth page
 * @param {string} pathname - Request pathname
 * @returns {boolean} Whether it's an auth page
 */
function isAuthPage(pathname: string): boolean {
  return pathname.startsWith('/login') || pathname.startsWith('/signup');
}

/**
 * Enhanced middleware with improved error handling and session management
 * @param {NextRequest} request - Next.js request object
 * @returns {Promise<NextResponse>} Response object
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes (except auth)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') ||
    pathname.includes('.') && !pathname.endsWith('.html')
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Create Supabase client with retry mechanism
    const supabase = await retryWithBackoff(async () => {
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value);
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );
    });

    // Get user session with retry mechanism
    const { data: { session }, error: sessionError } = await retryWithBackoff(async () => {
      return supabase.auth.getSession();
    });

    if (sessionError) {
      logger.error('Auth error in middleware:', sessionError);

      // Handle specific session errors
      if (sessionError.message?.includes('AuthSessionMissingError')) {
        // Session is missing, redirect to login if auth is required
        if (requiresAuth(pathname)) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirectTo', pathname);
          return NextResponse.redirect(loginUrl);
        }
        return response;
      }

      // For other auth errors, allow the request to continue but log the error
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Non-critical auth error, continuing:', sessionError);
      }
    }

    const isAuthenticated = !!session?.user;

    // Handle authenticated users trying to access auth pages
    if (isAuthenticated && isAuthPage(pathname)) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/app';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Handle unauthenticated users trying to access protected pages
    // BUT: Don't redirect if we're already on login page (prevents redirect loops)
    if (!isAuthenticated && requiresAuth(pathname) && !isAuthPage(pathname)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // CRITICAL: Allow authenticated users to access /app without redirecting
    // This ensures session persistence works correctly
    if (isAuthenticated && pathname.startsWith('/app')) {
      return response;
    }

    // OPTIMIZED: Refresh session proactively (within 15 minutes instead of 5)
    // This reduces the number of refresh operations while ensuring session stays valid
    // Only refresh on protected routes to avoid unnecessary work on public pages
    if (session?.expires_at && requiresAuth(pathname)) {
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000; // Increased from 5 to 15 minutes

      if (expiresAt - now < fifteenMinutes) {
        try {
          await retryWithBackoff(async () => {
            const { error } = await supabase.auth.refreshSession();
            if (error) throw error;
          });
        } catch (refreshError) {
          logger.error('Session refresh failed in middleware:', refreshError);
          // If refresh fails and we're on a protected route, redirect to login
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('redirectTo', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
    }

    return response;

  } catch (error) {
    logger.error('Critical middleware error:', error);

    // For critical errors, handle gracefully
    if (requiresAuth(pathname)) {
      // If it's a protected route and we have a critical error, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('error', 'session_error');
      return NextResponse.redirect(loginUrl);
    }

    // For public routes, allow the request to continue
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};