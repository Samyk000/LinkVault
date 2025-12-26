# Lighthouse Deep Analysis - TBT & LCP Issues

## Executive Summary

**Current State:**
- Production: 55-87 (fluctuating)
- Localhost: 37-68 (fluctuating)
- TBT: 470ms (production) / 1,470ms (localhost) - Target: <200ms
- LCP: 2.1s-6.3s (inconsistent) - Target: <2.5s

**Root Causes Identified:**
1. **Heavy client-side initialization chain** blocking main thread
2. **Auth state hydration** causing render delays
3. **Massive inline CSS** in landing page (~600 lines of `<style jsx global>`)
4. **Multiple provider wrappers** all initializing on page load
5. **Supabase client** initializing even for unauthenticated landing page

---

## Issue #1: Landing Page is "use client" with Auth Check

**File:** `app/page.tsx`

**Problem:**
```tsx
"use client";
// ...
export default function Home() {
  const { user, loading } = useAuth();  // ← Triggers full auth initialization
  
  if (loading) {
    return <LoadingSpinner />;  // ← Blocks LCP until auth resolves
  }
```

**Impact:**
- LCP is blocked until `useAuth()` resolves (can take 1-5 seconds)
- Even unauthenticated users wait for auth check
- Supabase client initializes, IndexedDB hydrates, etc.

**Solution:**
Make landing page a Server Component that doesn't need auth check. Use middleware for redirect.

---

## Issue #2: Massive Inline CSS in Landing Page

**File:** `components/landing/landing-page.tsx`

**Problem:**
```tsx
<style jsx global>{`
  /* ~600 lines of CSS including animations */
  .hero-chaos { ... }
  .hero-core-ring { ... }
  @keyframes chaos-in { ... }
  // ... hundreds more lines
`}</style>
```

**Impact:**
- All CSS is parsed and applied on every render
- Blocks main thread during style calculation
- Increases TBT significantly
- Not cached between page loads

**Solution:**
Move animations to a separate CSS file or use CSS modules.

---

## Issue #3: Provider Chain Initialization

**File:** `app/layout-client.tsx`

**Problem:**
```tsx
<ThemeProvider>
  <QueryProvider>           // ← Creates QueryClient
    <ResourceHints />
    <AuthProvider>          // ← Initializes Supabase auth listener
      <GuestModeProvider>   // ← Checks localStorage
        <StoreInitializer /> // ← Loads all data from Supabase
        {children}
```

**Impact:**
- 5+ providers initialize sequentially
- Each adds to TBT
- StoreInitializer runs even on landing page (unnecessary)

**Solution:**
- Lazy load providers that aren't needed on landing page
- Move StoreInitializer to only run on `/app` route

---

## Issue #4: StoreInitializer Runs on Every Page

**File:** `components/providers/store-initializer.tsx`

**Problem:**
- Runs on landing page even though no data is needed
- Sets up real-time subscriptions immediately
- Multiple useEffect hooks with complex logic

**Impact:**
- Unnecessary JavaScript execution on landing page
- Adds 100-300ms to TBT

**Solution:**
Only initialize stores when user navigates to `/app`.

---

## Issue #5: Dynamic Import with SSR

**File:** `app/page.tsx`

**Problem:**
```tsx
const LandingPage = dynamic(
  () => import("@/components/landing/landing-page"),
  { ssr: true }  // ← SSR enabled but component is heavy
);
```

**Impact:**
- Server renders the full landing page HTML
- Client then hydrates with all the JavaScript
- Double work = higher TBT

**Solution:**
Either:
1. Make landing page a true Server Component (no client interactivity)
2. Or disable SSR and show skeleton faster

---

## Issue #6: LCP Element Identification

**Current LCP candidates:**
1. Hero typewriter text (`<h1>` with "STORE./SHARE./SYNC.")
2. HeroSVG component (complex SVG with animations)
3. Background grid pattern

**Problem:**
- LCP element varies based on what loads first
- Typewriter effect means text appears character by character
- SVG animations start immediately, competing for main thread

**Solution:**
- Pre-render the first phrase statically
- Defer SVG animations until after LCP

---

## Recommended Fixes (Priority Order)

### Fix 1: Server Component Landing Page (HIGH IMPACT)
Convert landing page to Server Component, move auth redirect to middleware.

```tsx
// app/page.tsx - Server Component
export default function Home() {
  return <LandingPage />;
}

// middleware.ts - Handle auth redirect
if (user && pathname === '/') {
  return NextResponse.redirect('/app');
}
```

### Fix 2: Extract Landing Page CSS (HIGH IMPACT)
Move inline styles to `landing-page.css` or CSS modules.

```tsx
// Before: <style jsx global>{...}</style>
// After: import './landing-page.css';
```

### Fix 3: Defer StoreInitializer (MEDIUM IMPACT)
Only run on authenticated routes.

```tsx
// layout-client.tsx
{pathname.startsWith('/app') && <StoreInitializer />}
```

### Fix 4: Static First Phrase (MEDIUM IMPACT)
Show "STORE." immediately, then start typewriter.

```tsx
const [displayText, setDisplayText] = useState("STORE.");
// Start animation after component mounts
```

### Fix 5: Defer SVG Animations (LOW IMPACT)
Use `requestIdleCallback` or intersection observer.

```tsx
const [animationsEnabled, setAnimationsEnabled] = useState(false);
useEffect(() => {
  requestIdleCallback(() => setAnimationsEnabled(true));
}, []);
```

---

## Implementation Plan

| Fix | Estimated TBT Reduction | Estimated LCP Improvement | Effort |
|-----|------------------------|---------------------------|--------|
| Server Component Landing | -200ms | -1.5s | High |
| Extract CSS | -150ms | -0.5s | Medium |
| Defer StoreInitializer | -100ms | -0.3s | Low |
| Static First Phrase | -50ms | -0.5s | Low |
| Defer SVG Animations | -50ms | -0.2s | Low |

**Total Expected Improvement:**
- TBT: 470ms → ~150ms ✅
- LCP: 2.1s → ~1.5s ✅
- Score: 55-60 → 85-95 ✅

---

## Quick Wins (Can implement now)

1. **Add `loading="eager"` to LCP element** (if it's an image)
2. **Remove unused `isomorphic-dompurify`** from package.json
3. **Preload landing page CSS** if extracted
4. **Add `fetchpriority="high"` to critical resources**

---

## Files to Modify

1. `app/page.tsx` - Convert to Server Component
2. `components/landing/landing-page.tsx` - Extract CSS, defer animations
3. `app/layout-client.tsx` - Conditional StoreInitializer
4. `middleware.ts` - Add auth redirect for landing page
5. `package.json` - Remove unused dependencies
