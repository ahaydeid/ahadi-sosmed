"use server";

import { createClient } from "@/lib/supabase/server";
import { PostCardData } from "@/lib/types/post";

export async function getPublicPosts(limit = 10, offset = 0, sortBy: 'latest' | 'popular' = 'latest') {
  const supabase = await createClient();

  // 1. Fetch posts, contents, AND repost_of in one join
  let query = supabase
    .from("post")
    .select(`
      id, 
      created_at, 
      user_id, 
      visibility,
      repost_of,
      post_content ( title, description, author_image, slug ),
      post_views ( views )
    `)
    .eq("visibility", "public");

  if (sortBy === 'popular') {
    // Note: This requires a foreign key relationship between post and post_views
    query = query.order('post_views(views)', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: posts, error } = await query.range(offset, offset + limit - 1);

  if (error || !posts) {
    throw new Error(error?.message || "Gagal memuat postingan");
  }

  // 2. Collect IDs for profiles and reposts
  const userIds = new Set(posts.map((p) => p.user_id).filter(Boolean));
  const repostIds = posts.map(p => p.repost_of).filter(Boolean);

  // 3. Fetch data in parallel
  const [profilesRes, repostsOriginalRes, repostsContentRes, viewsRes, likesRes, commentsRes] = await Promise.all([
    supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", Array.from(userIds)),
    // For reposts, we need the original author ID to fetch THEIR profile next
    repostIds.length > 0 ? supabase.from("post").select("id, created_at, user_id").in("id", repostIds) : Promise.resolve({ data: [] }),
    repostIds.length > 0 ? supabase.from("post_content").select("post_id, title, description, author_image, slug").in("post_id", repostIds) : Promise.resolve({ data: [] }),
    // Bulk fetch views, likes, and comments
    supabase.from("post_views").select("post_id, views").in("post_id", posts.map(p => p.id)),
    supabase.from("post_likes").select("post_id").in("post_id", posts.map(p => p.id)).eq("liked", true),
    supabase.from("comments").select("post_id").in("post_id", posts.map(p => p.id))
  ]);

  const profileMap = new Map(profilesRes.data?.map((p) => [p.id, p]));
  const repostOriginalMap = new Map(repostsOriginalRes.data?.map(p => [p.id, p]));
  const repostContentMap = new Map(repostsContentRes.data?.map(c => [c.post_id, c]));
  
  // Stats Maps
  const viewsMap = new Map(viewsRes.data?.map(v => [v.post_id, v.views]));
  
  // Manually count likes and comments per post since Supabase JS doesn't do group-by-count easily in one query
  const likesCountMap = new Map<string, number>();
  likesRes.data?.forEach(l => {
    likesCountMap.set(l.post_id, (likesCountMap.get(l.post_id) || 0) + 1);
  });
  
  const commentsCountMap = new Map<string, number>();
  commentsRes.data?.forEach(c => {
    commentsCountMap.set(c.post_id, (commentsCountMap.get(c.post_id) || 0) + 1);
  });

  // 4. Fetch profiles for ORIGINAL authors of reposted content
  let repostAuthorMap = new Map();
  if (repostsOriginalRes.data && repostsOriginalRes.data.length > 0) {
      const originalUserIds = Array.from(new Set(repostsOriginalRes.data.map(p => p.user_id)));
      const { data: originalProfiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", originalUserIds);
      repostAuthorMap = new Map(originalProfiles?.map(p => [p.id, p]));
  }

  const formattedPosts: (PostCardData & {
    slug?: string | null;
    verified?: boolean;
    created_at: string;
    user_id: string;
  })[] = posts.map((p) => {
    const content = p.post_content as { title?: string; description?: string; author_image?: string | null; slug?: string | null } | null;
    const profile = profileMap.get(p.user_id);

    // Construct Repost Node
    let repostNode = null;
    if (p.repost_of) {
        const originPost = repostOriginalMap.get(p.repost_of);
        const originContent = repostContentMap.get(p.repost_of);
        
        if (originPost && originContent) {
            const originProfile = repostAuthorMap.get(originPost.user_id);
            if (originProfile) {
                // Determine image from description simply
                const imgMatch = originContent.description?.match(/<img[^>]+src="([^">]+)"/);
                const firstImage = imgMatch ? imgMatch[1] : null;

                repostNode = {
                    id: p.repost_of,
                    slug: (originContent.slug || p.repost_of) as string,
                    title: originContent.title,
                    description: originContent.description,
                    author: originProfile.display_name,
                    authorImage: originProfile.avatar_url, // Using camelCase
                    date: new Date(originPost.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" }),
                    imageUrl: firstImage,
                    views: viewsMap.get(p.repost_of) || 0,
                    likes: likesCountMap.get(p.repost_of) || 0,
                    comments: commentsCountMap.get(p.repost_of) || 0
                };
            }
        }
    }

    return {
      id: p.id,
      user_id: p.user_id,
      author: profile?.display_name ?? "Anonim",
      authorImage: content?.author_image ?? profile?.avatar_url ?? null,
      title: content?.title ?? "(Tanpa judul)",
      description: content?.description ?? "",
      date: new Date(p.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      }),
      created_at: p.created_at,
      views: viewsMap.get(p.id) || 0,
      likes: likesCountMap.get(p.id) || 0,
      comments: commentsCountMap.get(p.id) || 0,
      slug: (content?.slug || p.id) as string,
      verified: profile?.verified ?? false,
      isRepost: !!p.repost_of,
      repost_of: repostNode
    };
  });

  return formattedPosts;
}
