"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import TopBar from "./TopBar";
import PostCard from "./PostCard";
import { supabase } from "@/lib/supabaseClient";
import { PostCardData } from "@/lib/types/post";
import { useSearchParams } from "next/navigation";

interface PostContent {
  post_id: string;
  title: string | null;
  description: string | null;
  image_url?: string | null;
  author_image?: string | null;
}
interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}
interface PostRow {
  id: string;
  created_at: string;
  user_id: string;
  visibility?: string | null;
}

const COLLAPSE_KEY = "collapsedPosts";

function FeedInner() {
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "teratas" | "followed") || "teratas";

  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [penaltyTick, setPenaltyTick] = useState(0); // trigger re-load saat ada penalize

  // Dengarkan event dari PostCard
  useEffect(() => {
    const onPenalize = () => setPenaltyTick((n) => n + 1);
    window.addEventListener("post:penalize", onPenalize as EventListener);
    return () => window.removeEventListener("post:penalize", onPenalize as EventListener);
  }, []);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);

      // Ambil session untuk tab "followed"
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;

      // 1) Ambil semua post publik
      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id, visibility").eq("visibility", "public");

      if (postError) {
        console.error("Error loading posts:", postError.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      let typed: PostRow[] = (postData ?? []) as PostRow[];

      // 2) Jika tab=followed → filter ke author yang diikuti
      if (tab === "followed") {
        if (!uid) {
          setPosts([]);
          setLoading(false);
          return;
        }
        const { data: follows, error: folErr } = await supabase.from("user_followers").select("following_id").eq("follower_id", uid);

        if (folErr) {
          console.error("Error loading followers:", folErr.message);
          setPosts([]);
          setLoading(false);
          return;
        }

        const followingIds = new Set((follows ?? []).map((f) => f.following_id as string));
        typed = typed.filter((p) => followingIds.has(p.user_id));
      }

      if (typed.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = typed.map((p) => p.id);
      const userIds = [...new Set(typed.map((p) => p.user_id))];

      // 3) Konten
      const { data: contents, error: contentError } = await supabase.from("post_content").select("post_id, title, description, image_url, author_image").in("post_id", postIds);

      if (contentError) console.error("Error loading post_content:", contentError.message);

      const contentMap = new Map<string, PostContent>();
      (contents ?? []).forEach((c) => contentMap.set(c.post_id, c));

      // 4) Profil
      const { data: profiles, error: profileError } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", userIds);

      if (profileError) console.error("Error loading user_profile:", profileError.message);

      const profileMap = new Map<string, UserProfile>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, p));

      // 5) Baca penalti lokal
      let collapsedSet = new Set<string>();
      try {
        const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSE_KEY) : null;
        const arr: string[] = raw ? JSON.parse(raw) : [];
        collapsedSet = new Set(arr);
      } catch {
        collapsedSet = new Set();
      }

      // 6) Metrik + skor (SAMA untuk kedua tab), minus penalti
      const now = Date.now();
      const WEIGHTS = { time: 10, views: 1, likes: 2, comments: 2 };
      const PENALTY_VALUE = 100; // dikurangi 100

      const scored = await Promise.all(
        typed.map(async (p) => {
          const [likes, comments, views] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id).eq("liked", true),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const v = views.count ?? 0;
          const l = likes.count ?? 0;
          const c = comments.count ?? 0;

          const ageHours = Math.max(0, (now - new Date(p.created_at).getTime()) / 3600000);
          const timeScore = 1 / (1 + ageHours); // 0..1
          let score = WEIGHTS.time * timeScore + WEIGHTS.views * v + WEIGHTS.likes * l + WEIGHTS.comments * c;

          // Terapkan penalti jika post dicollapse secara lokal
          if (collapsedSet.has(p.id)) {
            score -= PENALTY_VALUE;
          }

          const content = contentMap.get(p.id);
          const author = profileMap.get(p.user_id);

          const post: PostCardData = {
            id: p.id,
            author: author?.display_name ?? "Anonim",
            authorImage: content?.author_image ?? author?.avatar_url ?? null,
            title: content?.title ?? "(Tanpa judul)",
            description: content?.description ?? "",
            imageUrl: content?.image_url ?? null,
            date: new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
            views: v,
            likes: l,
            comments: c,
          };

          return { score, post };
        })
      );

      // 7) Urutkan berdasarkan score desc
      const sorted = [...scored].sort((a, b) => b.score - a.score).map((x) => x.post);
      setPosts(sorted);
      setLoading(false);
    };

    loadFeed();
  }, [tab, penaltyTick]); // reload saat tab berubah atau ada penalize

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="space-y-1">
        {loading && <p className="text-center py-5 text-gray-500">Memuat postingan...</p>}
        {!loading && posts.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada postingan</p>}
        {!loading &&
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="block transition hover:bg-gray-100">
              <PostCard post={post} />
            </Link>
          ))}
      </div>
    </div>
  );
}

export default function Feed() {
  // Suspense untuk aman dari useSearchParams (Next 16)
  return (
    <Suspense fallback={<div className="text-center py-5 text-gray-500">Memuat…</div>}>
      <FeedInner />
    </Suspense>
  );
}
