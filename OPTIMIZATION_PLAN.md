# LinksVault Optimization Plan
## Comprehensive Bug Fixes, Security Patches & Performance Improvements

**Created:** December 26, 2025  
**Total Issues:** 23  
**Estimated Time:** 20-29 hours  
**Priority:** Security → Auth → State → Performance → Quality

---

## EXECUTION PHASES

### Phase 1: Critical Security Fixes (Priority: IMMEDIATE)
**Estimated Time: 4-6 hours**

#### 1.1 Fix SSRF Vulnerability in Metadata Fetching
**File:** `app/api/fetch-metadata/route.ts`
**Lines:** 50-70

**Problem:** SSRF validation only runs in production, DNS rebinding possible.

**Changes Required:**
- Remove `process.env.NODE_ENV === 'production'` check
- Add IPv6 mapped address blocking (`::ffff:`)
- Add `0.0.0.0` blocking
- Add `.localhost` TLD blocking

**Test After:** Try fetching `http://127.0.0.1`, `http://[::1]`, `http://0.0.0.0`

---

#### 1.2 Fix XSS in sanitizeString Function
**File:** `lib/utils/sanitization.ts`
**Lines:** 15-25

**Problem:** HTML entity encoding is broken - `&` doesn't escape anything.

**Changes Required:**
- Fix escape order (& must be first)
- Use proper HTML entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`)
- Remove angle bracket stripping (use encoding instead)

**Test After:** Input `<script>alert('xss')</script>` should output encoded string

---

#### 1.3 Add Rate Limiting to Share API
**File:** `app/api/shares/route.ts`

**Problem:** No rate limiting allows abuse (thousands of share links).

**Changes Required:**
- Import rate limiter from `lib/middleware/rate-limit.ts`
- Add 5 requests/minute limit for POST
- Return 429 with proper headers when exceeded

---

#### 1.4 Remove User ID from Share Response
**File:** `app/api/shares/[shareId]/route.ts`
**Line:** 45

**Problem:** Exposes internal user IDs to public share viewers.

**Changes Required:**
- Remove `userId: share.folders.user_id` from response
- Keep only necessary folder metadata (id, name, color, icon)

---

### Phase 2: Authentication & Session Fixes (Priority: HIGH)
**Estimated Time: 6-8 hours**

#### 2.1 Reset isSessionReady on Sign Out
**File:** `lib/contexts/auth-context.tsx`
**Lines:** 166-185

**Problem:** `isSessionReady` stays `true` after logout, causing race conditions.

**Changes Required:**
```typescript
// In signOut callback:
// 1. Set isSessionReady to false BEFORE clearing user
setIsSessionReady(false);

// 2. After successful signOut:
setUser(null);
setIsSessionReady(true); // Now definitively logged out

// 3. On error, restore:
setIsSessionReady(true);
```

**Dependencies:** None
**Test After:** Sign out → Sign in as different user → Verify data loads correctly

---

#### 2.2 Add IndexedDB Hydration Timeout
**File:** `lib/contexts/auth-context.tsx`
**Lines:** 260-290

**Problem:** No maximum wait time for Chromium IndexedDB hydration.

**Changes Required:**
```typescript
// Add 5-second timeout to verifyAuth function
const MAX_HYDRATION_WAIT = 5000;

const verifyAuth = async () => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Hydration timeout')), MAX_HYDRATION_WAIT)
  );
  
  try {
    const result = await Promise.race([
      authService.getSupabaseClient().auth.getUser(),
      timeoutPromise
    ]);
    // ... handle result
  } catch (e) {
    // Timeout - finalize as unauthenticated
    hasReceivedAuthEvent.current = true;
    setIsSessionReady(true);
  }
};
```

**Test After:** Simulate slow IndexedDB → App should not hang

---

#### 2.3 Remove Duplicate useAuthStore
**File:** `store/useAuthStore.ts`

**Problem:** Two auth systems create confusion about source of truth.

**Changes Required:**
- Search codebase for `useAuthStore` usage
- If unused, delete the file entirely
- If used, migrate to `useAuth()` from context
- Update `store/index.ts` exports

**Test After:** Full app functionality test

---

### Phase 3: State Management Fixes (Priority: HIGH)
**Estimated Time: 4-6 hours**

#### 3.1 Fix addLink Validation Order
**File:** `store/useLinksStore.ts`
**Lines:** 85-95

**Problem:** Optimistic update happens BEFORE userId validation.

**Changes Required:**
```typescript
addLink: async (linkData, userId) => {
  // VALIDATE FIRST - before any state changes
  if (!userId) {
    logger.error('addLink called without userId');
    throw new Error('Not authenticated. Please sign in and try again.');
  }
  
  // Sanitize data
  const sanitizedData = sanitizeLinkData(linkData);
  
  // Guest mode check
  if (isGuestMode()) {
    // ... guest logic
  }
  
  // NOW do optimistic update
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // ...
};
```

**Test After:** Call addLink without userId → Should throw immediately without UI flicker

---

#### 3.2 Fix Stale Closure in Real-time Subscriptions
**File:** `lib/services/supabase-database.service.ts`
**Lines:** 900-920

**Problem:** Subscription callbacks capture stale user ID.

**Changes Required:**
```typescript
const createSubscription = async () => {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) return;
  
  const capturedUserId = user.id; // Capture at creation time
  
  channel.on('postgres_changes', { ... }, async (payload) => {
    // Verify current user still matches
    const { data: { user: currentUser } } = await this.supabase.auth.getUser();
    if (currentUser?.id !== capturedUserId) {
      logger.warn('[Realtime] User changed, ignoring stale event');
      return;
    }
    
    // Proceed with update
    this.invalidateCache(['links', `user:${capturedUserId}`]);
    const links = await this.getLinks();
    callback(links);
  });
};
```

**Test After:** Login as User A → Open new tab → Login as User B → Make change → User A tab should not update

---

#### 3.3 Ensure setIsLoadingData Always Resolves
**File:** `components/providers/store-initializer.tsx`
**Lines:** 180-200

**Problem:** Loading state may never be set to false in edge cases.

**Changes Required:**
- Add finally block to all data loading paths
- Add timeout fallback for loading state
- Log when loading state transitions

```typescript
// Add safety timeout
useEffect(() => {
  const safetyTimeout = setTimeout(() => {
    if (loadingInProgress.current) {
      logger.warn('Loading safety timeout triggered');
      loadingInProgress.current = false;
      setIsLoadingData(false);
    }
  }, 30000); // 30 second safety net
  
  return () => clearTimeout(safetyTimeout);
}, []);
```

---

### Phase 4: Performance Optimizations (Priority: MEDIUM)
**Estimated Time: 4-6 hours**

#### 4.1 Add Content-Type Validation to Metadata Fetch
**File:** `app/api/fetch-metadata/route.ts`
**Lines:** 200+

**Problem:** Accepts any response type, could fetch binary files.

**Changes Required:**
```typescript
// After axios.get response
const contentType = response.headers['content-type'] || '';
if (!contentType.includes('text/html') && 
    !contentType.includes('application/xhtml+xml')) {
  return NextResponse.json({
    error: 'URL does not return HTML content',
    processingTime: Date.now() - startTime,
  }, { status: 400 });
}
```

---

#### 4.2 Optimize Real-time Subscription Updates
**File:** `lib/services/supabase-database.service.ts`

**Problem:** Every change refetches ALL links instead of applying delta.

**Changes Required (Optional - More Complex):**
```typescript
// Instead of refetching all:
async (payload) => {
  if (payload.eventType === 'INSERT') {
    const newLink = this.transformLinkFromDB(payload.new);
    callback(prevLinks => [...prevLinks, newLink]);
  } else if (payload.eventType === 'UPDATE') {
    const updatedLink = this.transformLinkFromDB(payload.new);
    callback(prevLinks => prevLinks.map(l => 
      l.id === updatedLink.id ? updatedLink : l
    ));
  } else if (payload.eventType === 'DELETE') {
    callback(prevLinks => prevLinks.filter(l => l.id !== payload.old.id));
  }
}
```

**Note:** This requires changing callback signature. May defer to future optimization.

---

#### 4.3 Add Pagination Support for Links
**File:** `lib/services/links-database.service.ts`

**Problem:** Default limit of 1000 links, no UI pagination.

**Changes Required:**
- This is a larger feature change
- For now, increase limit to 5000 as safety measure
- Add TODO for proper pagination implementation

---

### Phase 5: Logging & Error Handling (Priority: MEDIUM)
**Estimated Time: 2-3 hours**

#### 5.1 Fix Production Warning Logging
**File:** `lib/utils/logger.ts`
**Lines:** 25-30

**Problem:** Warnings silently dropped in production.

**Changes Required:**
```typescript
warn: (...args: unknown[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  } else {
    // In production, still log warnings but could also send to service
    console.warn('[WARN]', new Date().toISOString(), ...args);
    // TODO: Send to error tracking service
    // errorTrackingService.captureMessage(args[0]?.toString(), 'warning');
  }
},
```

---

#### 5.2 Add Consistent Error Context
**Files:** Multiple store files

**Problem:** Some error handlers lack context (userId, operation, timestamp).

**Changes Required:**
Create a helper function:
```typescript
// lib/utils/error-context.ts
export function createErrorContext(operation: string, details: Record<string, unknown>) {
  return {
    operation,
    ...details,
    timestamp: new Date().toISOString(),
  };
}
```

Update error handlers to use consistent format.

---

### Phase 6: Type Safety Improvements (Priority: LOW)
**Estimated Time: 2-3 hours**

#### 6.1 Fix `any` Types in Sanitization
**File:** `lib/utils/sanitization.ts`

**Problem:** Functions use `any` types extensively.

**Changes Required:**
```typescript
import { Link, Folder, AppSettings } from '@/types';

type LinkInput = Partial<Omit<Link, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>;
type FolderInput = Partial<Omit<Folder, 'id' | 'createdAt' | 'updatedAt'>>;

export function sanitizeLinkData(data: LinkInput): LinkInput {
  // ... implementation
}

export function sanitizeFolderData(data: FolderInput): FolderInput {
  // ... implementation
}
```

---

### Phase 7: Testing Infrastructure (Priority: IMPORTANT but DEFERRED)
**Estimated Time: 8-12 hours (separate sprint)**

#### 7.1 Set Up Testing Framework
- Install Vitest for unit tests
- Install Playwright for E2E tests
- Configure test environment

#### 7.2 Priority Test Cases
1. Auth context state machine tests
2. Sanitization function tests
3. Store operation tests (addLink, bulkUpdate)
4. API route validation tests

**Note:** This is a larger initiative. Create separate ticket/sprint.

---

## IMPLEMENTATION ORDER

Execute in this exact order to minimize risk:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Security (Do First - Highest Risk)                │
├─────────────────────────────────────────────────────────────┤
│ 1.1 SSRF Fix                    → 1.2 XSS Fix              │
│ 1.3 Rate Limit Shares           → 1.4 Remove User ID       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Auth (Do Second - Core Functionality)             │
├─────────────────────────────────────────────────────────────┤
│ 2.1 isSessionReady Reset        → 2.2 Hydration Timeout    │
│ 2.3 Remove Duplicate Store                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: State (Do Third - Depends on Auth)                │
├─────────────────────────────────────────────────────────────┤
│ 3.1 addLink Validation          → 3.2 Stale Closure Fix    │
│ 3.3 Loading State Safety                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4-6: Performance, Logging, Types (Parallel OK)       │
├─────────────────────────────────────────────────────────────┤
│ 4.1 Content-Type    5.1 Logging    6.1 Type Safety         │
│ 4.2 RT Optimization 5.2 Error Ctx                          │
└─────────────────────────────────────────────────────────────┘
```

---

## FILE CHANGE SUMMARY

| File | Changes | Phase |
|------|---------|-------|
| `app/api/fetch-metadata/route.ts` | SSRF fix, Content-Type validation | 1.1, 4.1 |
| `lib/utils/sanitization.ts` | XSS fix, Type safety | 1.2, 6.1 |
| `app/api/shares/route.ts` | Rate limiting | 1.3 |
| `app/api/shares/[shareId]/route.ts` | Remove userId exposure | 1.4 |
| `lib/contexts/auth-context.tsx` | isSessionReady reset, Hydration timeout | 2.1, 2.2 |
| `store/useAuthStore.ts` | DELETE or deprecate | 2.3 |
| `store/index.ts` | Remove useAuthStore export | 2.3 |
| `store/useLinksStore.ts` | Validation order fix | 3.1 |
| `lib/services/supabase-database.service.ts` | Stale closure fix | 3.2 |
| `components/providers/store-initializer.tsx` | Loading state safety | 3.3 |
| `lib/utils/logger.ts` | Production warning logging | 5.1 |

---

## VERIFICATION CHECKLIST

After each phase, verify:

### Phase 1 Verification
- [ ] `curl -X POST /api/fetch-metadata -d '{"url":"http://127.0.0.1"}' ` returns error
- [ ] `curl -X POST /api/fetch-metadata -d '{"url":"http://[::1]"}' ` returns error
- [ ] Input `<script>` in link title → Check it's properly encoded in DB
- [ ] Create 6 shares in 1 minute → 6th should return 429
- [ ] GET `/api/shares/[id]` response does NOT contain userId

### Phase 2 Verification
- [ ] Sign out → `isSessionReady` becomes false then true
- [ ] Sign out → Sign in as different user → Correct data loads
- [ ] Simulate slow IndexedDB → App shows login after 5s timeout
- [ ] Search codebase for `useAuthStore` → No usage found

### Phase 3 Verification
- [ ] Call addLink without userId → Immediate error, no UI flicker
- [ ] Login as User A → New tab login as User B → Changes don't cross-pollinate
- [ ] Simulate network timeout during load → Loading spinner eventually stops

### Phase 4-6 Verification
- [ ] Fetch metadata for PDF URL → Returns error about non-HTML
- [ ] Check production logs → Warnings are visible
- [ ] TypeScript compilation → No `any` type errors in sanitization

---

## ROLLBACK PLAN

If issues arise after deployment:

1. **Git Tags:** Create tag before each phase
   ```bash
   git tag -a pre-phase-1 -m "Before security fixes"
   git tag -a pre-phase-2 -m "Before auth fixes"
   ```

2. **Feature Flags (Optional):**
   ```typescript
   // For risky changes, wrap in feature flag
   if (process.env.NEXT_PUBLIC_NEW_AUTH_FLOW === 'true') {
     // New code
   } else {
     // Old code
   }
   ```

3. **Revert Commands:**
   ```bash
   git revert HEAD~N  # Revert last N commits
   # OR
   git checkout pre-phase-X -- path/to/file  # Revert specific file
   ```

---

## NOTES FOR IMPLEMENTATION

1. **Make atomic commits** - One fix per commit for easy rollback
2. **Test locally** before each commit
3. **Deploy after Phase 1** - Security fixes are urgent
4. **Monitor error logs** after each deployment
5. **Keep this document updated** with completion status

---

## COMPLETION TRACKING

| Phase | Status | Completed Date | Notes |
|-------|--------|----------------|-------|
| 1.1 SSRF Fix | ✅ Complete | 2025-12-26 | Removed NODE_ENV check, added IPv6 mapped, 0.0.0.0, .localhost blocking |
| 1.2 XSS Fix | ✅ Complete | 2025-12-26 | Fixed escape order (& first), proper HTML entities |
| 1.3 Rate Limit | ✅ Complete | 2025-12-26 | Added 5 req/min rate limiter to shares POST |
| 1.4 User ID | ✅ Complete | 2025-12-26 | Removed userId from public share response |
| 2.1 Session Ready | ✅ Complete | 2025-12-26 | Reset isSessionReady on signOut, restore on error |
| 2.2 Hydration Timeout | ✅ Complete | 2025-12-26 | Added 5s timeout with Promise.race |
| 2.3 Remove Store | ✅ Complete | 2025-12-26 | Deprecated with warning (kept for compatibility-bridge) |
| 3.1 Validation Order | ✅ Already Fixed | 2025-12-26 | Code already validates userId before optimistic update |
| 3.2 Stale Closure | ✅ Complete | 2025-12-26 | Capture userId, verify current user in callbacks |
| 3.3 Loading Safety | ✅ Complete | 2025-12-26 | Added 30s safety timeout for loading state |
| 4.1 Content-Type | ✅ Complete | 2025-12-26 | Validate HTML content-type before parsing |
| 5.1 Logging | ✅ Complete | 2025-12-26 | Warnings now logged in production with timestamp |
| 6.1 Type Safety | ✅ Complete | 2025-12-26 | Replaced `any` with proper Link/Folder types |

---

**Ready to proceed with Phase 1?**
