"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Heart, Loader2 } from "lucide-react";
import Image from "next/image";
import RepliesModal from "@/app/components/RepliesModal";
import ModalLikes from "@/app/components/ModalLikes";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface CommentData {
  id: string;
  author: string;
  text: string;
  time: string;
  likes: number;
  likedByMe: boolean;
  respondersUniqueCount: number;
  respondedByMe: boolean;
  followedResponderName?: string | null;
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
  const [openRootId, setOpenRootId] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [likeBusy, setLikeBusy] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // state untuk modal likes pada komentar
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const redirectToLogin = useCallback(() => {
    const qs = searchParams?.toString() ?? "";
    const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
    router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
  }, [router, pathname, searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthChecked(true);
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    return () => {
      data.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const fetchFollowing = async () => {
      if (!user?.id) {
        setFollowingIds(new Set());
        return;
      }
      const { data } = await supabase.from("user_followers").select("following_id").eq("follower_id", user.id);
      const setIds = new Set<string>((data ?? []).map((r) => r.following_id));
      setFollowingIds(setIds);
    };
    fetchFollowing();
  }, [user?.id]);

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

      const parentIds = topLevelRows.map((r) => r.id);

      const { data: likeRows } = await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", parentIds);
      const likeCountMap = new Map<string, number>();
      const likedByMeSet = new Set<string>();
      (likeRows ?? []).forEach((r: { comment_id: string; user_id: string | null }) => {
        likeCountMap.set(r.comment_id, (likeCountMap.get(r.comment_id) ?? 0) + 1);
        if (user?.id && r.user_id === user.id) likedByMeSet.add(r.comment_id);
      });

      const rootIds = parentIds;
      const parentToRoot = new Map<string, string>();
      rootIds.forEach((rid) => parentToRoot.set(rid, rid));

      const rootToUsers = new Map<string, Set<string>>();
      const respondedByMeMap = new Map<string, boolean>();

      let frontier = [...rootIds];
      const MAX_DEPTH = 6;

      for (let depth = 0; depth < MAX_DEPTH && frontier.length > 0; depth++) {
        const { data: rows } = await supabase.from("comments").select("id, parent_comment_id, user_id").in("parent_comment_id", frontier);
        if (!rows || rows.length === 0) break;

        const nextFrontier: string[] = [];
        rows.forEach((r) => {
          if (!r.parent_comment_id) return;
          const rootId = parentToRoot.get(r.parent_comment_id) ?? r.parent_comment_id;
          parentToRoot.set(r.id, rootId);
          nextFrontier.push(r.id);

          if (r.user_id) {
            const set = rootToUsers.get(rootId) ?? new Set<string>();
            set.add(r.user_id);
            rootToUsers.set(rootId, set);
            if (user?.id && r.user_id === user.id) respondedByMeMap.set(rootId, true);
          }
        });

        frontier = nextFrontier;
      }

      const followedResponderIdByRoot = new Map<string, string | null>();
      rootIds.forEach((rid) => {
        const responders = Array.from(rootToUsers.get(rid) ?? new Set<string>());
        const found = responders.find((uid) => followingIds.has(uid)) ?? null;
        followedResponderIdByRoot.set(rid, found);
      });

      const topAuthorIds = [...new Set(topLevelRows.map((c) => c.user_id))].filter(Boolean) as string[];
      const chosenResponderIds = [...new Set(Array.from(followedResponderIdByRoot.values()).filter(Boolean) as string[])];
      const needProfileIds = [...new Set([...topAuthorIds, ...chosenResponderIds])];

      let profiles: Array<{ id: string; display_name: string; avatar_url: string | null }> = [];
      if (needProfileIds.length > 0) {
        const { data } = await supabase.from("user_profile").select("id, display_name, avatar_url").in("id", needProfileIds);
        profiles = data ?? [];
      }
      const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>();
      profiles.forEach((p) => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url ?? null }));

      const commentsWithExtras: CommentData[] = topLevelRows.map((c) => {
        const authorProf = c.user_id ? profileMap.get(c.user_id) : undefined;

        const uniqueSet = rootToUsers.get(c.id) ?? new Set<string>();
        const respondersUniqueCount = uniqueSet.size;

        const followedId = followedResponderIdByRoot.get(c.id) ?? null;
        const followedName = followedId ? profileMap.get(followedId)?.display_name ?? null : null;

        return {
          id: c.id,
          author: authorProf?.display_name ?? "Anonim",
          text: c.text,
          time: formatRelativeTime(c.created_at),
          likes: likeCountMap.get(c.id) ?? 0,
          likedByMe: likedByMeSet.has(c.id),
          respondersUniqueCount,
          respondedByMe: respondedByMeMap.get(c.id) ?? false,
          followedResponderName: followedName,
          avatarColor: getRandomColor(c.user_id ?? c.id),
          avatarUrl: authorProf?.avatar_url ?? null,
          parent_comment_id: c.parent_comment_id,
        };
      });

      setComments((prev) => (isInitial ? commentsWithExtras : [...prev, ...commentsWithExtras]));
      setOffset(currentOffset + topLevelRows.length);
      setHasMore(topLevelRows.length === LIMIT);

      setLoadingInitial(false);
      setLoadingMore(false);
    },
    [postId, user?.id, followingIds]
  );

  const handleReload = useCallback(async () => {
    setComments([]);
    setOffset(0);
    setHasMore(true);
    await load(0, true);
  }, [load]);

  useEffect(() => {
    const onRefresh = (e: Event) => {
      const ev = e as CustomEvent<{ postId: string }>;
      if (ev.detail?.postId !== postId) return;
      void handleReload();
    };
    window.addEventListener("comments:refresh", onRefresh as EventListener);
    return () => window.removeEventListener("comments:refresh", onRefresh as EventListener);
  }, [postId, handleReload]);

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

  const toggleLike = useCallback(
    async (commentId: string) => {
      if (!authChecked) return;
      if (!user) {
        redirectToLogin();
        return;
      }
      setLikeBusy((prev) => new Set(prev).add(commentId));
      try {
        const target = comments.find((c) => c.id === commentId);
        if (!target) return;

        if (target.likedByMe) {
          await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id);
          setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, likedByMe: false, likes: Math.max(0, c.likes - 1) } : c)));
        } else {
          await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });
          setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, likedByMe: true, likes: c.likes + 1 } : c)));
        }
      } finally {
        setLikeBusy((prev) => {
          const next = new Set(prev);
          next.delete(commentId);
          return next;
        });
      }
    },
    [authChecked, user, comments, redirectToLogin]
  );

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
        <div key={comment.id} className="mb-4">
          <CommentItem
            comment={comment}
            likeBusy={likeBusy.has(comment.id)}
            onLike={() => toggleLike(comment.id)}
            onReply={() => {
              if (!authChecked) return;
              if (!user) {
                redirectToLogin();
                return;
              }
              setOpenRootId(comment.id);
            }}
            onShowLikes={() => setSelectedCommentId(comment.id)}
          />
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

      {openRootId && <RepliesModal rootCommentId={openRootId} postId={postId} onClose={() => setOpenRootId(null)} />}

      {/* Modal untuk daftar yang menyukai komentar */}
      <ModalLikes commentId={selectedCommentId ?? undefined} open={!!selectedCommentId} onClose={() => setSelectedCommentId(null)} />
    </div>
  );
}

function CommentItem({ comment, onReply, onLike, likeBusy, onShowLikes }: { comment: CommentData; onReply: () => void; onLike: () => void; likeBusy: boolean; onShowLikes: () => void }) {
  const liked = comment.likedByMe;

  let replySummary: string | null = null;
  if (comment.respondersUniqueCount > 0) {
    if (comment.respondedByMe) {
      const others = comment.respondersUniqueCount - 1;
      replySummary = others > 0 ? `kamu dan ${others} orang lainnya membalas...` : "kamu membalas...";
    } else if (comment.followedResponderName) {
      const others = comment.respondersUniqueCount - 1;
      replySummary = others > 0 ? `${comment.followedResponderName} dan ${others} orang lainnya membalas...` : `${comment.followedResponderName} membalas...`;
    } else {
      replySummary = `${comment.respondersUniqueCount} orang membalas...`;
    }
  }

  return (
    <div className="flex items-start gap-3">
      {comment.avatarUrl ? (
        <Image src={comment.avatarUrl} alt={comment.author} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className={`w-8 h-8 rounded-full ${comment.avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
          <span>{getInitials(comment.author)}</span>
        </div>
      )}

      <div className="flex-1">
        <div className="bg-gray-100 rounded-xl p-3">
          <p className="font-semibold text-sm mb-1 text-gray-800">{comment.author}</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.text}</p>
        </div>

        <div className="flex items-center gap-6 mt-2 text-sm text-gray-700">
          <span>{comment.time}</span>

          <button className={`hover:underline disabled:opacity-50 ${liked ? "text-sky-700" : ""}`} onClick={onLike} disabled={likeBusy} aria-pressed={liked}>
            {liked ? "Batal Suka" : "Suka"}
          </button>

          <button className="hover:underline" onClick={onReply}>
            Balas
          </button>

          <button type="button" onClick={onShowLikes} className="flex hover:text-sky-400 cursor-pointer items-center gap-1" aria-label="Lihat yang menyukai komentar">
            <Heart className={`w-4 h-4 ${liked ? "text-sky-600" : "text-gray-700 hover:text-sky-400 cursor-pointer"}`} />
            <span>{comment.likes}</span>
          </button>
        </div>

        {replySummary && (
          <button type="button" onClick={onReply} className="text-xs text-gray-600 mt-1 hover:underline text-left">
            {replySummary}
          </button>
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

function getInitials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "U";
  if (p.length === 1) return p[0].slice(0, 1).toUpperCase();
  return (p[0].slice(0, 1) + p[p.length - 1].slice(0, 1)).toUpperCase();
}
