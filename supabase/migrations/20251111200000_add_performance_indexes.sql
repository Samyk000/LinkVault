-- =============================================
-- PERFORMANCE OPTIMIZATION: Database Indexes
-- =============================================

-- Drop existing indexes that might conflict
DROP INDEX IF EXISTS idx_links_user_created;
DROP INDEX IF EXISTS idx_links_user_folder;
DROP INDEX IF EXISTS idx_links_user_search;
DROP INDEX IF EXISTS idx_folders_user_parent;
DROP INDEX IF EXISTS idx_links_user_favorite;

-- Links table indexes for common query patterns
CREATE INDEX idx_links_user_created ON links(user_id, created_at DESC);
CREATE INDEX idx_links_user_folder ON links(user_id, folder_id, deleted_at, created_at DESC);
CREATE INDEX idx_links_user_favorite ON links(user_id, is_favorite, deleted_at, created_at DESC);

-- Full-text search index for links (title, description, url, tags)
CREATE INDEX idx_links_user_search ON links USING GIN (
  user_id,
  to_tsvector('english', 
    COALESCE(title, '') || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(url, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
  )
);

-- Partial index for active links (not deleted)
CREATE INDEX idx_links_active ON links(user_id, deleted_at) WHERE deleted_at IS NULL;

-- Partial index for trashed links
CREATE INDEX idx_links_trashed ON links(user_id, deleted_at) WHERE deleted_at IS NOT NULL;

-- Folders table indexes
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id, created_at);
CREATE INDEX idx_folders_user_name ON folders(user_id, name);

-- Settings table indexes
CREATE INDEX idx_user_settings_user ON user_settings(user_id);

-- Composite index for link counts by folder
CREATE INDEX idx_links_folder_counts ON links(folder_id, deleted_at) WHERE deleted_at IS NULL;

-- Index for platform-based queries
CREATE INDEX idx_links_platform ON links(user_id, platform, deleted_at) WHERE platform IS NOT NULL;

-- Index for tag-based queries
CREATE INDEX idx_links_tags ON links USING GIN (user_id, tags) WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- Analyze tables to update statistics
ANALYZE links;
ANALYZE folders;
ANALYZE user_settings;