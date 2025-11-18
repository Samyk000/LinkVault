import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  try {
    const supabase = await createClient();
    const { shareId } = await params;

    // Get folder and links for sharing
    const { data: folderData, error } = await supabase
      .from('folders')
      .select(`
        id,
        name,
        description,
        color,
        icon,
        shareable,
        share_id,
        share_created_at,
        links (
          id,
          title,
          description,
          url,
          thumbnail,
          favicon_url,
          platform,
          is_favorite,
          tags,
          created_at
        )
      `)
      .eq('share_id', shareId)
      .eq('shareable', true)
      .single();

    if (error || !folderData) {
      return NextResponse.json(
        { error: 'Shared folder not found' },
        { status: 404 }
      );
    }

    // Track view analytics (non-blocking)
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || null;

    // Track view analytics (fire and forget)
    try {
      await supabase
        .from('share_analytics')
        .insert({
          share_id: shareId,
          viewer_ip: clientIP,
          user_agent: userAgent,
          referral_source: referrer
        });

      // Increment view count
      await supabase.rpc('increment_share_view_count', { share_id_param: shareId });
    } catch (err) {
      console.warn('Analytics tracking failed:', err);
    }

    // Transform data for frontend
    const transformedData = {
      id: folderData.id,
      name: folderData.name,
      description: folderData.description,
      color: folderData.color,
      icon: folderData.icon,
      shareId: folderData.share_id,
      shareCreatedAt: folderData.share_created_at,
      links: folderData.links || [],
      createdAt: folderData.share_created_at
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Get shared folder error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}