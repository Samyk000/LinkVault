"use client";

/**
 * @file components/providers/resource-hints.tsx
 * @description Adds resource hints for faster external resource loading
 * OPTIMIZED: Uses script tag for immediate execution before React hydration
 * @created 2025-11-06
 */

export function ResourceHints() {
  // OPTIMIZED: Add resource hints immediately via script tag (runs before React hydration)
  if (typeof window !== 'undefined' && !document.querySelector('link[data-resource-hints]')) {
    const addResourceHint = (rel: string, href: string, crossOrigin?: string) => {
      const existing = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        link.setAttribute('data-resource-hints', 'true');
        if (crossOrigin) {
          link.setAttribute('crossOrigin', crossOrigin);
        }
        document.head.appendChild(link);
      }
    };

    // Add preconnect and dns-prefetch for Supabase (critical for fast API calls)
    addResourceHint('preconnect', 'https://supabase.co');
    addResourceHint('dns-prefetch', 'https://supabase.co');
    
    // Get actual Supabase URL from environment or config
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        addResourceHint('preconnect', url.origin);
        addResourceHint('dns-prefetch', url.origin);
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return null;
}

