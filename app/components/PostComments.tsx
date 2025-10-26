"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, Loader2 } from "lucide-react"; // ⬅️ Tambahkan Loader2
import Image from "next/image";

interface CommentData {
  id: string;
  author: string;
  text: string;
  time: string;
  likes: number;
  avatarColor: string;
  avatarUrl?: string | null;
  parent_comment_id?: string | null;
}

interface PostCommentsProps {
  postId: string;
}

const LIMIT = 10; // Batas komentar per load

export default function PostComments({ postId }: PostCommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true); 
  const [loadingMore, setLoadingMore] = useState(false); 
  const [offset, setOffset] = useState(0); 
  const [hasMore, setHasMore] = useState(true); 

  // Menggunakan 'load' dengan parameter offset dan isInitial
  const load = useCallback(
    async (currentOffset: number, isInitial: boolean) => {
      if (!postId || (!hasMore && !isInitial)) return;

      if (isInitial) {
        setLoadingInitial(true);
      } else {
        setLoadingMore(true);
      }

      // 🟢 1. Ambil komentar dari Supabase dengan LIMIT dan OFFSET
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, user_id, text, parent_comment_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false }) 
        .range(currentOffset, currentOffset + LIMIT - 1); 

      if (commentsError) {
        console.error("Error loading comments:", commentsError.message);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      // 🟢 Cek apakah masih ada data yang bisa dimuat
      if (!commentsData || commentsData.length < LIMIT) {
        setHasMore(false);
      }
      
      if (!commentsData || commentsData.length === 0) {
        if (isInitial) setComments([]);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }
      
      const newUserIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles, error: profileError } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", newUserIds);

      if (profileError) console.error("Error loading profiles:", profileError.message);

      const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      (profiles ?? []).forEach((p) =>
        profileMap.set(p.id, {
          display_name: p.display_name,
          avatar_url: p.avatar_url ?? null,
        })
      );

      // 🟢 3. Proses komentar dan hitung likes
      const newCommentsWithLikes = await Promise.all(
        commentsData.map(async (c) => {
          const { count: likesCount } = await supabase.from("comment_likes").select("*", { count: "exact", head: true }).eq("comment_id", c.id);

          const userProfile = profileMap.get(c.user_id);

          return {
            id: c.id,
            author: userProfile?.display_name ?? "Anonim",
            text: c.text,
            time: formatRelativeTime(c.created_at),
            likes: likesCount ?? 0,
            avatarColor: getRandomColor(c.user_id),
            avatarUrl: userProfile?.avatar_url ?? null,
            parent_comment_id: c.parent_comment_id,
          };
        })
      );

      // 🟢 4. Gabungkan komentar
      setComments((prevComments) => {
        const all = isInitial ? newCommentsWithLikes : [...prevComments, ...newCommentsWithLikes];
        const uniqueComments = Array.from(new Map(all.map(item => [item.id, item])).values());
        return uniqueComments;
      });
      
      // 🟢 5. Update offset
      setOffset(currentOffset + commentsData.length);
      
      setLoadingInitial(false);
      setLoadingMore(false);
    },
    [postId, hasMore]
  );
  
  // ⬅️ FUNGSI RELOAD TANPA PARAMETER UNTUK PROP DI COMMENTITEM/COMMENTINPUT
  const handleReload = useCallback(async () => {
    // Reset state dan mulai pemuatan awal
    setComments([]);
    setOffset(0);
    setHasMore(true);
    await load(0, true);
  }, [load]);


  const handleLoadMore = useCallback(() => {
    if (loadingMore || loadingInitial || !hasMore) return;
    load(offset, false);
  }, [loadingMore, loadingInitial, hasMore, offset, load]);
  
  // 🟢 Event listener untuk scroll
  useEffect(() => {
    if (loadingInitial || !hasMore) return;

    const handleScroll = () => {
      const scrollThreshold = 300; 
      // Deteksi jika scroll mendekati akhir halaman
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - scrollThreshold &&
        !loadingMore &&
        hasMore
      ) {
        handleLoadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingInitial, loadingMore, hasMore, handleLoadMore]);

  // 🟢 Pemuatan Awal
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      await Promise.resolve();
      if (isMounted) {
        // Panggil fungsi 'load' yang sudah dimodifikasi
        await load(0, true); 
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [postId, load]);

  if (loadingInitial) {
    return <div className="mt-8 text-gray-500 text-sm flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Memuat komentar...
    </div>;
  }

  const topLevelComments = comments.filter((c) => !c.parent_comment_id);

  return (
    <div className="mt-1">
      {topLevelComments.length === 0 && <p className="text-gray-500 ms-2 text-sm">Belum ada komentar</p>}

      {topLevelComments.map((comment) => (
        <div key={comment.id} className="mb-6">
          {/* ⬅️ Kirim handleReload sebagai prop reload */}
          <CommentItem comment={comment} allComments={comments} reload={handleReload} /> 
        </div>
      ))}
      
      {/* ⬅️ LOADING SPINNER DAN END OF LIST */}
      <div className="flex justify-center py-4">
        {loadingMore ? (
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        ) : hasMore && topLevelComments.length > 0 ? (
          <button 
            onClick={handleLoadMore} 
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
          >
            Muat lebih banyak komentar
          </button>
        ) : topLevelComments.length > 0 && (
          <p className="text-gray-500 text-xs">Semua komentar telah dimuat</p>
        )}
      </div>
      
    </div>
  );
}

// ⬅️ PERBAIKI TYPE RELOAD di CommentItem
function CommentItem({ comment, allComments, reload }: { comment: CommentData; allComments: CommentData[]; reload: () => Promise<void> }) { 
  const replies = allComments.filter((c) => c.parent_comment_id === comment.id);

  return (
    <div className="flex items-start gap-3">
      {/* 🟢 Avatar pakai foto profil kalau ada */}
      {comment.avatarUrl ? (
        <Image src={comment.avatarUrl} alt={comment.author} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className={`w-8 h-8 rounded-full ${comment.avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
          <span>👤</span>
        </div>
      )}

      <div className="flex-1">
        <div className="bg-gray-100 rounded-xl p-3">
          <p className="font-semibold text-sm mb-1 text-gray-800">{comment.author}</p>
          <p className="text-sm text-gray-800">{comment.text}</p>
        </div>

        <div className="flex items-center gap-6 mt-2 text-sm text-gray-700">
          <span>{comment.time}</span>
          <button className="hover:underline">Suka</button>
          <button className="hover:underline">Balas</button>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-gray-700" />
            <span>{comment.likes}</span>
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-3 border-l-2 border-gray-200 ml-5 pl-4 space-y-3">
            {replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} allComments={allComments} reload={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit`;
  if (diffHours < 24) return `${diffHours} jam`;
  if (diffDays < 30) return `${diffDays} hari`;
  if (diffMonths < 12) return `${diffMonths} bulan`;
  return `${diffYears} tahun`;
}

function getRandomColor(seed: string): string {
  const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
}