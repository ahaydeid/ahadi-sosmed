"use server";

import { createClient } from "@/lib/supabase/server";
import { PostCardData } from "@/lib/types/post";

export async function getPublicPosts(limit = 10, offset = 0, sortBy: 'latest' | 'popular' = 'latest') {
  const supabase = await createClient();

  // 1. Fetch posts with denormalized counts
  let query = supabase
    .from("post")
    .select(`
      id, 
      created_at, 
      user_id, 
      visibility,
      repost_of,
      likes_count,
      comments_count,
      views_count,
      post_content ( title, description, author_image, slug )
    `)
    .eq("visibility", "public");

  if (sortBy === 'popular') {
    query = query.order('views_count', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: posts, error } = await query.range(offset, offset + limit - 1);

  if (error || !posts) {
    throw new Error(error?.message || "Gagal memuat postingan");
  }

  // 2. Identify remaining data needed (Profiles & Reposts)
  const userIds = new Set(posts.map(p => p.user_id).filter(Boolean) as string[]);
  const repostIds = posts.map(p => p.repost_of).filter(Boolean) as string[];
  
  const [profilesRes, repostsInfoRes, parsingUtils] = await Promise.all([
    supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", Array.from(userIds)),
    repostIds.length > 0 ? supabase.from("post").select(`
        id, created_at, user_id,
        likes_count, comments_count, views_count,
        post_content ( title, description, author_image, slug )
    `).in("id", repostIds) : Promise.resolve({ data: [] }),
    import("@/lib/utils/html")
  ]);

  const { extractPreviewText, extractFirstImage } = parsingUtils;
  const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]));
  const repostDataMap = new Map(repostsInfoRes.data?.map((p: any) => [p.id, p]));

  // 3. Fetch profiles for repost authors if missing
  const repostUserIds = Array.from(new Set(repostsInfoRes.data?.map((p: any) => p.user_id).filter((id: string) => id && !profileMap.has(id)) || [])) as string[];
  if (repostUserIds.length > 0) {
      const { data: extraProfiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", repostUserIds);
      extraProfiles?.forEach(p => profileMap.set(p.id, p));
  }

  const formattedPosts = posts.map((p: any) => {
    const content = p.post_content;
    const authorProf = profileMap.get(p.user_id);
    
    let repostNode = null;
    if (p.repost_of) {
        const origin = repostDataMap.get(p.repost_of);
        if (origin) {
            const originContent = origin.post_content;
            const originAuthor = profileMap.get(origin.user_id);
            if (originContent && originAuthor) {
                repostNode = {
                    id: p.repost_of,
                    slug: (originContent.slug || p.repost_of) as string,
                    title: originContent.title,
                    description: originContent.description,
                    excerpt: extractPreviewText(originContent.description),
                    imageUrl: extractFirstImage(originContent.description),
                    author: originAuthor.display_name,
                    authorImage: originContent.author_image || originAuthor.avatar_url,
                    date: new Date(origin.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long" }),
                    views: origin.views_count || 0,
                    likes: origin.likes_count || 0,
                    comments: origin.comments_count || 0
                };
            }
        }
    }

    const description = content?.description ?? "";
    return {
      id: p.id,
      user_id: p.user_id,
      author: authorProf?.display_name ?? "Anonim",
      authorImage: content?.author_image ?? authorProf?.avatar_url ?? null,
      title: content?.title ?? "(Tanpa judul)",
      description: description,
      excerpt: extractPreviewText(description),
      imageUrl: extractFirstImage(description),
      date: new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      created_at: p.created_at,
      views: p.views_count || 0,
      likes: p.likes_count || 0,
      comments: p.comments_count || 0,
      slug: (content?.slug || p.id) as string,
      verified: authorProf?.verified ?? false,
      isRepost: !!p.repost_of,
      repost_of: repostNode
    };
  });

  return formattedPosts as (PostCardData & { verified: boolean; created_at: string; user_id: string })[];
}
