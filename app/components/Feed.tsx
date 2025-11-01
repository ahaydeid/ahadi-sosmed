"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseClientBrowser";
import { incrementPostViews } from "@/lib/actions/incrementViews";
import { PostCardData } from "@/lib/types/post";
import PostCard from "./PostCard";

interface FeedProps {
  initialPosts: (PostCardData & {
    slug?: string | null;
    verified?: boolean;
    created_at: string;
  })[];
}

const COLLAPSE_KEY = "collapsedPosts";
const WEIGHTS = { view: 2, like: 20, comment: 50 };
const BASE_TIME_BOOST = 300; // boost awal untuk post baru
const TIME_DECAY_PER_HOUR = 0.985; // decay lembut per jam
const PENALTY_VALUE = 100;

export default function Feed({ initialPosts }: FeedProps) {
  const [posts, setPosts] = useState<
    (PostCardData & {
      slug?: string | null;
      verified?: boolean;
      created_at: string;
      score?: number;
    })[]
  >(initialPosts);

  const [penaltyTick, setPenaltyTick] = useState(0);

  // Dengarkan tombol ❌ dari PostCard
  useEffect(() => {
    const onPenalize = () => setPenaltyTick((n) => n + 1);
    window.addEventListener("post:penalize", onPenalize as EventListener);
    return () => window.removeEventListener("post:penalize", onPenalize as EventListener);
  }, []);

  useEffect(() => {
    const loadAndRank = async () => {
      if (!initialPosts || initialPosts.length === 0) return;

      // baca collapse set
      let collapsedSet = new Set<string>();
      try {
        const raw = localStorage.getItem(COLLAPSE_KEY);
        const arr: string[] = raw ? JSON.parse(raw) : [];
        collapsedSet = new Set(arr);
      } catch {
        collapsedSet = new Set();
      }

      const now = Date.now();

      // ambil stats, hitung score, lalu urutkan
      const enriched = await Promise.all(
        initialPosts.map(async (p) => {
          const [viewsRes, likesRes, commentsRes] = await Promise.all([
            supabaseBrowser.from("post_views").select("views").eq("post_id", p.id).maybeSingle(),
            supabaseBrowser.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("liked", true),
            supabaseBrowser.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const v = viewsRes?.data?.views ?? 0;
          const l = likesRes?.count ?? 0;
          const c = commentsRes?.count ?? 0;

          // time boost: post baru tinggi, lalu meluruh per jam
          const createdMs = Number.isFinite(Date.parse(p.created_at)) ? new Date(p.created_at).getTime() : now;
          const hours = Math.max(0, (now - createdMs) / 3_600_000);
          const timeBoost = BASE_TIME_BOOST * Math.pow(TIME_DECAY_PER_HOUR, hours);

          let score = v * WEIGHTS.view + l * WEIGHTS.like + c * WEIGHTS.comment + timeBoost;
          if (collapsedSet.has(p.id)) score -= PENALTY_VALUE;

          return { ...p, views: v, likes: l, comments: c, score };
        })
      );

      // sort: score desc, tie-breaker created_at desc (lebih baru di atas)
      enriched.sort((a, b) => {
        const sa = a.score ?? 0;
        const sb = b.score ?? 0;
        if (sb !== sa) return sb - sa;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPosts(enriched);
    };

    loadAndRank();
  }, [initialPosts, penaltyTick]);

  if (!posts || posts.length === 0) {
    return <p className="text-center py-5 text-gray-500">Belum ada postingan</p>;
  }

  return (
    <div className="space-y-1">
      {posts.map((post) => (
        <Link key={post.id} href={{ pathname: `/post/${post.slug ?? post.id}` }} className="block transition hover:bg-gray-100" onClick={() => incrementPostViews(post.id)}>
          <PostCard post={post} />
        </Link>
      ))}
    </div>
  );
}
