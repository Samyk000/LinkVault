import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LinkCard } from '@/components/links/link-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Clock, Lock, ArrowLeft, User } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';

// Force dynamic rendering to prevent caching issues with shared folders
export const dynamic = 'force-dynamic';

interface SharedFolderPageProps {
  params: Promise<{
    shareId: string;
  }>;
}

export default async function SharedFolderPage({ params }: SharedFolderPageProps) {
  // Next.js 15 parameter handling
  const { shareId } = await params;

  // Critical configuration check
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not defined. Shared folders require this key to bypass RLS.');
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg border border-red-200">
            <h1 className="text-xl font-bold text-red-700 mb-2">Configuration Error</h1>
            <p className="text-red-600 mb-4">
              <code>SUPABASE_SERVICE_ROLE_KEY</code> is missing in your environment variables.
            </p>
            <p className="text-sm text-gray-600">
              Shared folders require the Service Role Key to allow public access to private data.
              Please add this key to your <code>.env.local</code> file.
            </p>
          </div>
        </div>
      );
    }
    // In production, we still have to 404 or 500, but the log will be there.
    notFound();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Use admin client for fetching share data to ensure access
    // We control access via the user check below
    const adminSupabase = createAdminClient();

    // Get headers for analytics
    const headersList = await import('next/headers');
    const headers = await headersList.headers();
    const clientIP = headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown';
    const userAgent = headers.get('user-agent') || 'unknown';
    const referrer = headers.get('referer') || null;

    // Get share information with folder and links using Admin Client
    logger.info('DEBUG: Fetching share with ID:', { shareId, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY });

    // SIMPLIFIED QUERY: Fetch share first, then folder details separately if needed
    // This helps isolate if the join is causing the null result
    const { data: share, error: shareError } = await adminSupabase
      .from('folder_shares')
      .select('*')
      .eq('share_id', shareId.toString())
      .single();

    if (shareError) {
      logger.error('DEBUG: Share fetch error (simple):', shareError);
    }

    if (!share) {
      logger.warn('DEBUG: Share not found (simple query)');
      notFound();
    }

    // Now fetch the folder details manually since we have the share
    // Renamed to fetchedFolder to avoid collision with later variable
    const { data: fetchedFolder, error: folderError } = await adminSupabase
      .from('folders')
      .select(`
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
      `)
      .eq('id', share.folder_id)
      .single();

    if (folderError || !fetchedFolder) {
      logger.error('DEBUG: Folder fetch error:', folderError);
      notFound();
    }

    // Reconstruct the object structure expected by the rest of the component
    const finalShare = {
      ...share,
      folders: fetchedFolder
    };

    // Fetch sharer profile
    const { data: sharerProfile } = await adminSupabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', finalShare.user_id)
      .single();

    const sharerName = sharerProfile?.full_name || sharerProfile?.username || 'A LinkVault User';

    // Check if share has expired (1 hour limit)
    const createdAt = new Date(finalShare.created_at);
    const now = new Date();
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed > 1) {
      logger.warn('Shared folder expired:', { shareId, hoursElapsed });

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Share Expired
              </h1>
              <p className="text-muted-foreground mb-6">
                This shared folder link has expired after 1 hour for security reasons.
              </p>
              <Button asChild className="w-full">
                <Link href="/app">Return to LinkVault</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // REQUIRE LOGIN: If user is not logged in, show login prompt
    if (!user) {
      return (
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-lg border-orange-100/50">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-2xl">Login to View Folder</CardTitle>
              <CardDescription className="text-base mt-2">
                <span className="font-semibold text-foreground">{sharerName}</span> has shared the folder <span className="font-semibold text-foreground">"{finalShare.folders.name}"</span> with you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-center mb-4">
                Please log in or create an account to view this shared content securely.
              </div>
              <Button className="w-full h-11 text-base" asChild>
                <Link href={`/login?next=/shared/${shareId}`}>
                  Log In to View
                </Link>
              </Button>
              <div className="text-center text-sm text-muted-foreground pt-2">
                New to LinkVault?{' '}
                <Link href={`/login?tab=signup&next=/shared/${shareId}`} className="text-primary hover:underline font-medium">
                  Create an account
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Track view analytics (non-blocking)
    try {
      // Track view analytics (fire and forget)
      // Use admin client for analytics insert as well to ensure it works for anon users
      await adminSupabase
        .from('share_analytics')
        .insert({
          share_id: finalShare.id,
          viewer_ip: clientIP,
          user_agent: userAgent,
          referral_source: referrer,
          viewer_id: user.id // Track who viewed it
        });

      // Increment view count
      await adminSupabase.rpc('increment_share_view_count', { share_id_param: finalShare.id });
    } catch (err) {
      logger.warn('Analytics tracking failed:', err);
    }

    const folder = finalShare.folders;
    const links = folder.links || [];

    return (
      <div className="min-h-screen bg-background">
        {/* Header Section */}
        <div className="border-b bg-card sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {/* Left: Title & Info */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg hidden sm:block">
                  <LinkIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">
                      {folder.name}
                    </h1>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                      Shared
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <User className="h-3.5 w-3.5" />
                    <span>Shared by <span className="font-medium text-foreground">{sharerName}</span></span>
                    <span>•</span>
                    <span>{links.length} {links.length === 1 ? 'link' : 'links'}</span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3">
                <Button variant="outline" asChild className="gap-2">
                  <Link href="/app">
                    <ArrowLeft className="h-4 w-4" />
                    Back to App
                  </Link>
                </Button>
              </div>
            </div>

            {folder.description && (
              <p className="text-muted-foreground mt-4 text-sm max-w-3xl">
                {folder.description}
              </p>
            )}
          </div>
        </div>

        {/* Links Grid */}
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {links.length === 0 ? (
            <div className="text-center py-16 bg-card/50 rounded-xl border border-dashed">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <LinkIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No links yet</h3>
              <p className="text-sm text-muted-foreground">This shared folder is currently empty.</p>
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
                  onToggleSelect={() => { }}
                  isSelectionModeActive={false}
                  // Disable actions for shared view
                  showActions={false}
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