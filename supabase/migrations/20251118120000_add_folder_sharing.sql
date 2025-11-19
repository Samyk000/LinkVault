-- Migration: Add folder sharing functionality
-- Adds sharing capabilities to folders with analytics tracking

-- Add sharing fields to existing folders table
ALTER TABLE folders ADD COLUMN IF NOT EXISTS shareable BOOLEAN DEFAULT false;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS share_id VARCHAR(255) UNIQUE;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS share_created_at TIMESTAMP;

-- Create folder_shares table for tracking shared folders
CREATE TABLE IF NOT EXISTS folder_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  share_id VARCHAR(255) UNIQUE NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create share_analytics table for tracking views
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL REFERENCES folder_shares(id) ON DELETE CASCADE,
  viewer_ip INET,
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW(),
  referral_source TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_shares_share_id ON folder_shares(share_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_folder_id ON folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_share_id ON share_analytics(share_id);
CREATE INDEX IF NOT EXISTS idx_share_analytics_viewed_at ON share_analytics(viewed_at);

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE folder_shares
  SET view_count = view_count + 1
  WHERE id = share_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for new tables
ALTER TABLE folder_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folder_shares
CREATE POLICY "Users can view their own shared folders" ON folder_shares
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own shared folders" ON folder_shares
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shared folders" ON folder_shares
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for share_analytics (public insert, restricted select)
CREATE POLICY "Allow public insert to analytics" ON share_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view analytics for their shares" ON share_analytics
  FOR SELECT USING (
    share_id IN (SELECT share_id FROM folder_shares WHERE created_by = auth.uid())
  );

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';