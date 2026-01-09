"use server";

import { createClient } from "@/lib/supabase/server";

export async function getRagePosts() {
  const supabase = await createClient();

  // 1. Fetch posts with pre-calculated totals from triggers
  const { data: postsData, error: postError } = await supabase
    .from("rage_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (postError || !postsData) {
    throw new Error(postError?.message || "Gagal memuat posts marah-marah");
  }

  // 2. Fetch profiles only for those who posted
  const deviceIds = Array.from(new Set(postsData.map(p => p.device_id).filter(Boolean)));
  const { data: profilesData } = await supabase
    .from("rage_profiles")
    .select("device_id, nickname, icon_name, bg_color")
    .in("device_id", deviceIds);

  // 3. Optimized Top Reacts (fetching subset for current posts)
  const postIds = postsData.map(p => p.id);
  const { data: reactsData } = await supabase
    .from("rage_reacts")
    .select("rage_post_id, emoji, device_id")
    .in("rage_post_id", postIds);

  const merged = postsData.map((post) => {
    const postReacts = reactsData?.filter((r) => r.rage_post_id === post.id) || [];

    const emojiCount: Record<string, number> = {};
    postReacts.forEach((r) => {
      emojiCount[r.emoji] = (emojiCount[r.emoji] || 0) + 1;
    });

    const topReacts = Object.entries(emojiCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([emoji]) => emoji);

    return {
      ...post,
      top_reacts: topReacts,
      // total_react and total_comment are already in 'post' thanks to triggers
    };
  });

  return {
    posts: merged,
    profiles: profilesData || [],
    reacts: reactsData || [] // For checking if current user reacted
  };
}
