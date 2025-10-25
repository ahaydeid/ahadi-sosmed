"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "./TopBar";
import PostCard from "./PostCard";
import { supabase } from "@/lib/supabaseClient";

interface PostContent {
  post_id: string;
  title: string | null;
  description: string | null;
}

interface UserProfile {
  id: string;
  display_name: string;
}

interface PostRow {
  id: string;
  created_at: string;
  user_id: string;
}

interface PostCardData {
  id: string;
  author: string;
  title: string;
  description: string;
  date: string;
  views: number;
  likes: number;
  comments: number;
}

export default function Feed() {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);

      // 1. Ambil post utama
      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id, visibility").eq("visibility", "public").order("created_at", { ascending: false });

      if (postError) {
        console.error("Error loading posts:", postError.message);
        setLoading(false);
        return;
      }

      if (!postData || postData.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const typedPosts: PostRow[] = postData as unknown as PostRow[];
      const postIds = typedPosts.map((p) => p.id);
      const userIds = [...new Set(typedPosts.map((p) => p.user_id))];

      // 2. Ambil konten (title, description)
      const { data: contents, error: contentError } = await supabase.from("post_content").select("post_id, title, description").in("post_id", postIds);

      if (contentError) {
        console.error("Error loading post_content:", contentError.message);
      }

      const contentMap = new Map<string, PostContent>();
      (contents ?? []).forEach((c) => contentMap.set(c.post_id, c));

      // 3. Ambil profil user
      const { data: profiles, error: profileError } = await supabase.from("user_profile").select("id, display_name").in("id", userIds);

      if (profileError) {
        console.error("Error loading user_profile:", profileError.message);
      }

      const profileMap = new Map<string, UserProfile>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, p));

      // 4. Hitung jumlah likes, comments, dan views
      const formattedPosts: PostCardData[] = await Promise.all(
        typedPosts.map(async (p) => {
          const [likes, comments, views] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const content = contentMap.get(p.id);
          const author = profileMap.get(p.user_id);

          return {
            id: p.id,
            author: author?.display_name ?? "Anonim",
            title: content?.title ?? "(Tanpa judul)",
            description: content?.description ?? "",
            date: new Date(p.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            }),
            views: views.count ?? 0,
            likes: likes.count ?? 0,
            comments: comments.count ?? 0,
          };
        })
      );

      setPosts(formattedPosts);
      setLoading(false);
    };

    loadFeed();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
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
