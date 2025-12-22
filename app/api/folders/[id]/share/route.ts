import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: folderId } = await params;

    // Verify folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Generate share ID if not exists
    let shareId = folder.share_id;
    if (!shareId) {
      shareId = `share_${uuidv4()}`;
      
      // Update folder with sharing info
      const { error: updateError } = await supabase
        .from('folders')
        .update({
          shareable: true,
          share_id: shareId,
          share_created_at: new Date().toISOString()
        })
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to enable sharing' },
          { status: 500 }
        );
      }

      // Create share record
      logger.info('Creating share record:', {
        folder_id: folderId,
        share_id: shareId,
        user_id: user.id
      });
      
      const { data, error: shareError } = await supabase
        .from('folder_shares')
        .insert({
          folder_id: folderId,
          share_id: shareId,
          user_id: user.id,
          created_by: user.id
        })
        .select()
        .single();

      if (shareError) {
        logger.error('Share record creation failed:', {
          error: shareError.message,
          code: shareError.code,
          details: shareError.details,
          hint: shareError.hint,
          folderId,
          userId: user.id
        });
        return NextResponse.json(
          { error: 'Failed to create share record', details: shareError.message },
          { status: 500 }
        );
      }
      
      logger.info('Share record created successfully:', { shareId: data?.id });
    }

    const baseUrl = request.nextUrl.origin;
    const shareUrl = `${baseUrl}/share/folder/${shareId}`;

    return NextResponse.json({
      success: true,
      shareUrl,
      shareId,
      message: 'Folder sharing enabled successfully'
    });

  } catch (error) {
    logger.error('Share folder error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id: folderId } = await params;

    // Verify folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Disable sharing
    const { error: updateError } = await supabase
      .from('folders')
      .update({
        shareable: false,
        share_id: null,
        share_created_at: null
      })
      .eq('id', folderId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to disable sharing' },
        { status: 500 }
      );
    }

    // Delete share record and analytics
    await supabase
      .from('share_analytics')
      .delete()
      .eq('share_id', folder.share_id);

    await supabase
      .from('folder_shares')
      .delete()
      .eq('share_id', folder.share_id);

    return NextResponse.json({
      success: true,
      message: 'Folder sharing disabled successfully'
    });

  } catch (error) {
    logger.error('Disable sharing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}