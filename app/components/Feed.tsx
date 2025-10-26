"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "./TopBar";
import PostCard from "./PostCard";
import { supabase } from "@/lib/supabaseClient";
import { PostCardData } from "@/lib/types/post"; 


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
}

// 🛑 HAPUS DEKLARASI PostCardData DI SINI (sudah diimpor dari lib/types/post)

export default function Feed() {
  const [posts, setPosts] = useState<PostCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);

      // 1️⃣ Ambil post utama
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

      const typedPosts: PostRow[] = postData as PostRow[];
      const postIds = typedPosts.map((p) => p.id);
      const userIds = [...new Set(typedPosts.map((p) => p.user_id))];

      // 2️⃣ Ambil konten (title, description, image_url, author_image)
      const { data: contents, error: contentError } = await supabase.from("post_content").select("post_id, title, description, image_url, author_image").in("post_id", postIds);

      if (contentError) {
        console.error("Error loading post_content:", contentError.message);
      }

      const contentMap = new Map<string, PostContent>();
      (contents ?? []).forEach((c) => contentMap.set(c.post_id, c));

      // 3️⃣ Ambil profil user (display_name + avatar_url)
      const { data: profiles, error: profileError } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", userIds);

      if (profileError) {
        console.error("Error loading user_profile:", profileError.message);
      }

      const profileMap = new Map<string, UserProfile>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, p));

      // 4️⃣ Hitung jumlah likes, comments, dan views
      const formattedPosts: PostCardData[] = await Promise.all(
        typedPosts.map(async (p) => {
          const [likes, comments, views] = await Promise.all([
            supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", p.id),
            supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", p.id),
          ]);

          const content = contentMap.get(p.id);
          const author = profileMap.get(p.user_id);

          // 🛑 PENTING: Struktur objek ini HARUS sama persis dengan PostCardData yang diimpor
          return {
            id: p.id,
            author: author?.display_name ?? "Anonim",
            // authorImage: string | null (diharuskan oleh PostCardData)
            authorImage: content?.author_image ?? author?.avatar_url ?? null, 
            title: content?.title ?? "(Tanpa judul)",
            description: content?.description ?? "",
            // imageUrl: string | null (diharuskan oleh PostCardData)
            imageUrl: content?.image_url ?? null, 
            date: new Date(p.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            }),
            views: views.count ?? 0,
            likes: likes.count ?? 0,
            comments: comments.count ?? 0,
          } as PostCardData; // Menggunakan 'as PostCardData' untuk memastikan tipe data cocok
        })
      );

      setPosts(formattedPosts);
      setLoading(false);
    };

    loadFeed();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <div className="space-y-1">
        {loading && <p className="text-center py-5 text-gray-500">Memuat postingan...</p>}
        {!loading && posts.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada postingan</p>}
        {!loading &&
          posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="block transition hover:bg-gray-100">
              {/* FIX: Meneruskan objek 'post' yang sudah di-type dengan benar */}
              <PostCard post={post} />
            </Link>
          ))}
      </div>
    </div>
  );
}