import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 1. First, get saved post IDs
    const { data: savedPostIds, count: totalCount, error: savedError } = await supabase
      .from('user_saved_posts')
      .select('post_id, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (savedError) {
      console.error('Error fetching saved post IDs:', savedError);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch saved posts', error: savedError.message },
        { status: 500 }
      );
    }

    if (!savedPostIds || savedPostIds.length === 0) {
      return NextResponse.json({
        success: true,
        posts: [],
        total: 0,
        page,
        hasMore: false,
      });
    }

    const postIds = savedPostIds.map(s => s.post_id);

    // 2. Fetch all required data in parallel (Bulk Queries)
    const [contentsRes, postsRes, likesRes, commentsRes, viewsRes] = await Promise.all([
      supabase.from('post_content').select('post_id, title, description, slug, author_image').in('post_id', postIds),
      supabase.from('post').select('id, user_id, created_at').in('id', postIds),
      supabase.from('post_likes').select('post_id').in('post_id', postIds).eq('liked', true),
      supabase.from('comments').select('post_id').in('post_id', postIds),
      supabase.from('post_views').select('post_id, views').in('post_id', postIds)
    ]);

    // 3. Process maps for easy lookup
    const contentMap = new Map(contentsRes.data?.map(c => [c.post_id, c]));
    const postMap = new Map(postsRes.data?.map(p => [p.id, p]));
    const viewsMap = new Map(viewsRes.data?.map(v => [v.post_id, v.views]));
    
    // Process counts
    const likesCountMap = new Map<string, number>();
    likesRes.data?.forEach(l => {
      likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1);
    });
    
    const commentsCountMap = new Map<string, number>();
    commentsRes.data?.forEach(c => {
        commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
    });

    // 4. Fetch unique authors
    const authorIds = Array.from(new Set(postsRes.data?.map(p => p.user_id).filter(Boolean)));
    const { data: authors } = await supabase.from('user_profile').select('id, display_name, avatar_url').in('id', authorIds);
    const authorMap = new Map(authors?.map(a => [a.id, a]));

    // 5. Assemble final posts data
    const formattedPosts = savedPostIds.map(saved => {
      const post = postMap.get(saved.post_id);
      if (!post) return null;
      
      const content = contentMap.get(saved.post_id);
      const author = authorMap.get(post.user_id);
      
      return {
        id: post.id,
        title: content?.title || '(Tanpa judul)',
        description: content?.description || '',
        slug: content?.slug || '',
        author_image: content?.author_image,
        author: {
          id: author?.id || '',
          display_name: author?.display_name || 'Anonim',
          avatar_url: author?.avatar_url || '',
        },
        created_at: post.created_at,
        saved_at: saved.created_at,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
        views: viewsMap.get(post.id) || 0,
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      total: totalCount || 0,
      page,
      hasMore: (totalCount || 0) > offset + limit,
    });

  } catch (error) {
    console.error('Error in get saved posts API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: String(error) },
      { status: 500 }
    );
  }
}
