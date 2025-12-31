"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { incrementPostViews } from "@/lib/actions/incrementViews";
import { PostCardData } from "@/lib/types/post";
import PostCard from "./PostCard";

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

  const [posts, setPosts] = useState<
    (PostCardData & {
      slug?: string | null;
      verified?: boolean;
      created_at: string;
      user_id?: string;
      score?: number;
    })[]
  >([]);
  const [penaltyTick, setPenaltyTick] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dengarkan event collapse
  useEffect(() => {
    const onPenalize = () => setPenaltyTick((n) => n + 1);
    window.addEventListener("post:penalize", onPenalize as EventListener);
    return () => window.removeEventListener("post:penalize", onPenalize as EventListener);
  }, []);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      let filtered = [...initialPosts];

      // === FILTER TAB "DIIKUTI" ===
      if (tab === "followed") {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;

        if (!uid) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // 1. Ambil semua user yang diikuti oleh user ini
        const { data: follows, error: folErr } = await supabase
          .from("user_followers")
          .select("following_id")
          .eq("follower_id", uid);

        if (folErr) {
          console.error("Error ambil data follow:", folErr.message);
          setPosts([]);
          setLoading(false);
          return;
        }

        const followingIds = (follows ?? []).map((f) => String(f.following_id));

        if (followingIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // 2. Ambil postingan terbaru dari user yang diikuti langsung dari database
        const { data: followedPosts, error: feedErr } = await supabase
          .from("post")
          .select("id, created_at, user_id, visibility")
          .in("user_id", followingIds)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(100);

        if (feedErr || !followedPosts) {
          console.error("Error ambil followed feed:", feedErr?.message);
          setPosts([]);
          setLoading(false);
          return;
        }

        // 3. Ambil konten untuk postingan tersebut
        const postIds = followedPosts.map(p => p.id);
        const { data: contents } = await supabase
          .from("post_content")
          .select("post_id, title, description, author_image, slug")
          .in("post_id", postIds);
        
        const { data: profiles } = await supabase
          .from("user_profile")
          .select("id, display_name, avatar_url, verified")
          .in("id", followingIds);

        const contentMap = new Map(contents?.map((c) => [c.post_id, c]));
        const profileMap = new Map(profiles?.map((p) => [p.id, p]));

        filtered = followedPosts.map((p) => {
          const content = contentMap.get(p.id);
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
      }

      // === COLLAPSE STATE ===
      let collapsedSet = new Set<string>();
      try {
        const raw = localStorage.getItem(COLLAPSE_KEY);
        collapsedSet = new Set(raw ? JSON.parse(raw) : []);
      } catch {
        collapsedSet = new Set();
      }

      // === SCORING & SORTING ===
      const now = Date.now();

      const enriched = await Promise.all(
        filtered.map(async (p) => {
          const [viewsRes, likesRes, commentsRes] = await Promise.all([
            supabase.from("post_views").select("views").eq("post_id", p.id).maybeSingle(),
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("liked", true),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const v = viewsRes?.data?.views ?? 0;
          const l = likesRes?.count ?? 0;
          const c = commentsRes?.count ?? 0;

          const createdMs = Date.parse(p.created_at) || now;
          const hours = Math.max(0, (now - createdMs) / 3_600_000);
          const timeBoost = BASE_TIME_BOOST * Math.pow(TIME_DECAY_PER_HOUR, hours);

          let score = v * WEIGHTS.view + l * WEIGHTS.like + c * WEIGHTS.comment + timeBoost;
          if (collapsedSet.has(p.id)) score -= PENALTY_VALUE;

          return { ...p, views: v, likes: l, comments: c, score };
        })
      );

      enriched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      setPosts(enriched);
      setLoading(false);
    };

    loadFeed();
  }, [initialPosts, penaltyTick, tab]);

  if (loading) return <p className="text-center py-5 text-gray-500">Memuat…</p>;
  if (!posts || posts.length === 0) return <p className="text-center py-5 text-gray-500">Belum ada postingan</p>;

  return (
    <div className="space-y-1 md:py-2 md:px-3">
      {posts.map((post) => (
        <Link key={post.id} href={{ pathname: `/post/${post.slug ?? post.id}` }} className="block transition hover:bg-gray-100" onClick={() => incrementPostViews(post.id)}>
          <PostCard post={post} />
        </Link>
      ))}
    </div>
  );
}
