"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Heart } from "lucide-react";

interface CommentData {
  id: string;
  author: string;
  text: string;
  time: string;
  likes: number;
  avatarColor: string;
}

export default function PostComments() {
  const { id } = useParams<{ id: string }>();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComments = async () => {
      if (!id) return;

      setLoading(true);

      // 1. Ambil semua komentar untuk post ini
      const { data: commentsData, error: commentsError } = await supabase.from("comments").select("id, user_id, text, created_at").eq("post_id", id).order("created_at", { ascending: true });

      if (commentsError) {
        console.error("Error loading comments:", commentsError.message);
        setLoading(false);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(commentsData.map((c) => c.user_id))];

      // 2. Ambil nama author dari user_profile
      const { data: profiles, error: profileError } = await supabase.from("user_profile").select("id, display_name").in("id", userIds);

      if (profileError) {
        console.error("Error loading profiles:", profileError.message);
      }

      const profileMap = new Map<string, string>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, p.display_name));

      // 3. Hitung total like tiap komentar
      const commentsWithLikes = await Promise.all(
        commentsData.map(async (c) => {
          const { count: likesCount } = await supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", c.id);

          return {
            id: c.id,
            author: profileMap.get(c.user_id) ?? "Anonim",
            text: c.text,
            time: formatRelativeTime(c.created_at),
            likes: likesCount ?? 0,
            avatarColor: getRandomColor(c.user_id),
          };
        })
      );

      setComments(commentsWithLikes);
      setLoading(false);
    };

    loadComments();
  }, [id]);

  if (loading) {
    return <div className="mt-8 text-gray-500 text-sm">Memuat komentar...</div>;
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-4">Komentar</h2>

      {comments.length === 0 && <p className="text-gray-500 text-sm">Belum ada komentar</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="flex items-start gap-3 mb-6">
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full ${comment.avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
            <span>👤</span>
          </div>

          {/* Isi komentar */}
          <div className="flex-1">
            <div className="bg-gray-100 rounded-xl p-3">
              <p className="font-semibold text-sm mb-1 text-gray-800">{comment.author}</p>
              <p className="text-sm text-gray-800">{comment.text}</p>
            </div>

            {/* Footer komentar */}
            <div className="flex items-center gap-6 mt-2 text-sm text-gray-700">
              <span>{comment.time}</span>
              <button className="hover:underline">Suka</button>
              <button className="hover:underline">Balas</button>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-gray-700" />
                <span>{comment.likes}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Helper: ubah waktu komentar jadi format relatif (mis. "2 jam lalu") */
function formatRelativeTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit`;
  if (diffHours < 24) return `${diffHours} jam`;
  return `${diffDays} hari`;
}

/** Helper: buat warna avatar random stabil berdasarkan user_id */
function getRandomColor(seed: string): string {
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
}
