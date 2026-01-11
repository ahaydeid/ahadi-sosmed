"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { incrementPostViews } from "@/lib/actions/incrementViews";
import { PostCardData } from "@/lib/types/post";
import PostCard from "./PostCard";
import { PostSkeleton } from "./Skeleton";

interface FeedProps {
  initialPosts: (PostCardData & {
    slug?: string | null;
    verified?: boolean;
    created_at: string;
    user_id?: string;
  })[];
}

const COLLAPSE_KEY = "collapsedPosts";
const WEIGHTS = { view: 2, like: 20, comment: 50 };
const BASE_TIME_BOOST = 300;
const TIME_DECAY_PER_HOUR = 0.985;
const PENALTY_VALUE = 100;

export default function Feed({ initialPosts }: FeedProps) {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "teratas" | "followed") || "teratas";

  const [penaltyTick, setPenaltyTick] = useState(0);

  // Key untuk SWR, berubah kalau tab atau penalty berubah
  const swrKey = `feed-${tab}-${penaltyTick}`;

  const { data: postsData, isLoading: swrLoading } = useSWR(swrKey, async () => {
    let filtered = [...initialPosts];

    // === FILTER TAB "DIIKUTI" ===
    if (tab === "followed") {
      // ... followed tab logic remains similar but could be optimized later
      // For now, let's keep it but ensure it doesn't do the individual stat fetching loop
      // (I'll keep the existing followed logic for now but skip the loop)
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      if (!uid) return [];

      const { data: follows } = await supabase.from("user_followers").select("following_id").eq("follower_id", uid);
      const followingIds = (follows ?? []).map((f) => String(f.following_id));
      if (followingIds.length === 0) return [];

      // Note: This followed tab should also ideally be moved to a server action 
      // to benefit from bulk fetching. But for now we just optimize the loop.
      const { data: followedPosts } = await supabase
        .from("post")
        .select("id, created_at, user_id, visibility, repost_of")
        .in("user_id", followingIds)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!followedPosts) return [];

      const postIds = followedPosts.map(p => p.id);
      const repostIds = followedPosts.map(p => p.repost_of).filter(Boolean);

      const [contentsRes, profilesRes, repostsOriginalRes, repostsContentRes] = await Promise.all([
        supabase.from("post_content").select("post_id, title, description, author_image, slug").in("post_id", postIds),
        supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", followingIds),
        repostIds.length > 0 ? supabase.from("post").select("id, created_at, user_id").in("id", repostIds) : Promise.resolve({ data: [] }),
        repostIds.length > 0 ? supabase.from("post_content").select("post_id, title, description, author_image, slug").in("post_id", repostIds) : Promise.resolve({ data: [] })
      ]);

      const contentMap = new Map(contentsRes.data?.map((c) => [c.post_id, c]));
      const profileMap = new Map(profilesRes.data?.map((p) => [p.id, p]));
      
      const repostOriginalMap = new Map(repostsOriginalRes.data?.map(p => [p.id, p]));
      const repostContentMap = new Map(repostsContentRes.data?.map(c => [c.post_id, c]));

      // Fetch profiles for ORIGINAL authors of reposted content
      let repostAuthorMap = new Map();
      if (repostsOriginalRes.data && repostsOriginalRes.data.length > 0) {
          const originalUserIds = Array.from(new Set(repostsOriginalRes.data.map((p: any) => p.user_id)));
          const { data: originalProfiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", originalUserIds);
          repostAuthorMap = new Map(originalProfiles?.map(p => [p.id, p]));
      }

      filtered = followedPosts.map((p) => {
        const content = contentMap.get(p.id);
        const profile = profileMap.get(p.user_id);

        let repostNode = null;
        if (p.repost_of) {
            const originPost = repostOriginalMap.get(p.repost_of);
            const originContent = repostContentMap.get(p.repost_of);
            if (originPost && originContent) {
                const originProfile: any = repostAuthorMap.get(originPost.user_id);
                if (originProfile) {
                     const imgMatch = originContent.description?.match(/<img[^>]+src="([^">]+)"/);
                     const firstImage = imgMatch ? imgMatch[1] : null;
                     repostNode = {
                        id: p.repost_of,
                        slug: originContent.slug ?? p.repost_of,
                        title: originContent.title,
                        description: originContent.description,
                        author: originProfile.display_name,
                        authorImage: originProfile.avatar_url,
                        date: new Date(originPost.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
                        imageUrl: firstImage,
                        views: 0,
                        likes: 0,
                        comments: 0
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
          date: new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
          created_at: p.created_at,
          views: 0,
          likes: 0,
          comments: 0,
          slug: content?.slug ?? p.id,
          verified: profile?.verified ?? false,
          isRepost: !!p.repost_of,
          repost_of: repostNode
        };
      });
    }

    // === COLLAPSE STATE, SCORING & SORTING ===
    let collapsedSet = new Set<string>();
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      collapsedSet = new Set(raw ? JSON.parse(raw) : []);
    } catch { }

    const now = Date.now();
    // NO MORE Promise.all LOOP HERE
    const enriched = filtered.map((p) => {
        const v = p.views || 0;
        const l = p.likes || 0;
        const c = p.comments || 0;
        const hours = Math.max(0, (now - (Date.parse(p.created_at) || now)) / 3_600_000);
        const timeBoost = BASE_TIME_BOOST * Math.pow(TIME_DECAY_PER_HOUR, hours);

        let score = v * WEIGHTS.view + l * WEIGHTS.like + c * WEIGHTS.comment + timeBoost;
        if (collapsedSet.has(p.id)) score -= PENALTY_VALUE;

        return { ...p, score };
    });

    return enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }, {
    fallbackData: tab === "teratas" ? initialPosts.map(p => ({ ...p, score: 0 })) : undefined,
    revalidateOnFocus: false,
    revalidateOnMount: false, // Trust fallbackData (initialPosts) on first mount
    dedupingInterval: 60000 // Cache for 1 minute
  });

  const posts = postsData || [];
  const loading = swrLoading && posts.length === 0;

  // Dengarkan event collapse
  useEffect(() => {
    const onPenalize = () => setPenaltyTick((n) => n + 1);
    window.addEventListener("post:penalize", onPenalize as EventListener);
    return () => window.removeEventListener("post:penalize", onPenalize as EventListener);
  }, []);


  if (loading) return (
    <div className="flex flex-col w-full">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
  if (!posts || posts.length === 0) return <p className="text-center py-5 text-gray-500">Belum ada postingan</p>;

  return (
    <div className="space-y-1 md:space-y-3 md:px-0">
      {posts.map((post) => (
        <Link key={post.id} href={{ pathname: `/post/${post.slug ?? post.id}` }} className="block transition hover:bg-gray-100" onClick={() => incrementPostViews(post.id)}>
          <PostCard post={post} />
        </Link>
      ))}
    </div>
  );
}
