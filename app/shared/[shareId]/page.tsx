import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LinkCard } from '@/components/links/link-card';
import { FolderBadge } from '@/components/links/folder-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, Clock } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface SharedFolderPageProps {
  params: Promise<{
    shareId: string;
  }>;
}

export default async function SharedFolderPage({ params }: SharedFolderPageProps) {
  // Next.js 15 parameter handling
  const { shareId } = await params;
  console.log('ShareFolderPage params:', { params, shareId, shareIdType: typeof shareId });
  
  try {
    const supabase = await createClient();
    
    // Get share information with folder and links
    console.log('Querying share with ID:', { shareId, shareIdType: typeof shareId, shareIdValue: shareId });
    
    const { data: share, error: shareError } = await supabase
      .from('folder_shares')
      .select(`
        *,
        folders (
          id,
          name,
          icon_name,
          color,
          description,
          user_id,
          links (
            id,
            url,
            title,
            description:metadata->>description,
            image:metadata->>image,
            created_at
          )
        )
      `)
      .eq('id', shareId.toString())
      .single();
    
    console.log('Share query result:', {
      share,
      shareError,
      shareFound: !!share,
      hasFolders: !!share?.folders,
      queryShareId: shareId.toString()
    });
    
    if (shareError) {
      console.error('Share query detailed error:', {
        shareId: shareId.toString(),
        error: shareError,
        errorDetails: {
          code: shareError.code,
          message: shareError.message,
          hint: shareError.hint,
          details: shareError.details
        }
      });
    }

    if (shareError || !share || !share.folders) {
      logger.warn('Shared folder not found:', {
        shareId,
        error: shareError,
        shareData: share,
        hasFolders: !!share?.folders
      });
      notFound();
    }

    // Check if share has expired (1 hour limit)
    const createdAt = new Date(share.created_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursElapsed > 1) {
      logger.warn('Shared folder expired:', {
        shareId,
        hoursElapsed,
        createdAt: share.created_at,
        expiresAt: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString()
      });
      
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h1 className="mt-4 text-3xl font-bold text-foreground">
                Share Expired
              </h1>
              <p className="mt-2 text-muted-foreground">
                This shared folder link has expired after 1 hour for security reasons.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Time elapsed: {hoursElapsed.toFixed(2)} hours
              </p>
              <Button
                onClick={() => window.location.href = '/app'}
                className="mt-6"
              >
                Return to LinkVault
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const folder = share.folders;
    const links = folder.links || [];

    return (
      <div className="min-h-screen bg-background">
        {/* Header Section */}
        <div className="border-b bg-card">
          <div className="container mx-auto py-8">
            <div className="flex items-center gap-3 mb-4">
              <Link className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-3xl font-bold text-foreground">
                Shared Folder: {folder.name}
              </h1>
            </div>
            
            {folder.description && (
              <p className="text-muted-foreground mb-4">{folder.description}</p>
            )}
            
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {links.length} {links.length === 1 ? 'link' : 'links'}
              </Badge>
              <Badge variant="outline">Public Share</Badge>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="container mx-auto py-8">
          {links.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-2">📭</div>
              <h3 className="text-lg font-medium mb-1">No links yet</h3>
              <p className="text-sm">This folder is currently empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {links.map((link: any) => (
                <LinkCard
                  key={link.id}
                  link={{
                    id: link.id,
                    url: link.url,
                    title: link.title || 'Untitled',
                    description: link.description || '',
                    thumbnail: link.image || '',
                    folderId: folder.id,
                    isFavorite: false,
                    createdAt: link.created_at,
                    updatedAt: link.created_at,
                    platform: 'other',
                    deletedAt: null,
                    userId: share.user_id,
                    syncedAt: link.created_at,
                  }}
                  isInTrash={false}
                  isSelected={false}
                  onToggleSelect={() => {}}
                  isSelectionModeActive={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );

  } catch (error) {
    logger.error('Error loading shared folder:', error);
    notFound();
  }
}