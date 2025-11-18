import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Share creation request received');
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    console.log('Authentication check:', { hasUser: !!user, authError: !!authError });

    if (authError || !user) {
      console.log('Authentication failed:', { authError });
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', { userId: user.id });

    const body = await request.json();
    console.log('Request body:', body);
    
    const { folderId } = body;

    // Validate required fields
    if (!folderId) {
      console.log('Folder ID missing');
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    console.log('Validating folder:', { folderId, userId: user.id });

    // Validate folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    console.log('Folder query result:', { folder, folderError });

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    console.log('Folder validated:', { folderId: folder.id, folderName: folder.name });

    // Generate share ID (UUID format for database compatibility)
    const shareId = crypto.randomUUID();
    
    // Set expiration time to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    console.log('Creating share record:', { shareId, folderId, userId: user.id, expiresAt });

    // Insert share record (simplified - no password or expiration)
    const { data: share, error: insertError } = await supabase
      .from('folder_shares')
      .insert({
        id: shareId,
        folder_id: folderId,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log('Share creation result:', { share, insertError });

    if (insertError) {
      console.error('Share creation error:', { insertError, shareId, folderId, userId: user.id });
      return NextResponse.json(
        { error: `Failed to create share link: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Return share information
    const baseUrl = request.nextUrl.origin;
    const shareUrl = `${baseUrl}/shared/${shareId}`;

    console.log('Share created successfully:', {
      shareId: share.id,
      shareData: share,
      shareUrl
    });

    return NextResponse.json({
      success: true,
      data: {
        id: share.id,
        shareUrl,
        folder: {
          id: folder.id,
          name: folder.name,
        },
        createdAt: share.created_at,
      },
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get all shares for the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's shares with folder information
    const { data: shares, error: sharesError } = await supabase
      .from('folder_shares')
      .select(`
        *,
        folders (id, name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (sharesError) {
      console.error('Get shares error:', sharesError);
      return NextResponse.json(
        { error: 'Failed to retrieve shares' },
        { status: 500 }
      );
    }

    const baseUrl = request.nextUrl.origin;

    return NextResponse.json({
      success: true,
      data: shares.map((share: any) => ({
        id: share.id,
        shareUrl: `${baseUrl}/shared/${share.id}`,
        folder: share.folders,
        createdAt: share.created_at,
        updatedAt: share.updated_at,
      })),
    });

  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}