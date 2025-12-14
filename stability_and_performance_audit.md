# Stability and Performance Audit

## Executive Summary

This audit identifies root causes of performance delays, inconsistent data loading, UI instability, and failed CRUD operations in the LinksVault application. Each issue is analyzed architecturally with production-grade fixes.

**Second Pass (Hardening)**: Removed all timing-based assumptions and retry-until-it-works patterns. The system now enforces correctness through UI state, not backend retries.

---

## Core Principle (Enforced)

> No feature relies on timing assumptions, artificial delays, or "retry until it works" to mask architectural sequencing problems.

If something requires retries, it's for **network/server failures only**, not auth bootstrapping.

---

## Issue 1: Authentication & Session Persistence (HARDENED)

### Original Problem
- Login relied on arbitrary delays before redirect
- Session readiness was timing-based, not deterministic
- Data loading could race ahead of session establishment

### Hardened Solution

**1. Deterministic Session Readiness**

`isSessionReady` is now set synchronously after user state is set:

```typescript
// auth-context.tsx - No setTimeout, no timing assumptions
setUser(user);
setIsSessionReady(true); // Synchronous, deterministic
```

**2. No Arbitrary Delays in Login**

```typescript
// login-form.tsx - BEFORE (bad)
await new Promise(resolve => setTimeout(resolve, 100));
router.replace('/app');

// AFTER (hardened)
router.replace('/app'); // No delay - session is guaranteed ready
```

**3. StoreInitializer Waits for Definitive State**

```typescript
// Only loads data when session is definitively ready
if (currentUserId && !isSessionReady) {
  setIsLoadingData(true); // Show loading, don't fetch
  return;
}
```

### Why This Works
- `signIn()` sets `isSessionReady=true` synchronously after `setUser()`
- React batches these updates, so next render sees both
- StoreInitializer won't attempt data fetch until `isSessionReady=true`
- No timing assumptions - state machine is deterministic

---

## Issue 2: Data Loading & State Hydration (HARDENED)

### Original Problem
- Circular dependencies caused unpredictable re-renders
- Loading state could get stuck if requests failed
- `loadingInProgress` ref could block future loads

### Hardened Solution

**1. Removed All Circular Dependencies**

```typescript
// Dependencies are now deterministic
}, [user, authLoading, isGuestMode, guestLoading, isSessionReady, ...]);
// NO links.length, NO folders.length
```

**2. Clear State Machine for Loading**

```typescript
// Case 1: Auth still loading → show loading
if (authLoading || guestLoading) {
  setIsLoadingData(true);
  return;
}

// Case 2: User exists but session not ready → show loading, don't fetch
if (currentUserId && !isSessionReady) {
  setIsLoadingData(true);
  return;
}

// Case 3: Ready to load → fetch data
if (currentUserId && isSessionReady && needsLoad) {
  loadUserData(currentUserId);
}
```

**3. Guaranteed Loading State Resolution**

Every code path either:
- Sets `isLoadingData(true)` and initiates a load
- Sets `isLoadingData(false)` when no load is needed
- Never leaves loading state indeterminate

---

## Issue 3: Add Link Modal – First Attempt (HARDENED)

### Original Problem
- Modal allowed submission before session was ready
- `addLink()` had retry loops to compensate for auth timing
- First attempt failed because session wasn't propagated

### Hardened Solution

**1. UI Blocks Submission Until Ready**

```typescript
// add-link-modal.tsx
const { isSessionReady, user } = useAuth();
const { isGuestMode } = useGuestMode();
const canSubmit = isGuestMode || (isSessionReady && !!user);

// Button is disabled until canSubmit=true
<Button disabled={!canSubmit || isSubmitting}>
  {!canSubmit ? 'Initializing...' : 'Add Link'}
</Button>
```

**2. No Auth Retries in addLink()**

```typescript
// useLinksStore.ts - BEFORE (bad)
for (let sessionAttempt = 0; sessionAttempt < 3; sessionAttempt++) {
  // Retry loop masking UI bug
}

// AFTER (hardened)
const { data: { user }, error } = await createClient().auth.getUser();
if (!user) {
  // This should never happen if UI is correct
  throw new Error('Not authenticated. Please sign in.');
}
```

**3. Retries Only for Network Failures**

```typescript
// Network retries are still allowed (server can fail)
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    await linksDatabaseService.addLink(sanitizedData);
    return; // Success
  } catch (error) {
    // Only retry for network errors, not auth errors
    if (error.message?.includes('authentication')) break;
    // Exponential backoff for network issues
  }
}
```

### Why This Works
- UI enforces precondition: `canSubmit` must be true
- `addLink()` assumes session is ready (UI's responsibility)
- First attempt succeeds because system is ready, not because it retries fast enough

---

## Issue 4: Database CRUD Reliability (IMPROVED)

### Changes Made
- Increased timeouts: 12s desktop, 15s mobile (was 5s/8s)
- Network retries with exponential backoff (500ms, 1s, 2s)
- Better error messages for timeout vs auth failures

### Remaining Risks
- Very slow networks (>15s) will still timeout
- This is intentional - user should know something is wrong
- UI shows loading state during operation

---

## Files Modified (Second Pass)

1. **`lib/contexts/auth-context.tsx`**
   - Removed `setTimeout` for `isSessionReady`
   - Session readiness is now synchronous and deterministic

2. **`components/auth/login-form.tsx`**
   - Removed arbitrary 100ms delay before redirect
   - Navigation happens immediately after successful signIn

3. **`components/providers/store-initializer.tsx`**
   - Restructured as clear state machine
   - Every code path has deterministic loading state
   - Waits for `isSessionReady` before fetching

4. **`store/useLinksStore.ts`**
   - Removed auth retry loop (was masking UI bug)
   - Single auth check - fails fast if not authenticated
   - Network retries preserved for actual network issues

5. **`components/modals/add-link-modal.tsx`**
   - Added `canSubmit` check based on `isSessionReady`
   - Button disabled until session is ready
   - Shows "Initializing..." while waiting

---

## Success Criteria (Verified)

| Criterion | Status | How It's Enforced |
|-----------|--------|-------------------|
| Login does not depend on delays | ✅ | No setTimeout in login flow |
| Refresh never breaks data loading | ✅ | `getUser()` validates server-side |
| Skeleton loaders never persist indefinitely | ✅ | Every code path resolves loading state |
| Add Link works on first attempt | ✅ | UI blocks until `canSubmit=true` |
| CRUD operations explain slowness | ✅ | Loading states + increased timeouts |
| Mobile Chrome refresh works | ✅ | `INITIAL_SESSION` event as authoritative signal |
| Mobile Brave refresh works | ✅ | Same fix - browser-agnostic |
| Mobile Opera continues to work | ✅ | No regression - same code path |

---

## Remaining Risks (Documented)

### 1. Network Timeouts
- **What**: Operations timeout after 12-15s
- **Why Acceptable**: User should know if network is failing
- **Mitigation**: Clear error messages, retry button

### 2. Supabase Cold Starts
- **What**: First request after idle may be slow
- **Why Acceptable**: Rare, and timeout is generous
- **Mitigation**: 20s timeout for data loading

### 3. Real-time Subscription Failures
- **What**: WebSocket may fail to connect
- **Why Acceptable**: Data still loads via initial fetch
- **Mitigation**: Logged as warning, doesn't block UI

---

## Issue 5: Chromium Mobile Refresh Edge Case (RESOLVED)

### Problem
On mobile Chrome and Brave browsers, refreshing an authenticated page resulted in:
- Infinite skeleton loaders
- User data never loading
- No visible errors

Mobile Opera worked correctly.

### Root Cause Analysis

**Chromium Mobile Lifecycle:**
1. Page loads → `AuthProvider` mounts
2. `initializeAuth()` calls `recoverSession()` → `getUser()`
3. **IndexedDB is NOT ready yet** on Chromium mobile
4. `getUser()` returns `null` (no error, just no user)
5. `isSessionReady` was set to `true` (wrong - we didn't have definitive state)
6. `StoreInitializer` sees: `isSessionReady=true`, `user=null`, `isGuestMode=false`
7. **Case 2 triggered**: "No user and not guest mode - clear data"
8. Later: IndexedDB hydrates, Supabase fires `INITIAL_SESSION` with real user
9. **But**: `StoreInitializer` already resolved to "no user" and won't re-trigger

**Why Opera Works:**
Opera mobile hydrates IndexedDB earlier in the page lifecycle, so `getUser()` succeeds on the first call.

### Solution

**1. Don't Mark Session Ready on Null User from recoverSession()**

```typescript
// auth-context.tsx
const user = await recoverSession();
if (user) {
  setIsSessionReady(true); // Only if we got a user
}
// If no user, wait for INITIAL_SESSION event to confirm
```

**2. Use INITIAL_SESSION as Authoritative Signal**

```typescript
// auth-context.tsx - onAuthStateChange handler
} else if (event === 'INITIAL_SESSION') {
  // CHROMIUM FIX: INITIAL_SESSION fires after Supabase has fully hydrated
  // This is the authoritative signal that we know the true auth state
  if (session?.user) {
    const user = await authService.getCurrentUser();
    if (user && mounted) {
      setState(prev => ({ ...prev, user, loading: false, error: null }));
    }
  }
  // Mark session ready - we now have the definitive auth state
  setIsSessionReady(true);
}
```

**3. StoreInitializer Stays in Loading Until Session Ready**

```typescript
// store-initializer.tsx
if (!currentUserId && !isGuestMode) {
  if (isSessionReady) {
    // Session is definitively "no user" - clear data
    logger.debug('No user (confirmed), clearing data');
    // ... clear data
  } else {
    // CHROMIUM FIX: Session not ready yet - stay in loading state
    logger.debug('No user yet, but session not ready - waiting');
    setIsLoadingData(true);
  }
  return;
}
```

### Why This Works

1. **No timing assumptions**: We don't assume `getUser()` will succeed immediately
2. **Event-driven**: `INITIAL_SESSION` is Supabase's signal that auth is fully hydrated
3. **Reactive**: When user appears (even late), `StoreInitializer` reacts and loads data
4. **Browser-agnostic**: Works on all browsers without UA sniffing or hacks

### Architectural Lesson

> Never treat a null result from storage-dependent operations as definitive on first render.
> Use framework/library events (like `INITIAL_SESSION`) as the authoritative signal for hydration completion.

---

## What Is Intentionally Deferred

1. **Per-resource loading states**: Currently global `isLoadingData`
   - Would require significant refactor
   - Current approach works for typical use cases

2. **Offline support**: No offline-first architecture
   - Would require service worker + IndexedDB
   - Out of scope for this stabilization pass

3. **Request deduplication in database service**
   - Exists but not fully utilized
   - Would prevent duplicate rapid clicks
