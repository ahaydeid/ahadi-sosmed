"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, Loader2 } from "lucide-react";
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

const LIMIT = 10;

export default function PostComments({ postId }: PostCommentsProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const hasMoreRef = useRef(true);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const load = useCallback(
    async (currentOffset: number, isInitial: boolean) => {
      if (!postId) return;
      if (!isInitial && !hasMoreRef.current) return;

      if (isInitial) setLoadingInitial(true);
      else setLoadingMore(true);

      const { data: topLevelRows, error: topErr } = await supabase
        .from("comments")
        .select("id, user_id, text, parent_comment_id, created_at")
        .eq("post_id", postId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(currentOffset, currentOffset + LIMIT - 1);

      if (topErr) {
        console.error("Error loading top-level comments:", topErr.message);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      if (!topLevelRows || topLevelRows.length === 0) {
        if (isInitial) setComments([]);
        setHasMore(false);
        setLoadingInitial(false);
        setLoadingMore(false);
        return;
      }

      const userIds = [...new Set(topLevelRows.map((c) => c.user_id))].filter(Boolean) as string[];
      const { data: profiles } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", userIds);

      const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      (profiles ?? []).forEach((p) => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url ?? null }));

      const ids = topLevelRows.map((r) => r.id);
      const { data: likeRows } = await supabase.from("comment_likes").select("comment_id").in("comment_id", ids);

      const likeCountMap = new Map<string, number>();
      (likeRows ?? []).forEach((r: { comment_id: string }) => {
        likeCountMap.set(r.comment_id, (likeCountMap.get(r.comment_id) ?? 0) + 1);
      });

      const commentsWithLikes: CommentData[] = topLevelRows.map((c) => {
        const userProfile = c.user_id ? profileMap.get(c.user_id) : undefined;
        return {
          id: c.id,
          author: userProfile?.display_name ?? "Anonim",
          text: c.text,
          time: formatRelativeTime(c.created_at),
          likes: likeCountMap.get(c.id) ?? 0,
          avatarColor: getRandomColor(c.user_id ?? c.id),
          avatarUrl: userProfile?.avatar_url ?? null,
          parent_comment_id: c.parent_comment_id,
        };
      });

      setComments((prev) => (isInitial ? commentsWithLikes : [...prev, ...commentsWithLikes]));

      setOffset(currentOffset + topLevelRows.length);
      setHasMore(topLevelRows.length === LIMIT);

      setLoadingInitial(false);
      setLoadingMore(false);
    },
    [postId]
  );

  const handleReload = useCallback(async () => {
    setComments([]);
    setOffset(0);
    setHasMore(true);
    await load(0, true);
  }, [load]);

  type CommentsRefreshDetail = { postId: string };

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const ev = e as CustomEvent<CommentsRefreshDetail>;
      if (ev.detail?.postId !== postId) return;
      void handleReload();
    };
    window.addEventListener("comments:refresh", onRefresh as EventListener);
    return () => window.removeEventListener("comments:refresh", onRefresh as EventListener);
  }, [postId, handleReload]);

  // efek awal hanya saat postId berubah
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await load(0, true);
    })();
    return () => {
      mounted = false;
    };
  }, [postId, load]);

  if (loadingInitial) {
    return (
      <div className="mt-8 text-gray-500 text-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat komentar...
      </div>
    );
  }

  return (
    <div className="mt-1">
      {comments.length === 0 && <p className="text-gray-500 ms-2 text-sm">Belum ada komentar</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="mb-6">
          <CommentItem comment={comment} reload={handleReload} />
        </div>
      ))}

      <div className="flex justify-center py-4">
        {loadingMore ? (
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        ) : hasMore && comments.length > 0 ? (
          <button onClick={() => load(offset, false)} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">
            Muat lebih banyak komentar
          </button>
        ) : comments.length > 0 ? (
          <p className="text-gray-500 text-xs">Semua komentar telah dimuat</p>
        ) : null}
      </div>
    </div>
  );
}

function CommentItem({ comment, reload }: { comment: CommentData; reload: () => Promise<void> }) {
  return (
    <div className="flex items-start gap-3">
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
          <button className="hover:underline" onClick={reload}>
            Segarkan
          </button>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-gray-700" />
            <span>{comment.likes}</span>
          </div>
        </div>
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
