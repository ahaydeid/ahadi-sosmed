"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Star, Eye, Heart, MessageCircle, ChevronLeft, Share2 } from "lucide-react";
import Image from "next/image";
import PostComments from "../../components/PostComments";
import CommentInput from "@/app/components/CommentInput";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";

/**
 * Memformat tanggal menjadi "28 Okt" (jika tahun yang sama) atau "28 Okt 2024" (jika tahun berbeda).
 */
const formatPostDate = (dateString: string): string => {
  const postDate = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const postYear = postDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (postYear !== currentYear) options.year = "numeric";
  return postDate.toLocaleDateString("id-ID", options).replace(/,$/, "").trim();
};

interface PostDetailData {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  author: string;
  author_image?: string | null;
  date: string;
  likes: number;
  comments: number;
  views: number;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<PostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasApresiasi, setHasApresiasi] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // 🔹 Ambil user login
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    };
    getUser();
  }, []);

  // 🔹 Ambil data post
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);

      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id").eq("id", id).single();

      if (postError || !postData) {
        setLoading(false);
        return;
      }

      const { data: contentData } = await supabase.from("post_content").select("title, description, image_url, author_image").eq("post_id", id).single();

      const { data: profileData } = await supabase.from("user_profile").select("display_name").eq("id", postData.user_id).single();

      const [{ count: likesCount }, { count: commentsCount }, { count: viewsCount }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id).eq("liked", true),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);

      await supabase.from("post_views").insert([{ post_id: id }]);

      setPost({
        id: postData.id,
        title: contentData?.title ?? "(Tanpa judul)",
        description: contentData?.description ?? "",
        image_url: contentData?.image_url ?? null,
        author: profileData?.display_name ?? "Anonim",
        author_image: contentData?.author_image ?? null,
        date: formatPostDate(postData.created_at),
        likes: likesCount ?? 0,
        comments: commentsCount ?? 0,
        views: (viewsCount ?? 0) + 1,
      });

      setLikeCount(likesCount ?? 0);
      setLoading(false);
    };

    fetchPost();
  }, [id]);

  // 🔹 Cek apakah user sudah apresiasi post ini
  useEffect(() => {
    const checkApresiasi = async () => {
      if (!user || !id) return;

      const { data } = await supabase.from("post_likes").select("liked").eq("post_id", id).eq("user_id", user.id).maybeSingle();

      setHasApresiasi(data?.liked === true);
    };

    checkApresiasi();
  }, [user, id]);

  // 🔹 Toggle apresiasi
  const handleApresiasi = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Cek apakah sudah ada record
    const { data: existing } = await supabase.from("post_likes").select("liked").eq("post_id", id).eq("user_id", user.id).maybeSingle();

    if (!existing) {
      // Belum ada → insert baru
      await supabase.from("post_likes").insert([{ post_id: id, user_id: user.id, liked: true }]);
      setHasApresiasi(true);
      setLikeCount((prev) => prev + 1);
      return;
    }

    // Sudah ada → toggle
    const newLiked = !existing.liked;
    await supabase.from("post_likes").update({ liked: newLiked }).eq("post_id", id).eq("user_id", user.id);

    setHasApresiasi(newLiked);
    setLikeCount((prev) => prev + (newLiked ? 1 : -1));
  };

  if (loading || !post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat postingan...</div>;
  }

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-10 flex items-center px-4 -mx-4">
        <button onClick={() => window.history.back()} className="absolute left-4 rounded-full hover:bg-gray-100 transition z-20" aria-label="Kembali">
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-base text-gray-800 truncate">Tulisan {post.author}</h2>
        </div>
      </div>

      {/* Judul & Meta */}
      <h1 className="text-2xl mt-5 font-bold leading-snug mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-3">{post.date}</p>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
          {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
        </div>
        <span className="text-sm font-semibold text-gray-800">{post.author}</span>
        <button className="text-sm font-semibold border border-sky-500 text-sky-500 rounded-full px-3 py-0.5 hover:bg-sky-50 transition">follow</button>
      </div>

      {/* Gambar Post */}
      {post.image_url && (
        <div className="w-full rounded-md overflow-hidden mb-4 flex justify-center">
          <Image src={post.image_url} alt={post.title} width={800} height={400} className="object-contain w-auto h-auto max-w-full rounded-md" />
        </div>
      )}

      {/* Isi Artikel */}
      <div className="text-base text-justify text-gray-700 leading-relaxed space-y-4 mb-6 prose max-w-none">
        <ReactMarkdown>{post.description}</ReactMarkdown>
      </div>

      {/* Tombol Apresiasi */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleApresiasi}
          className={`text-sm px-3 py-2 rounded flex items-center gap-1 border transition
            ${hasApresiasi ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
        >
          <Star className="w-4 h-4" />
          {hasApresiasi ? "diapresiasi" : "apresiasi"}
        </button>

        {/* Statistik */}
        <div className="flex items-center gap-3 border-gray-200 border rounded px-3 py-2 w-fit">
          <div className="flex items-center gap-1 text-gray-700 text-sm">
            <Eye className="w-4 h-4" />
            <span>{post.views}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
            <Heart className="w-4 h-4" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </div>
          <button className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Bagikan">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <hr className="my-4 border-gray-200" />
      <CommentInput postId={post.id} />
      <h2 className="text-lg font-bold mb-4">Komentar</h2>
      <PostComments postId={post.id} />
    </div>
  );
}
