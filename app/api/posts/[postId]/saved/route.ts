import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { isSaved: false },
        { status: 200 }
      );
    }

    // Check if post is saved
    const { data, error } = await supabase
      .from('user_saved_posts')
      .select('post_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (error) {
      console.error('Error checking saved status:', error);
      return NextResponse.json(
        { isSaved: false },
        { status: 200 }
      );
    }

    return NextResponse.json({
      isSaved: !!data,
    });

  } catch (error) {
    console.error('Error in check saved API:', error);
    return NextResponse.json(
      { isSaved: false },
      { status: 200 }
    );
  }
}
