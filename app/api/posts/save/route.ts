import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get post ID from request body
    const { postId } = await request.json();
    
    if (!postId) {
      return NextResponse.json(
        { success: false, message: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('post')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: 'Post not found' },
        { status: 404 }
      );
    }

    // Save post (insert into user_saved_posts)
    const { error: saveError } = await supabase
      .from('user_saved_posts')
      .insert({
        user_id: user.id,
        post_id: postId,
      });

    if (saveError) {
      // Check if already saved (duplicate key error)
      if (saveError.code === '23505') {
        return NextResponse.json(
          { success: true, message: 'Post already saved' },
          { status: 200 }
        );
      }
      
      console.error('Error saving post:', saveError);
      return NextResponse.json(
        { success: false, message: 'Failed to save post' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Post saved successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in save post API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    // Get post ID from request body
    const { postId } = await request.json();
    
    if (!postId) {
      return NextResponse.json(
        { success: false, message: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Unsave post (delete from user_saved_posts)
    const { error: deleteError } = await supabase
      .from('user_saved_posts')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (deleteError) {
      console.error('Error unsaving post:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to unsave post' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Post unsaved successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in unsave post API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
