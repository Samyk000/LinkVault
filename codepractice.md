## **CODE QUALITY & ARCHITECTURE STANDARDS**

Write code as if you're a **Senior Developer with 20+ years of experience**. Follow these non-negotiable standards:

### **Architecture & Design Patterns**

**Modular Architecture:**
- Break code into small, single-responsibility modules (max 200-300 lines per file)
- Each function should do ONE thing and do it well (max 50 lines per function)
- Use established design patterns: MVC, Repository Pattern, Factory Pattern, Observer Pattern where appropriate
- Implement proper separation of concerns: Components, Services, Utils, Constants, Types/Interfaces in separate folders

**Project Structure:**
```
src/
├── components/       # Reusable UI components
│   ├── common/      # Shared components (Button, Input, Card)
│   └── features/    # Feature-specific components
├── services/        # API calls, business logic
├── utils/           # Helper functions, formatters
├── hooks/           # Custom React hooks (if applicable)
├── constants/       # Configuration, constants
├── types/           # TypeScript interfaces/types
├── styles/          # Global styles, themes
└── assets/          # Images, fonts, static files
```

### **Naming Conventions (Strict)**

**Variables & Functions:**
- Use descriptive, meaningful names (avoid `data`, `temp`, `x`, `fn`)
- **Good:** `fetchUserProfile()`, `isAuthenticated`, `MAX_RETRY_ATTEMPTS`
- **Bad:** `getData()`, `flag`, `temp`, `x1`
- Boolean variables: prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasAccess`)
- Functions: Use verbs (`fetch`, `create`, `update`, `delete`, `validate`, `transform`)
- Constants: UPPERCASE_WITH_UNDERSCORES
- Classes/Components: PascalCase
- Files: kebab-case for CSS/utilities, PascalCase for components

**Avoid:**
- Single letter variables except in loops (`i`, `j`, `k` acceptable for indices only)
- Abbreviations unless universally understood (URL, API, HTTP are OK; usr, calc are NOT)
- Using same identifier for multiple purposes

### **Code Documentation**

**File Headers (Every file must have):**
```javascript
/**
 * @file UserProfileService.js
 * @description Handles all user profile related API operations
 * @author [Your Name]
 * @created 2025-10-16
 * @modified 2025-10-16
 */
```

**Function Documentation:**
```javascript
/**
 * Fetches user profile data from API
 * @param {string} userId - Unique user identifier
 * @param {Object} options - Optional configuration
 * @param {boolean} options.includePrivate - Include private data
 * @returns {Promise<UserProfile>} User profile object
 * @throws {APIError} When API request fails
 */
async function fetchUserProfile(userId, options = {}) {
  // Implementation
}
```

**Inline Comments:**
- Explain WHY, not WHAT (code should be self-explanatory)
- Complex logic: Add comments explaining the approach
- Algorithms: Cite sources or explain time/space complexity
- TODOs: Use `// TODO: Description (Date)` format
- **Avoid over-commenting** - if code needs too many comments, refactor it

### **Error Handling (Professional Grade)**

**Never use bare try-catch:**
```javascript
// BAD - Swallowing errors
try {
  await fetchData();
} catch(e) { 
  console.log(e); 
}

// GOOD - Proper error handling
try {
  const data = await fetchData();
  return { success: true, data };
} catch (error) {
  logger.error('Failed to fetch data:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Show user-friendly message
  showErrorToast('Unable to load data. Please try again.');
  
  // Return or throw based on context
  return { success: false, error: error.message };
}
```

**Always:**
- Log errors with context (what operation failed, when, why)
- Display user-friendly error messages (never expose stack traces to users)
- Handle edge cases (null, undefined, empty arrays, network failures)
- Validate inputs at boundaries (API endpoints, form submissions)
- Use custom error classes for different error types

### **Performance & Optimization**

**Must implement:**
- Debounce search inputs and rapid API calls (300ms delay)
- Throttle scroll/resize event handlers
- Lazy load components and images below the fold
- Memoize expensive calculations (`useMemo`, `useCallback` in React)
- Implement virtual scrolling for large lists (1000+ items)
- Use pagination or infinite scroll, never load everything at once
- Optimize images: WebP format, responsive sizes, compression
- Code splitting: Load only what's needed for current route

**Avoid:**
- Nested loops with high complexity (O(n²) or worse)
- Synchronous operations that block UI
- Memory leaks (clean up event listeners, timers, subscriptions)
- Unnecessary re-renders (React: proper dependency arrays, memo)

### **Security Best Practices**

**Always implement:**
- Input validation and sanitization (never trust user input)
- XSS prevention: Escape user-generated content
- CSRF protection for forms
- Authentication token management (secure storage, refresh logic)
- HTTPS only, no hardcoded secrets/API keys
- Environment variables for sensitive config
- Rate limiting on API endpoints
- SQL injection prevention: Use parameterized queries/ORMs

**Never:**
- Store passwords in plain text
- Expose API keys in client-side code
- Trust client-side validation alone
- Use `eval()` or `dangerouslySetInnerHTML` without sanitization

### **Code Cleanliness (DRY, SOLID, KISS)**

**DRY (Don't Repeat Yourself):**
- Extract repeated logic into reusable functions/components
- Create utility functions for common operations
- Use configuration objects instead of duplicating code

**SOLID Principles:**
- Single Responsibility: Each class/function does one thing
- Open/Closed: Open for extension, closed for modification
- Dependency Injection: Pass dependencies, don't hardcode them

**KISS (Keep It Simple):**
- Avoid premature optimization
- Choose simple solutions over clever ones
- If you can't explain it simply, refactor it

### **TypeScript/Type Safety (if applicable)**

```typescript
// Define proper interfaces
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;  // Optional
  createdAt: Date;
}

// Use proper types, avoid 'any'
function processUser(user: UserProfile): string {
  return `${user.name} (${user.email})`;
}

// Use enums for fixed sets of values
enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}
```

### **Testing & Validation**

**Must include:**
- Input validation with clear error messages
- Null/undefined checks before accessing properties
- Edge case handling (empty arrays, zero values, special characters)
- Loading states for async operations
- Success/error feedback for user actions

**Code should be testable:**
- Pure functions where possible (same input = same output)
- Separate business logic from UI components
- Avoid tight coupling
- Mock-friendly architecture (dependency injection)

### **Git & Version Control**

**Commit Messages (follow conventional commits):**
```
feat: Add user profile editing functionality
fix: Resolve infinite loop in data fetching
refactor: Extract validation logic to separate utility
docs: Update API documentation
style: Format code with Prettier
test: Add unit tests for authentication flow
```

**Code Review Ready:**
- No commented-out code (delete it, git history preserves it)
- No console.logs in production code
- No debugging statements
- All TODOs tracked or resolved
- No merge conflicts
- Passes all linters and formatters

### **Consistency & Standards**

**Formatting (Use automated tools):**
- Prettier for code formatting
- ESLint for code quality rules
- Configure and commit `.prettierrc` and `.eslintrc`
- 2-space or 4-space indentation (consistent throughout)
- Max line length: 80-100 characters
- Semicolons: Use or don't use, but be consistent

**Code Style:**
- Use modern ES6+ syntax (const/let, arrow functions, destructuring, spread operator)
- Avoid var, use const by default, let only when reassignment needed
- Async/await over callbacks/promise chains
- Template literals over string concatenation
- Optional chaining (`?.`) and nullish coalescing (`??`)

***


When I request a codebase review, you must identify all errors—small or large—and any potential edge cases.

Steps to follow for any bug fix request:
1. Review the codebase thoroughly.
2. Identify all issues present.
3. Understand the root cause of each issue.
4. Analyze what is causing the problem.
5. Determine and implement the best possible solution.

Please adhere to this method for every bug fix I request.

## **FINAL CODE QUALITY CHECKLIST**

Before delivering code, ensure:

✅ **No errors or warnings** in console
✅ **All functions documented** with JSDoc comments
✅ **Proper error handling** everywhere (try-catch, fallbacks)
✅ **Loading and error states** for all async operations
✅ **Input validation** on all user inputs
✅ **Responsive** on all screen sizes
✅ **Accessible** (keyboard navigation, ARIA labels, semantic HTML)
✅ **Optimized** (lazy loading, code splitting, memoization)
✅ **Secure** (no exposed secrets, input sanitization)
✅ **Tested manually** on multiple browsers
✅ **Clean Git history** with meaningful commits
✅ **No hardcoded values** (use constants/config files)
✅ **DRY principle** followed (no code duplication)
✅ **Readable** (a junior developer can understand it)
✅ **Production-ready** (can deploy with confidence)

---

## **ANTIPATTERNS TO AVOID**

### **React/TypeScript Antipatterns**

**1. Missing React Imports**
```tsx
// ❌ BAD - Will cause "React is not defined" error
import { useState } from "react";

export function MyComponent() {
  const handleClick = (e: React.MouseEvent) => {}; // Error!
}

// ✅ GOOD - Always import React when using React types
import React, { useState } from "react";

export function MyComponent() {
  const handleClick = (e: React.MouseEvent) => {}; // Works!
}
```

**2. Tailwind CSS Verbose Classes**
```tsx
// ❌ BAD - Verbose, not using shorthand
<Icon className="h-5 w-5" />
<Button className="h-4 w-4" />

// ✅ GOOD - Use size-* shorthand (Tailwind v3.3+)
<Icon className="size-5" />
<Button className="size-4" />
```

**3. Duplicate Code Blocks**
```tsx
// ❌ BAD - Duplicating logic across components
// sidebar.tsx
const allLinksCount = links.filter(link => link.deletedAt === null).length;
const favoritesCount = links.filter(link => link.isFavorite).length;

// mobile-sidebar.tsx
const allLinksCount = links.filter(link => link.deletedAt === null).length;
const favoritesCount = links.filter(link => link.isFavorite).length;

// ✅ GOOD - Extract to shared hook
// hooks/use-link-counts.ts
export function useLinkCounts() {
  const links = useStore(state => state.links);
  return {
    allLinksCount: links.filter(link => link.deletedAt === null).length,
    favoritesCount: links.filter(link => link.isFavorite).length
  };
}
```

**4. State Management Issues**
```tsx
// ❌ BAD - Using local state for global modals
function MyComponent() {
  const [modalOpen, setModalOpen] = useState(false);
  // Problem: Each component has separate state!
}

// ✅ GOOD - Use global store for shared state
// store/useStore.ts
interface AppState {
  modalOpen: boolean;
  setModalOpen: (isOpen: boolean) => void;
}

// Now all components share the same modal state
```

---

## **EDGE CASES TO ALWAYS CONSIDER**

### **Theme Support (Light/Dark Mode)**
```tsx
// ❌ BAD - Single color, doesn't adapt to theme
<div className="bg-white text-foreground" />
// Problem: In dark mode, might be white text on white background!

// ✅ GOOD - Explicit colors for both themes
<div className="bg-white text-gray-900 dark:bg-zinc-900 dark:text-gray-100" />
```

**Always test:**
- ✅ Both light and dark themes
- ✅ Text visibility on backgrounds
- ✅ Border visibility (use border-2 for better visibility)
- ✅ Icon colors adapt to theme

### **Responsive Design (All Screen Sizes)**
```tsx
// ❌ BAD - Desktop-only hover states
<Button className="opacity-0 group-hover:opacity-100" />
// Problem: Never visible on mobile (no hover)!

// ✅ GOOD - Visible on mobile, hover on desktop
<Button className="opacity-100 md:opacity-0 md:group-hover:opacity-100" />
```

**Always test:**
- ✅ Mobile (<640px)
- ✅ Tablet (768px)
- ✅ Desktop (>1024px)
- ✅ Touch vs hover interactions

### **Dropdown/Popover Positioning**
```tsx
// ❌ BAD - Always opens downward
<DropdownMenuContent align="end">
// Problem: Goes off-screen if near bottom!

// ✅ GOOD - Opens upward, auto-flips if needed
<DropdownMenuContent align="end" side="top" sideOffset={5}>
// Radix UI automatically flips to bottom if no space above
```

**Always consider:**
- ✅ Collision detection (auto-flip)
- ✅ Screen edges
- ✅ Scrollable containers
- ✅ Mobile vs desktop positioning

### **Unnecessary API Calls**
```tsx
// ❌ BAD - Fetch triggers on every URL change
useEffect(() => {
  if (urlValue) {
    fetchMetadata(urlValue); // Called even when editing!
  }
}, [urlValue]);

// ✅ GOOD - Prevent fetch when setting URL programmatically
const [shouldFetch, setShouldFetch] = useState(true);

useEffect(() => {
  if (!shouldFetch) return; // Guard clause
  if (isEditMode) return; // Don't fetch in edit mode
  if (urlValue) {
    fetchMetadata(urlValue);
  }
}, [urlValue, shouldFetch, isEditMode]);
```

**Always prevent:**
- ✅ Fetching on modal open (only on user input)
- ✅ Multiple simultaneous requests (debounce)
- ✅ Fetching when data already exists

### **Empty States & Loading States**
```tsx
// ❌ BAD - No feedback during loading
{items.map(item => <Item key={item.id} />)}

// ✅ GOOD - Handle all states
{isLoading ? (
  <LoadingSpinner />
) : items.length === 0 ? (
  <EmptyState message="No items found" />
) : (
  items.map(item => <Item key={item.id} />)
)}
```

### **Border/Visual Clarity Issues**
```tsx
// ❌ BAD - Border might be invisible
<div className="border border-gray-300" />
// Problem: border-gray-300 is very light in dark mode!

// ✅ GOOD - Explicit colors for visibility
<div className="border-2 border-black dark:border-white" />
// border-2 (2px) is more visible than border (1px)
```

---

## **COMPONENT PATTERNS TO FOLLOW**

### **Shared Components for Duplicate Code**
When you find duplicate JSX/logic across files:

1. **Extract to Shared Component**
   ```tsx
   // Before: Duplicated in sidebar.tsx and mobile-sidebar.tsx
   <Button onClick={() => setView('all')}>
     <Folder className="size-4" />
     All Links
   </Button>
   
   // After: Extracted to QuickAccessSection.tsx
   export function QuickAccessSection({ onViewClick }) {
     return (
       <Button onClick={() => onViewClick('all')}>
         <Folder className="size-4" />
         All Links
       </Button>
     );
   }
   ```

2. **Extract to Custom Hook**
   ```tsx
   // Before: Duplicated calculations
   const count = links.filter(link => link.deletedAt === null).length;
   
   // After: Extracted to hook
   export function useLinkCounts() {
     const links = useStore(state => state.links);
     return useMemo(() => ({
       allLinks: links.filter(link => link.deletedAt === null).length,
       favorites: links.filter(link => link.isFavorite).length
     }), [links]);
   }
   ```

### **Modal State Management**
```tsx
// ✅ GOOD - Centralized in store
interface AppState {
  // Modal state
  isAddLinkModalOpen: boolean;
  folderDeleteModalOpen: boolean;
  folderToDelete: { id: string; name: string } | null;
  
  // Actions
  setAddLinkModalOpen: (isOpen: boolean) => void;
  setFolderDeleteModalOpen: (isOpen: boolean) => void;
  setFolderToDelete: (folder: {...} | null) => void;
}

// All components share the same modal state
// No synchronization issues!
```

---

## **DOCUMENTATION REQUIREMENTS**

### **Every Function Must Have JSDoc**
```tsx
/**
 * Fetches link metadata from a URL and populates form fields.
 * Implements debouncing to avoid excessive API calls.
 * 
 * @example
 * fetchLinkMetadata('https://example.com')
 * // Returns: { title: 'Example', description: '...', thumbnail: '...' }
 * 
 * @param {string} url - The URL to fetch metadata from
 * @returns {Promise<LinkMetadata>} Object containing title, description, thumbnail
 * @throws {APIError} When the API request fails or URL is invalid
 */
async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  // Implementation
}
```

### **File Headers**
```tsx
/**
 * @file components/modals/add-link-modal.tsx
 * @description Modal for adding/editing links with automatic metadata fetching
 * @created 2025-10-28
 * @modified 2025-10-28
 */
```

---

## **TESTING CHECKLIST**

### **Before Marking Complete**
✅ Test in **both light and dark themes**
✅ Test on **mobile, tablet, and desktop**
✅ Test **all user interactions** (click, hover, focus)
✅ Test **edge cases** (empty data, long text, special characters)
✅ Test **error states** (API failures, network issues)
✅ Test **loading states** (ensure spinners show)
✅ Verify **no console errors or warnings**
✅ Run **linter** (`npm run lint`)
✅ Run **build** (`npm run build`)
✅ Test in **multiple browsers** (Chrome, Firefox, Safari)

### **UI/UX Testing**
- ✅ Toast notifications visible and readable
- ✅ Dropdowns don't go off-screen
- ✅ Borders visible in all themes
- ✅ Hover states work on desktop
- ✅ Touch targets large enough on mobile (min 44px)
- ✅ Keyboard navigation works
- ✅ Focus states visible
- ✅ Screen reader friendly (ARIA labels)

---

## **COMMON MISTAKES TO AVOID**

1. **Not testing in dark mode** - Always check both themes
2. **Assuming hover works on mobile** - Use conditional classes
3. **Hardcoding modal state in components** - Use global store
4. **Not preventing unnecessary fetches** - Add guard clauses
5. **Using thin borders** - Use `border-2` for visibility
6. **Forgetting collision detection** - Let dropdowns auto-flip
7. **Not handling loading states** - Always show feedback
8. **Leaving duplicate code** - Extract to shared components/hooks
9. **Using verbose Tailwind classes** - Use shorthands (size-*)
10. **Missing React imports** - Import React when using React types

---

## **QUICK REFERENCE: FIX PATTERNS**

| Issue | Bad Pattern | Good Pattern |
|-------|-------------|--------------|
| React Types | `import { useState }` | `import React, { useState }` |
| Icon Size | `h-5 w-5` | `size-5` |
| Theme Text | `text-foreground` | `text-gray-900 dark:text-gray-100` |
| Border | `border` | `border-2 border-black dark:border-white` |
| Dropdown | `<DropdownMenuContent>` | `<DropdownMenuContent side="top">` |
| Duplicate Code | Copy-paste logic | Extract to hook/component |
| Modal State | `useState` in component | Global store |
| API Calls | Fetch on open | Fetch only on user input |

---

**REMEMBER: Always consider edge cases, test thoroughly, and never assume something works without verification!**
