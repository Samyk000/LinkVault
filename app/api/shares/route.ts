import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
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

    const body = await request.json();
    const { folderId } = body;

    // Validate required fields
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Validate folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('id, name, user_id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Generate share ID (UUID format for database compatibility)
    const shareId = crypto.randomUUID();

    // Insert share record
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

    if (insertError) {
      console.error('Share creation error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      );
    }

    // Return share information
    const baseUrl = request.nextUrl.origin;
    const shareUrl = `${baseUrl}/shared/${shareId}`;

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