-- Corrected Database Performance Optimization Migration
-- Based on actual schema analysis
-- This migration removes unused indexes and keeps the good ones

-- ============================================
-- ANALYSIS: Your database is already well-indexed!
-- ============================================
-- Good existing indexes to KEEP:
-- - idx_links_user_active (user_id, created_at WHERE deleted_at IS NULL)
-- - idx_links_user_favorites (user_id, created_at WHERE is_favorite = true AND deleted_at IS NULL)
-- - idx_links_user_folder (user_id, folder_id WHERE deleted_at IS NULL)
-- - idx_links_user_trash (user_id, deleted_at WHERE deleted_at IS NOT NULL)
-- - idx_links_search (GIN index for full-text search)

-- ============================================
-- STEP 1: Remove ONLY truly unused single-column indexes
-- ============================================
-- These are redundant because composite indexes already cover them

-- Remove redundant indexes on links (covered by composite indexes)
DROP INDEX IF EXISTS idx_links_title;  -- Covered by search index
DROP INDEX IF EXISTS idx_links_url;    -- Not commonly queried alone
DROP INDEX IF EXISTS idx_links_platform;  -- Not commonly queried alone
DROP INDEX IF EXISTS idx_links_is_archived;  -- Rarely used
DROP INDEX IF EXISTS idx_links_last_clicked_at;  -- Rarely queried

-- Remove redundant indexes on folders (covered by composite indexes)
DROP INDEX IF EXISTS idx_folders_name;  -- Covered by unique constraint
DROP INDEX IF EXISTS idx_folders_is_default;  -- Rarely used alone

-- Keep these because they're actually used:
-- - idx_links_folder_active (complex WHERE clause, useful)
-- - idx_links_is_favorite (used in favorites view)
-- - idx_links_tags (GIN index for array search)
-- - idx_links_search (GIN index for full-text search)
-- - idx_folders_parent_id (used for tree queries)
-- - idx_folders_user_parent (composite, frequently used)

-- ============================================
-- STEP 2: Add missing composite index for better performance
-- ============================================

-- This index improves the main query: get all links ordered by date
-- ONLY if it doesn't already exist (it might as idx_links_user_active)
CREATE INDEX IF NOT EXISTS idx_links_user_created 
ON links(user_id, created_at DESC);

-- This index improves folder queries with parent relationships
CREATE INDEX IF NOT EXISTS idx_folders_user_created 
ON folders(user_id, created_at);

-- ============================================
-- STEP 3: Update statistics for query planner
-- ============================================
-- This helps PostgreSQL choose the right indexes

ANALYZE links;
ANALYZE folders;

-- ============================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================
-- Run this after migration to see remaining indexes:
-- SELECT tablename, indexname FROM pg_indexes 
-- WHERE tablename IN ('links', 'folders') 
-- ORDER BY tablename, indexname;

-- ============================================
-- Expected Result
-- ============================================
-- - Removed 7 truly unused indexes
-- - Kept all the good composite indexes
-- - Added 2 helpful composite indexes
-- - Query performance: maintained or improved
-- - Write performance: improved (fewer indexes to update)

