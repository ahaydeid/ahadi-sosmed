"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Eye, Heart, MessageCircle } from "lucide-react";
import PostComments from "../../components/PostComments";

interface PostDetailData {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
  likes: number;
  comments: number;
  views: number;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;

      setLoading(true);

      // 1. Ambil data utama post
      const { data: postData, error: postError } = await supabase
        .from("post")
        .select("id, created_at, user_id")
        .eq("id", id)
        .single();

      if (postError || !postData) {
        console.error("Post not found:", postError?.message);
        setLoading(false);
        return;
      }

      // 2. Ambil konten post
      const { data: contentData, error: contentError } = await supabase
        .from("post_content")
        .select("title, description, image_url")
        .eq("post_id", id)
        .single();

      if (contentError) console.error("Error loading post_content:", contentError?.message);

      // 3. Ambil nama author
      const { data: profileData } = await supabase
        .from("user_profile")
        .select("display_name")
        .eq("id", postData.user_id)
        .single();

      // 4. Hitung likes, comments, views
      const [{ count: likesCount }, { count: commentsCount }, { count: viewsCount }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);

      // 5. Tambah view baru ke post_views
      await supabase.from("post_views").insert([{ post_id: id }]);

      // 6. Set data ke state
      setPost({
        id: postData.id,
        title: contentData?.title ?? "(Tanpa judul)",
        description: contentData?.description ?? "",
        author: profileData?.display_name ?? "Anonim",
        date: new Date(postData.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        }),
        likes: likesCount ?? 0,
        comments: commentsCount ?? 0,
        views: (viewsCount ?? 0) + 1, // langsung tambahkan 1 karena baru dilihat
      });

      setLoading(false);
    };

    fetchPost();
  }, [id]);

  if (loading || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Memuat postingan...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Judul */}
      <h1 className="text-2xl font-bold leading-snug mb-2">{post.title}</h1>

      {/* Tanggal */}
      <p className="text-sm text-gray-500 mb-3">{post.date}</p>

      {/* Info penulis */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-red-500 rounded-full" />
        <span className="text-sm font-semibold text-gray-800">{post.author}</span>
        <button className="text-sm font-semibold border border-purple-500 text-purple-500 rounded-full px-3 py-0.5 hover:bg-purple-50 transition">
          follow
        </button>
      </div>

      {/* Gambar placeholder */}
      <div className="w-full h-48 bg-gray-200 rounded mb-4" />

      {/* Isi artikel */}
      <div className="text-sm text-gray-700 leading-relaxed space-y-4 mb-6">
        <p>{post.description}</p>
      </div>

      {/* Statistik post */}
      <div className="flex items-center gap-4 border-gray-200 border rounded px-3 py-2 w-fit">
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <Eye className="w-4 h-4" />
          <span>{post.views}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <Heart className="w-4 h-4" />
          <span>{post.likes}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <MessageCircle className="w-4 h-4" />
          <span>{post.comments}</span>
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      <PostComments />
    </div>
  );
}
