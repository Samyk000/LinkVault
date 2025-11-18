/**
 * @file store/useStore.ts
 * @description DEPRECATED - Use modular stores instead (useLinksStore, useFoldersStore, etc.)
 * @created 2025-10-18
 * @deprecated This file is kept for backwards compatibility only.
 *             New code should use @/store/compatibility-bridge or modular stores directly.
 * 
 * This file now re-exports the compatibility bridge to maintain backwards compatibility
 * while using the new modular store architecture under the hood.
 * 
 * Migration path:
 * 1. Old code continues working via compatibility bridge (this file)
 * 2. New code uses modular stores directly
 * 3. Gradually migrate old code to modular stores
 * 4. Eventually remove this compatibility layer
 */

// Re-export the compatibility bridge as useStore
export { useStoreCompat as useStore } from './compatibility-bridge';
export { useStoreCompat as default } from './compatibility-bridge';

/*
 * NOTE: The original monolithic implementation has been completely removed
 * to eliminate dead code and reduce bundle size.
 * 
 * All functionality is preserved through the compatibility bridge which uses
 * the new modular stores (useLinksStore, useFoldersStore, useSettingsStore, etc.)
 * under the hood.
 * 
 * For the original implementation history, see git commit history.
 */
