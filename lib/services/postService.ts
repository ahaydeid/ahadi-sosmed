"use server";

import { createClient } from "@/lib/supabase/server";
import { PostCardData } from "@/lib/types/post";

export async function getPublicPosts(limit = 100) {
  const supabase = await createClient();

  // 1. Fetch posts and contents in one join (this relationship exists)
  const { data: posts, error } = await supabase
    .from("post")
    .select(`
      id, 
      created_at, 
      user_id, 
      visibility,
      post_content ( title, description, author_image, slug )
    `)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !posts) {
    throw new Error(error?.message || "Gagal memuat postingan");
  }

  // 2. Fetch profiles in parallel for performance
  const userIds = Array.from(new Set(posts.map((p) => p.user_id).filter(Boolean)));
  const { data: profiles } = await supabase
    .from("user_profile")
    .select("id, display_name, avatar_url, verified")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const formattedPosts: (PostCardData & {
    slug?: string | null;
    verified?: boolean;
    created_at: string;
    user_id: string;
  })[] = posts.map((p) => {
    const content = p.post_content as { title?: string; description?: string; author_image?: string | null; slug?: string | null } | null;
    const profile = profileMap.get(p.user_id);

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
      views: 0,
      likes: 0,
      comments: 0,
      slug: content?.slug ?? null,
      verified: profile?.verified ?? false,
    };
  });

  return formattedPosts;
}
