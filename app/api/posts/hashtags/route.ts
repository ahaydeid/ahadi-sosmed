import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Add hashtags to a post
export async function POST(request: Request) {
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

    const { postId, hashtags } = await request.json();

    if (!postId || !Array.isArray(hashtags)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request. postId and hashtags array required.' },
        { status: 400 }
      );
    }

    // Verify post belongs to user
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to modify this post' },
        { status: 403 }
      );
    }

    // Normalize and validate hashtags
    const normalizedHashtags = hashtags
      .map(tag => {
        // Remove # if present, lowercase, trim
        let normalized = tag.replace(/^#/, '').toLowerCase().trim();
        // Only allow alphanumeric and underscore
        normalized = normalized.replace(/[^a-z0-9_]/g, '');
        return normalized;
      })
      .filter(tag => tag.length > 0 && tag.length <= 50) // Max 50 chars per hashtag
      .slice(0, 10); // Max 10 hashtags

    if (normalizedHashtags.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No valid hashtags to add', count: 0 }
      );
    }

    // Delete existing post_hashtags relationships
    await supabase
      .from('post_hashtags')
      .delete()
      .eq('post_id', postId);

    // Process each hashtag
    const hashtagIds: string[] = [];
    
    for (const tag of normalizedHashtags) {
      // Check if hashtag exists in hashtags table
      let { data: existingHashtag, error: fetchError } = await supabase
        .from('hashtags')
        .select('id')
        .eq('name', tag)
        .maybeSingle();

      let hashtagId: string;

      if (existingHashtag) {
        // Hashtag exists, use its ID
        hashtagId = existingHashtag.id;
      } else {
        // Create new hashtag
        const { data: newHashtag, error: createError } = await supabase
          .from('hashtags')
          .insert({ name: tag })
          .select('id')
          .single();

        if (createError || !newHashtag) {
          console.error('Error creating hashtag:', createError);
          continue; // Skip this hashtag
        }

        hashtagId = newHashtag.id;
      }

      hashtagIds.push(hashtagId);
    }

    // Create post_hashtags relationships
    if (hashtagIds.length > 0) {
      const relationships = hashtagIds.map(hashtagId => ({
        post_id: postId,
        hashtag_id: hashtagId,
      }));

      const { error: insertError } = await supabase
        .from('post_hashtags')
        .insert(relationships);

      if (insertError) {
        console.error('Error inserting post_hashtags:', insertError);
        return NextResponse.json(
          { success: false, message: 'Failed to save hashtags' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Hashtags saved successfully',
      count: hashtagIds.length,
      hashtags: normalizedHashtags,
    });

  } catch (error) {
    console.error('Error in hashtags API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get hashtags for a post
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { success: false, message: 'postId parameter required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get hashtags through junction table
    const { data: postHashtags, error } = await supabase
      .from('post_hashtags')
      .select(`
        hashtags:hashtag_id (
          id,
          name
        )
      `)
      .eq('post_id', postId);

    if (error) {
      console.error('Error fetching hashtags:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch hashtags' },
        { status: 500 }
      );
    }

    // Extract hashtag names
    const hashtags = postHashtags
      ?.map((ph: any) => ph.hashtags?.name)
      .filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      hashtags,
    });

  } catch (error) {
    console.error('Error in get hashtags API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove specific hashtag from post
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId, hashtag } = await request.json();

    if (!postId || !hashtag) {
      return NextResponse.json(
        { success: false, message: 'postId and hashtag required' },
        { status: 400 }
      );
    }

    // Verify post belongs to user
    const { data: post } = await supabase
      .from('post')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const normalizedHashtag = hashtag.replace(/^#/, '').toLowerCase().trim();

    // Find hashtag ID
    const { data: hashtagData } = await supabase
      .from('hashtags')
      .select('id')
      .eq('name', normalizedHashtag)
      .maybeSingle();

    if (!hashtagData) {
      return NextResponse.json(
        { success: false, message: 'Hashtag not found' },
        { status: 404 }
      );
    }

    // Delete relationship
    const { error: deleteError } = await supabase
      .from('post_hashtags')
      .delete()
      .eq('post_id', postId)
      .eq('hashtag_id', hashtagData.id);

    if (deleteError) {
      console.error('Error deleting hashtag:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete hashtag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Hashtag removed successfully',
    });

  } catch (error) {
    console.error('Error in delete hashtag API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
