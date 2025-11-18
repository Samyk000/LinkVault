import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const supabase = await createClient();
    
    // Get share information with folder and links
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
          user_id
        ),
        folders:links (
          id,
          url,
          title,
          description:metadata->>description,
          image:metadata->>image,
          created_at
        )
      `)
      .eq('id', shareId)
      .single();

    if (shareError || !share || !share.folders) {
      logger.warn('Share validation failed:', { shareId, error: shareError });
      return NextResponse.json(
        { valid: false, error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    // Return share information with links
    return NextResponse.json({
      valid: true,
      data: {
        id: share.id,
        folder: {
          id: share.folders.id,
          name: share.folders.name,
          iconName: share.folders.icon_name,
          color: share.folders.color,
          description: share.folders.description,
          userId: share.folders.user_id,
        },
        links: share.folders_links || [],
        createdAt: share.created_at,
      },
    });

  } catch (error) {
    logger.error('Share validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const { shareId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the share belongs to the user
    const { data: share, error: shareError } = await supabase
      .from('folder_shares')
      .select('id, user_id')
      .eq('id', shareId)
      .eq('user_id', user.id)
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { success: false, error: 'Share not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the share
    const { error: deleteError } = await supabase
      .from('folder_shares')
      .delete()
      .eq('id', shareId);

    if (deleteError) {
      logger.error('Share deletion error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete share' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });

  } catch (error) {
    logger.error('Share deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}