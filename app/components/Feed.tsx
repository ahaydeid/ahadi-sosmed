"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { PostCardData } from "@/lib/types/post";
import PostCard from "./PostCard";
import { PostSkeleton } from "./Skeleton";
import { getPublicPosts } from "@/lib/services/postService";

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

  const [rawPosts, setRawPosts] = useState<(PostCardData & { created_at: string })[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [penaltyTick, setPenaltyTick] = useState(0);
  const [isFollowedLoading, setIsFollowedLoading] = useState(false);
  
  const observerTarget = useRef(null);

  // Initialize or Reset
  useEffect(() => {
    if (tab === "teratas") {
      setRawPosts(initialPosts);
      setOffset(initialPosts.length);
      setHasMore(initialPosts.length >= 10);
    } else {
      setRawPosts([]);
      setOffset(0);
      setHasMore(true);
      fetchFollowed(0);
    }
  }, [tab, initialPosts]);

  const fetchFollowed = async (currentOffset: number) => {
    if (isFollowedLoading) return;
    setIsFollowedLoading(true);
    
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      if (!uid) {
        setHasMore(false);
        return;
      }

      const { data: follows } = await supabase.from("user_followers").select("following_id").eq("follower_id", uid);
      const followingIds = (follows ?? []).map((f) => String(f.following_id));
      if (followingIds.length === 0) {
        setHasMore(false);
        return;
      }

      const { data: followedPosts } = await supabase
        .from("post")
        .select("id, created_at, user_id, visibility, repost_of")
        .in("user_id", followingIds)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + 9);

      if (!followedPosts || followedPosts.length === 0) {
        setHasMore(false);
        return;
      }

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

      let repostAuthorMap = new Map();
      if (repostsOriginalRes.data && repostsOriginalRes.data.length > 0) {
          const originalUserIds = Array.from(new Set(repostsOriginalRes.data.map((p: any) => p.user_id)));
          const { data: originalProfiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", originalUserIds);
          repostAuthorMap = new Map(originalProfiles?.map(p => [p.id, p]));
      }

      const nextPosts = followedPosts.map((p) => {
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
                     repostNode = {
                        id: p.repost_of,
                        slug: originContent.slug ?? p.repost_of,
                        title: originContent.title,
                        description: originContent.description,
                        author: originProfile.display_name,
                        authorImage: originProfile.avatar_url,
                        date: new Date(originPost.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
                        imageUrl: imgMatch ? imgMatch[1] : null,
                        views: 0, likes: 0, comments: 0
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
          views: 0, likes: 0, comments: 0,
          slug: content?.slug ?? p.id,
          verified: profile?.verified ?? false,
          isRepost: !!p.repost_of,
          repost_of: repostNode
        };
      });

      setRawPosts(prev => [...prev, ...nextPosts]);
      setOffset(prev => prev + followedPosts.length);
      if (followedPosts.length < 10) setHasMore(false);

    } catch (e) {
      console.error(e);
    } finally {
      setIsFollowedLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      if (tab === "teratas") {
        const nextPosts = await getPublicPosts(10, offset, 'popular');
        if (nextPosts.length === 0) {
          setHasMore(false);
        } else {
          setRawPosts(prev => [...prev, ...nextPosts]);
          setOffset(prev => prev + nextPosts.length);
          if (nextPosts.length < 10) setHasMore(false);
        }
      } else {
        await fetchFollowed(offset);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tab, offset, hasMore, isLoadingMore]);

  // Observer Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isFollowedLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore, isFollowedLoading]);

  // Scoring logic
  const posts = useMemo(() => {
    let collapsedSet = new Set<string>();
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      collapsedSet = new Set(raw ? JSON.parse(raw) : []);
    } catch { }

    const now = Date.now();
    const enriched = rawPosts.map((p) => {
        const v = p.views || 0;
        const l = p.likes || 0;
        const c = p.comments || 0;
        const hours = Math.max(0, (now - (Date.parse(p.created_at) || now)) / 3_600_000);
        const timeBoost = BASE_TIME_BOOST * Math.pow(TIME_DECAY_PER_HOUR, hours);

        let score = v * WEIGHTS.view + l * WEIGHTS.like + c * WEIGHTS.comment + timeBoost;
        if (collapsedSet.has(p.id)) score -= PENALTY_VALUE;

        return { ...p, score };
    });

    return enriched;
  }, [rawPosts, penaltyTick, tab]);

  // Dengarkan event collapse
  useEffect(() => {
    const onPenalize = () => setPenaltyTick((n) => n + 1);
    window.addEventListener("post:penalize", onPenalize as EventListener);
    return () => window.removeEventListener("post:penalize", onPenalize as EventListener);
  }, []);

  const initialLoading = tab === "followed" && rawPosts.length === 0 && isFollowedLoading;

  if (initialLoading) return (
    <div className="flex flex-col w-full">
      <PostSkeleton />
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );

  if (posts.length === 0 && !isFollowedLoading) return <p className="text-center py-5 text-gray-500">Belum ada postingan</p>;

  return (
    <div className="space-y-1 md:space-y-3 md:px-0">
      {posts.map((post) => (
        <Link key={`${post.id}-${tab}`} href={{ pathname: `/post/${post.slug ?? post.id}` }} className="block transition hover:bg-gray-100">
          <PostCard post={post} />
        </Link>
      ))}
      
      {/* Trigger lazy load */}
      <div ref={observerTarget} className="h-10 flex items-center justify-center">
        {(isLoadingMore || isFollowedLoading) && (
          <div className="w-full">
            <PostSkeleton />
          </div>
        )}
      </div>

      {!hasMore && posts.length > 0 && (
        <p className="text-center py-5 text-xs text-gray-400">Kamu telah mencapai akhir</p>
      )}
    </div>
  );
}

