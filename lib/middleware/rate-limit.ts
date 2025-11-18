/**
 * @file lib/middleware/rate-limit.ts
 * @description Rate limiting middleware for API routes
 * @created 2025-11-11
 */

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Max requests per interval
}

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();

/**
 * Rate limiter for API routes
 * @param {RateLimitConfig} config - Rate limiting configuration
 * @returns {Function} Rate limiting function
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { interval, maxRequests } = config;

  return {
    /**
     * Check if request is within rate limit
     * @param {Request} request - Incoming request
     * @param {string} identifier - Optional identifier (defaults to IP)
     * @returns {{allowed: boolean; remaining: number; resetTime: number}}
     */
    check(request: Request, identifier?: string) {
      const key = identifier || getClientIp(request);
      const now = Date.now();
      
      // Clean up old entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        cleanupOldEntries(now);
      }

      let store = rateLimitStore.get(key);
      
      if (!store || now >= store.resetTime) {
        // Create new store or reset expired one
        store = {
          count: 0,
          resetTime: now + interval,
        };
        rateLimitStore.set(key, store);
      }

      if (store.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: store.resetTime,
        };
      }

      store.count++;
      
      return {
        allowed: true,
        remaining: maxRequests - store.count,
        resetTime: store.resetTime,
      };
    },

    /**
     * Reset rate limit for a specific identifier
     * @param {string} identifier - Identifier to reset
     */
    reset(identifier: string) {
      rateLimitStore.delete(identifier);
    },
  };
}

/**
 * Get client IP address from request
 * @param {Request} request - Incoming request
 * @returns {string} Client IP address
 */
function getClientIp(request: Request): string {
  // Check for forwarded IP (behind proxy)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier (less accurate but prevents errors)
  return 'unknown-ip';
}

/**
 * Clean up expired entries from the rate limit store
 * @param {number} now - Current timestamp
 */
function cleanupOldEntries(now: number): void {
  for (const [key, store] of rateLimitStore.entries()) {
    if (now >= store.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Create a rate limit response
 * @param {boolean} allowed - Whether request is allowed
 * @param {number} remaining - Remaining requests
 * @param {number} resetTime - Time when limit resets
 * @returns {Response} Rate limit response
 */
export function createRateLimitResponse(
  allowed: boolean,
  remaining: number,
  resetTime: number
): Response {
  const headers = {
    'X-RateLimit-Limit': '10',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}