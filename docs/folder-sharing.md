# 📁 Folder Sharing Feature Documentation

## Overview

The folder sharing feature allows LinkVault users to share their folders with anyone via a unique share link. This feature includes analytics tracking, social sharing options, and a beautiful shared folder view.

## Features

### Core Functionality
- **One-click sharing**: Generate share links with a single click
- **Secure sharing**: Share links are UUID-based and unguessable
- **Read-only access**: Shared folders are view-only for external users
- **Analytics tracking**: Track views, referrers, and engagement metrics
- **Social sharing**: Quick sharing to Twitter, Facebook, and messaging apps

### User Interface
- **Share modal**: Clean interface for generating and managing share links
- **Shared folder page**: Beautiful, branded page for viewing shared content
- **Social proof**: CTA to encourage new user signups
- **Responsive design**: Works perfectly on desktop and mobile devices

## Technical Architecture

### Database Schema

#### New Tables
```sql
-- Folder sharing tracking
CREATE TABLE folder_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  share_id VARCHAR(255) UNIQUE NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- View analytics tracking
CREATE TABLE share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id VARCHAR(255) NOT NULL REFERENCES folder_shares(share_id) ON DELETE CASCADE,
  viewer_ip INET,
  user_agent TEXT,
  viewed_at TIMESTAMP DEFAULT NOW(),
  referral_source TEXT
);
```

#### Modified Tables
```sql
-- Added to existing folders table
ALTER TABLE folders ADD COLUMN shareable BOOLEAN DEFAULT false;
ALTER TABLE folders ADD COLUMN share_id VARCHAR(255) UNIQUE;
ALTER TABLE folders ADD COLUMN share_created_at TIMESTAMP;
```

### API Endpoints

#### POST `/api/folders/[id]/share`
Enables sharing for a folder.

**Request:**
```http
POST /api/folders/123/share
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "shareUrl": "https://linkvault.app/share/folder/share_abc123",
  "shareId": "share_abc123",
  "message": "Folder sharing enabled successfully"
}
```

#### DELETE `/api/folders/[id]/share`
Disables sharing for a folder.

**Request:**
```http
DELETE /api/folders/123/share
Authorization: Bearer <user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Folder sharing disabled successfully"
}
```

#### GET `/api/share/[shareId]`
Retrieves shared folder data and tracks views.

**Request:**
```http
GET /api/share/share_abc123
```

**Response:**
```json
{
  "id": "123",
  "name": "My Favorite Resources",
  "description": "A collection of amazing tools and resources",
  "color": "#ff6b6b",
  "icon": "📚",
  "shareId": "share_abc123",
  "shareCreatedAt": "2025-11-18T12:00:00Z",
  "links": [
    {
      "id": "link1",
      "title": "Next.js Documentation",
      "description": "The React Framework for the Web",
      "url": "https://nextjs.org",
      "thumbnail": "https://nextjs.org/api/thumbnail.jpg",
      "favicon_url": "https://nextjs.org/favicon.ico",
      "platform": "website",
      "is_favorite": true,
      "tags": ["react", "framework"],
      "created_at": "2025-11-18T10:00:00Z"
    }
  ]
}
```

### Frontend Components

#### ShareFolderModal
Modal dialog for generating and managing share links.

**Props:**
- `folderId: string` - ID of the folder to share
- `folderName: string` - Name of the folder for display
- `linkCount: number` - Number of links in the folder
- `isOpen: boolean` - Whether modal is open
- `onClose: () => void` - Callback when modal closes

#### FolderActionsMenu
Dropdown menu with share and other folder actions.

**Props:**
- `folder: { id, name, linkCount, shareable?, shareId? }` - Folder data
- `onEdit: (folderId: string) => void` - Edit handler
- `onDelete: (folderId: string) => void` - Delete handler

#### Shared Folder Page
Public page for viewing shared folders at `/share/folder/[shareId]`.

## Security Features

### Authentication & Authorization
- Only folder owners can enable/disable sharing
- Share links are UUID-based (unguessable)
- Read-only access for viewers (no authentication required)
- Row Level Security (RLS) policies enforce access controls

### Privacy Controls
- Users can disable sharing at any time
- All analytics data is anonymized
- No personal information exposed in shared views

## Performance Optimizations

### Database
- Indexed queries for fast folder retrieval
- Efficient analytics tracking with minimal overhead
- Cached folder data with proper invalidation

### Frontend
- Lazy loading of shared folder content
- Optimized image loading with fallbacks
- Minimal bundle size for shared pages

## Analytics & Tracking

### View Metrics
- Total view count per shared folder
- Timestamp of each view
- Referrer information
- User agent details (for device/browser stats)

### Engagement Metrics
- Link click-through rates
- Time spent viewing shared folders
- Social sharing interactions

## Error Handling

### API Errors
- **401 Unauthorized**: User not authenticated
- **404 Not Found**: Folder not found or access denied
- **500 Internal Server Error**: Server-side issues

### Frontend Errors
- Graceful fallbacks for failed API calls
- User-friendly error messages
- Loading states for async operations

## Deployment Checklist

### Environment Variables
```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### Database Migration
Run the migration to add sharing tables:
```bash
# Migration file: supabase/migrations/20251118120000_add_folder_sharing.sql
```

### Dependencies
Ensure `uuid` package is installed:
```bash
npm install uuid
```

### Testing
- [ ] Test share link generation
- [ ] Test shared folder viewing
- [ ] Test sharing disable functionality
- [ ] Test social sharing buttons
- [ ] Test analytics tracking
- [ ] Test error scenarios

## Usage Examples

### Generating a Share Link
```javascript
import { foldersDatabaseService } from '@/lib/services/folders-database.service';

async function shareFolder(folderId) {
  try {
    const { shareUrl, shareId } = await foldersDatabaseService.enableFolderSharing(folderId);
    console.log('Share URL:', shareUrl);
    // Copy to clipboard or show in UI
  } catch (error) {
    console.error('Failed to enable sharing:', error);
  }
}
```

### Disabling Sharing
```javascript
async function disableSharing(folderId) {
  try {
    await foldersDatabaseService.disableFolderSharing(folderId);
    console.log('Sharing disabled');
  } catch (error) {
    console.error('Failed to disable sharing:', error);
  }
}
```

### Fetching Shared Folder Data
```javascript
async function getSharedFolder(shareId) {
  try {
    const data = await foldersDatabaseService.getSharedFolder(shareId);
    if (data) {
      console.log('Shared folder:', data);
      return data;
    } else {
      console.log('Folder not found or not shared');
      return null;
    }
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    return null;
  }
}
```

## Future Enhancements

### Potential Features
- **Expiration dates**: Time-limited share links
- **Password protection**: Require password to view shared folders
- **Custom thumbnails**: User-defined preview images for shared folders
- **Download options**: Allow downloading of shared folder data
- **Commenting**: Allow viewers to leave comments on shared folders

### Analytics Improvements
- **Heatmaps**: Visualize which links get the most attention
- **Demographics**: Geographic and device analytics
- **Conversion tracking**: Track signups from shared links

## Troubleshooting

### Common Issues

#### Share Link Not Working
- Check that the folder is marked as `shareable: true`
- Verify the `share_id` is set correctly
- Ensure the folder belongs to the authenticated user

#### Analytics Not Tracking
- Check that the analytics endpoint is called on page load
- Verify the `share_analytics` table has proper RLS policies
- Ensure the `increment_share_view_count` function exists

#### Permission Errors
- Verify RLS policies are correctly set up
- Check that the user is properly authenticated
- Ensure folder ownership is correctly validated

### Debug Commands

#### Check Share Status
```sql
SELECT * FROM folders WHERE id = 'folder_id';
```

#### View Analytics Data
```sql
SELECT 
  fs.share_id,
  fs.view_count,
  COUNT(sa.id) as total_views,
  COUNT(DISTINCT sa.viewer_ip) as unique_visitors
FROM folder_shares fs
LEFT JOIN share_analytics sa ON fs.share_id = sa.share_id
WHERE fs.created_by = 'user_id'
GROUP BY fs.id;
```

## Support

For issues or questions about the folder sharing feature:

1. Check the troubleshooting section above
2. Review the API logs for error details
3. Verify database schema and RLS policies
4. Test with different user accounts to isolate permission issues

---

**Last Updated**: November 18, 2025
**Version**: 1.0.0