"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { CommentData } from "@/lib/types/comment";
import { formatRelativeTime, getRandomColor } from "@/lib/format";

const LIMIT = 10;

export function usePostComments(postId: string) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [likeBusy, setLikeBusy] = useState<Set<string>>(new Set());
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

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

      let profiles: Array<{ id: string; display_name: string; avatar_url: string | null; verified?: boolean }> = [];
      if (needProfileIds.length > 0) {
        const { data } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", needProfileIds);
        profiles = data ?? [];
      }
      const profileMap = new Map<string, { display_name: string; avatar_url: string | null; verified?: boolean }>();
      profiles.forEach((p) => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url ?? null, verified: p.verified ?? false }));

      const commentsWithExtras: CommentData[] = topLevelRows.map((c) => {
        const authorProf = c.user_id ? profileMap.get(c.user_id) : undefined;

        const uniqueSet = rootToUsers.get(c.id) ?? new Set<string>();
        const respondersUniqueCount = uniqueSet.size;

        const followedId = followedResponderIdByRoot.get(c.id) ?? null;
        const followedName = followedId ? profileMap.get(followedId)?.display_name ?? null : null;

        return {
          id: c.id,
          user_id: c.user_id,
          author: authorProf?.display_name ?? "Anonim",
          verified: authorProf?.verified ?? false,
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

  return {
    comments,
    loadingInitial,
    loadingMore,
    hasMore,
    loadMore: () => load(offset, false),
    reload: handleReload,
    user,
    authChecked,
    toggleLike,
    likeBusy,
    redirectToLogin,
  };
}
