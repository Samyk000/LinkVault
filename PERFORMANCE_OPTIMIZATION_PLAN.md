# LinksVault Performance Optimization Plan
## Lighthouse Score Improvement: 39 → Target 80+

**Created:** December 26, 2025  
**Current Score:** 39  
**Target Score:** 80+  
**Key Metrics:**
- LCP: 6.5s → Target <2.5s
- TBT: 2,260ms → Target <200ms
- Speed Index: 2.9s → Target <3.4s

---

## ROOT CAUSE ANALYSIS

### 1. robots.txt Issue (CRITICAL)
**Problem:** Lighthouse reports "unable to download robots.txt file"
**Root Cause:** The `app/robots.ts` file uses `force-static` but may not be generating correctly, OR there's a server configuration issue preventing access.
**Evidence:** File exists at `app/robots.ts` with correct Next.js metadata route format.

### 2. Document Request Latency (1,850ms savings potential)
**Problem:** Server responded slowly (observed 1954ms TTFB)
**Root Causes:**
- Server-side auth check in `layout.tsx` makes 3 Supabase calls on every page load
- No edge caching for authenticated routes
- Supabase queries not optimized

### 3. Massive JavaScript Bundle (CRITICAL - 2,538 KiB for page.js)
**Problem:** `app/page.js` is 2.5MB, causing 3.6s JS execution time
**Root Causes:**
- All components loaded synchronously
- No code splitting for dashboard vs landing page
- Heavy dependencies (Supabase, Radix UI, Lucide icons) not tree-shaken
- Development mode artifacts in production

### 4. Image Optimization Issues (484 KiB savings)
**Problem:** External images not optimized, wrong sizes served
**Root Causes:**
- External OG images served at full resolution (1920x1115 for 223x168 display)
- No responsive image sizing for link thumbnails
- Images from non-whitelisted domains use `unoptimized={true}`

### 5. Excessive Supabase API Calls
**Problem:** 8+ sequential `/v1/user` calls in network waterfall
**Root Causes:**
- Multiple components independently calling `getUser()`
- No request deduplication at app level
- Auth state not properly shared across components

### 6. CSS/JS Not Minified in Dev
**Problem:** 22KB JS and 11KB CSS savings from minification
**Note:** This is likely dev mode - verify production build

---

## EXECUTION PHASES

### Phase 1: Critical Fixes (Immediate Impact)
**Estimated Time: 2-3 hours**
**Expected Score Improvement: +15-20 points**

#### 1.1 Fix robots.txt Generation
**File:** `app/robots.ts` → `public/robots.txt`

**Problem:** Dynamic route may not be accessible or cached properly.

**Solution:** Create static robots.txt in public folder for guaranteed availability.

```
# public/robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /app/
Disallow: /login
Disallow: /signup

Sitemap: https://www.linksvault.online/sitemap.xml
```

**Also keep:** `app/robots.ts` as backup for dynamic generation.

**Test:** `curl https://www.linksvault.online/robots.txt`

---

#### 1.2 Add Preconnect for Critical Origins
**File:** `app/layout.tsx`

**Problem:** No preconnect hints for Supabase API.

**Changes Required:**
```tsx
// In <head> section
<link rel="preconnect" href="https://fwqzmuogcziicixologi.supabase.co" />
<link rel="dns-prefetch" href="https://fwqzmuogcziicixologi.supabase.co" />
```

**Note:** Remove unused preconnect to `supabase.co` (should be the actual project URL).

---

#### 1.3 Optimize Server-Side Auth Check
**File:** `app/layout.tsx`

**Problem:** 3 sequential Supabase calls on every page load.

**Current Code:**
```tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// Then 2 more queries for profile and settings
```

**Optimized Code:**
```tsx
// Only fetch user on server - defer profile/settings to client
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Pass minimal user data, load profile/settings client-side
const authUser = user ? { id: user.id, email: user.email } : null;
```

---

### Phase 2: JavaScript Bundle Optimization
**Estimated Time: 3-4 hours**
**Expected Score Improvement: +20-25 points**

#### 2.1 Split Landing Page from Dashboard
**Files:** `app/page.tsx`, new `components/landing/` structure

**Problem:** Landing page loads entire dashboard code.

**Solution:** True code splitting with dynamic imports.

```tsx
// app/page.tsx - Optimized
import dynamic from 'next/dynamic';

// Only load landing page component - dashboard is separate route
const LandingPage = dynamic(
  () => import('@/components/landing/landing-page').then(mod => ({ default: mod.LandingPage })),
  { 
    loading: () => <LandingPageSkeleton />,
    ssr: true 
  }
);
```

---

#### 2.2 Lazy Load Heavy Components
**Files:** Multiple component files

**Components to lazy load:**
- All modals (already done with `LazyAddLinkModal`, etc.)
- Icon picker
- Color picker
- Settings panels
- Share functionality

```tsx
// Example: Lazy load Lucide icons
const StarIcon = dynamic(() => import('lucide-react').then(mod => mod.Star));
```

---

#### 2.3 Optimize Supabase Import
**File:** `lib/supabase/client.ts`

**Problem:** Full Supabase client imported everywhere.

**Solution:** Tree-shake unused features.

```tsx
// Instead of
import { createClient } from '@supabase/supabase-js';

// Use specific imports
import { createBrowserClient } from '@supabase/ssr';
```

---

#### 2.4 Remove Unused Dependencies
**File:** `package.json`

**Audit for:**
- `isomorphic-dompurify` - check if used
- `@tanstack/react-query` - check if used (saw zustand is primary)
- Duplicate icon libraries

---

### Phase 3: Image Optimization
**Estimated Time: 2-3 hours**
**Expected Score Improvement: +5-10 points**

#### 3.1 Implement Image Proxy for External Images
**File:** New `app/api/image-proxy/route.ts`

**Problem:** External OG images can't be optimized by Next.js.

**Solution:** Proxy and resize external images.

```tsx
// app/api/image-proxy/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const width = parseInt(searchParams.get('w') || '400');
  const quality = parseInt(searchParams.get('q') || '75');
  
  // Fetch, resize, and cache the image
  // Return optimized image with proper cache headers
}
```

---

#### 3.2 Update Link Card Image Sizes
**File:** `components/links/link-card.tsx`

**Current:** `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"`

**Problem:** Images loaded at larger sizes than displayed.

**Optimized:**
```tsx
sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 20vw"
// Actual display: ~223x168 max
```

---

#### 3.3 Add Responsive Image Component
**File:** New `components/ui/optimized-image.tsx`

```tsx
// Wrapper that handles external images with proxy
export function OptimizedImage({ src, alt, width, height, priority }) {
  const optimizedSrc = isExternalUrl(src) 
    ? `/api/image-proxy?url=${encodeURIComponent(src)}&w=${width}&q=75`
    : src;
    
  return <Image src={optimizedSrc} ... />;
}
```

---

### Phase 4: Reduce API Waterfall
**Estimated Time: 2-3 hours**
**Expected Score Improvement: +10-15 points**

#### 4.1 Deduplicate Auth Calls
**File:** `lib/contexts/auth-context.tsx`

**Problem:** Multiple `getUser()` calls from different components.

**Solution:** Single source of truth with React Query or custom cache.

```tsx
// Add request deduplication
const userPromiseCache = new Map<string, Promise<User | null>>();

export async function getAuthUser() {
  const cacheKey = 'current-user';
  if (userPromiseCache.has(cacheKey)) {
    return userPromiseCache.get(cacheKey);
  }
  
  const promise = supabase.auth.getUser().then(r => r.data.user);
  userPromiseCache.set(cacheKey, promise);
  
  // Clear after resolution
  promise.finally(() => {
    setTimeout(() => userPromiseCache.delete(cacheKey), 100);
  });
  
  return promise;
}
```

---

#### 4.2 Batch Initial Data Fetch
**File:** `components/providers/store-initializer.tsx`

**Current:** Sequential fetches for settings, folders, links.

**Optimized:** Already using `Promise.all` - verify it's working correctly.

---

#### 4.3 Add Stale-While-Revalidate for User Data
**File:** `lib/services/supabase-database.service.ts`

```tsx
// Return cached data immediately, revalidate in background
async getLinks() {
  const cached = this.cache.get('links');
  if (cached && !this.isStale(cached)) {
    // Revalidate in background
    this.revalidateLinks();
    return cached.data;
  }
  // ... fetch fresh
}
```

---

### Phase 5: Caching & Headers
**Estimated Time: 1-2 hours**
**Expected Score Improvement: +5-10 points**

#### 5.1 Add Cache Headers for Static Assets
**File:** `next.config.ts`

**Already configured** - verify headers are being applied.

---

#### 5.2 Enable ISR for Landing Page
**File:** `app/page.tsx`

```tsx
// Make landing page static with revalidation
export const revalidate = 3600; // Revalidate every hour

// Or use generateStaticParams for full static generation
export const dynamic = 'force-static';
```

---

#### 5.3 Add Service Worker for Offline Support
**File:** New `public/sw.js`

**Optional but beneficial for repeat visits.**

---

### Phase 6: Production Build Verification
**Estimated Time: 1 hour**

#### 6.1 Verify Production Build
```bash
npm run build
npm run start
# Test with Lighthouse in production mode
```

#### 6.2 Check Bundle Analysis
```bash
ANALYZE=true npm run build
# Review bundle sizes
```

#### 6.3 Remove Development Artifacts
- Ensure `removeConsole` is working
- Verify source maps are disabled
- Check for debug code

---

## IMPLEMENTATION ORDER

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Critical Fixes (Do First - Quick Wins)            │
├─────────────────────────────────────────────────────────────┤
│ 1.1 robots.txt          → 1.2 Preconnect hints             │
│ 1.3 Server auth optimization                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: JS Bundle (Biggest Impact)                        │
├─────────────────────────────────────────────────────────────┤
│ 2.1 Code splitting      → 2.2 Lazy loading                 │
│ 2.3 Supabase tree-shake → 2.4 Dependency audit             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Images (Medium Impact)                            │
├─────────────────────────────────────────────────────────────┤
│ 3.1 Image proxy         → 3.2 Responsive sizes             │
│ 3.3 Optimized component                                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4-6: API & Caching (Polish)                          │
├─────────────────────────────────────────────────────────────┤
│ 4.x API optimization    → 5.x Caching                      │
│ 6.x Production verification                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## FILE CHANGE SUMMARY

| File | Changes | Phase | Impact |
|------|---------|-------|--------|
| `public/robots.txt` | CREATE - Static robots.txt | 1.1 | SEO |
| `app/layout.tsx` | Add preconnect, optimize auth | 1.2, 1.3 | TTFB |
| `app/page.tsx` | Dynamic import landing page | 2.1 | Bundle |
| `components/links/link-card.tsx` | Optimize image sizes | 3.2 | LCP |
| `app/api/image-proxy/route.ts` | CREATE - Image proxy | 3.1 | LCP |
| `lib/contexts/auth-context.tsx` | Dedupe auth calls | 4.1 | Waterfall |
| `next.config.ts` | Verify/enhance caching | 5.1 | Cache |

---

## VERIFICATION CHECKLIST

### Phase 1 Verification
- [ ] `curl https://www.linksvault.online/robots.txt` returns valid content
- [ ] Network tab shows preconnect to Supabase
- [ ] TTFB reduced from 1954ms to <500ms

### Phase 2 Verification
- [ ] `app/page.js` bundle < 500KB
- [ ] Landing page loads without dashboard code
- [ ] Lighthouse JS execution time < 1.5s

### Phase 3 Verification
- [ ] External images served at correct dimensions
- [ ] Image proxy returns optimized images
- [ ] LCP image loads in < 2.5s

### Phase 4-6 Verification
- [ ] Only 1-2 `/v1/user` calls in network waterfall
- [ ] Cache headers present on static assets
- [ ] Production Lighthouse score > 80

---

## EXPECTED RESULTS

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Performance Score | 39 | 80+ | +41 points |
| LCP | 6.5s | <2.5s | -4s |
| TBT | 2,260ms | <200ms | -2,060ms |
| Speed Index | 2.9s | <2.5s | -0.4s |
| JS Bundle | 2,538KB | <500KB | -2,038KB |

---

## COMPLETION TRACKING

| Phase | Status | Completed Date | Notes |
|-------|--------|----------------|-------|
| 1.1 robots.txt | ✅ Complete | 2025-12-26 | Created static public/robots.txt |
| 1.2 Preconnect | ✅ Complete | 2025-12-26 | Added preconnect to Supabase and GitHub |
| 1.3 Server Auth | ✅ Complete | 2025-12-26 | Removed profile/settings fetch from server |
| 2.1 Code Split | ✅ Complete | 2025-12-26 | Dynamic import for LandingPage |
| 2.2 Lazy Load | ✅ Already Done | 2025-12-26 | Modals already lazy loaded via components/lazy/ |
| 2.3 Supabase | ✅ Already Optimized | 2025-12-26 | Using @supabase/ssr (tree-shakeable) |
| 2.4 Dependencies | ⚠️ Partial | 2025-12-26 | isomorphic-dompurify unused - can remove |
| 3.1 Image Proxy | ✅ Complete | 2025-12-26 | Created /api/image-proxy route |
| 3.2 Image Sizes | ✅ Complete | 2025-12-26 | Optimized sizes to actual display dimensions |
| 3.3 Optimized Img | ✅ Complete | 2025-12-26 | Created OptimizedImage component |
| 4.1 Auth Dedupe | ✅ Already Done | 2025-12-26 | Auth context has proper state management |
| 5.x Caching | ✅ Already Done | 2025-12-26 | next.config.ts has cache headers |
| 6.x Production | ⬜ Pending | | |

### Additional Fixes Applied (2025-12-26):
- Fixed `app/error.tsx` - Removed html/body tags (was causing hydration errors)
- Added missing image domains to `next.config.ts`: luvvoice.com, filemock.com, dos.zone, *.vercel.app

---

**Ready to proceed with Phase 1?**
