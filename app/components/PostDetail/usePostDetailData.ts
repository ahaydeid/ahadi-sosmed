"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import useSWR from "swr";

export interface PostDetailData {
  id: string;
  slug?: string | null;
  title: string;
  description: string;
  author: string;
  author_verified?: boolean;
  author_image?: string | null;
  date: string;
  likes: number;
  comments: number;
  views: number;
}

const formatPostDate = (dateString: string): string => {
  const postDate = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const postYear = postDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (postYear !== currentYear) options.year = "numeric";
  return postDate.toLocaleDateString("id-ID", options).replace(/,$/, "").trim();
};

export function usePostDetailData(initialPostId?: string, initialSlug?: string) {
  const params = useParams() as Record<string, string | undefined>;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paramIdOrKey = params.id ?? params.key ?? undefined;
  const postId = initialPostId ?? paramIdOrKey;

  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [showLikes, setShowLikes] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Authentication Effect
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthChecked(true);
    })();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // SWR Fetcher
  const fetcher = async () => {
    if (!postId) return null;

    const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id").eq("id", postId).single();
    if (postError || !postData) return null;

    const { data: contentData } = await supabase.from("post_content").select("title, description, author_image, slug").eq("post_id", postId).single();
    const { data: profileData } = await supabase.from("user_profile").select("display_name, verified").eq("id", postData.user_id).single();

    const [{ count: likesCount }, { count: commentsCount }, { data: viewsRow }] = await Promise.all([
      supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("liked", true),
      supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", postId),
      supabase.from("post_views").select("views").eq("post_id", postId).maybeSingle(),
    ]);

    return {
      post: {
        id: postData.id,
        slug: contentData?.slug ?? initialSlug ?? null,
        title: contentData?.title ?? "(Tanpa judul)",
        description: contentData?.description ?? "",
        author: profileData?.display_name ?? "Anonim",
        author_verified: profileData?.verified ?? false,
        author_image: contentData?.author_image ?? null,
        date: formatPostDate(postData.created_at),
        likes: (likesCount as number) ?? 0,
        comments: (commentsCount as number) ?? 0,
        views: viewsRow?.views ?? 0,
      } as PostDetailData,
      authorId: postData.user_id,
      likeCount: (likesCount as number) ?? 0,
    };
  };

  const { data: swrData, isLoading: loading, mutate } = useSWR(postId ? `post-${postId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnMount: true,
  });

  const post = swrData?.post ?? null;
  const authorId = swrData?.authorId ?? null;
  const likeCount = swrData?.likeCount ?? 0;

  // Personal Context SWR (liked, following)
  const { data: personalData, mutate: mutatePersonal } = useSWR(
    user && authorId ? `personal-post-${postId}-${user.id}` : null,
    async () => {
      const [likeRes, followRes] = await Promise.all([
        supabase.from("post_likes").select("liked").eq("post_id", postId!).eq("user_id", user!.id).maybeSingle(),
        supabase.from("user_followers").select("follower_id").eq("follower_id", user!.id).eq("following_id", authorId!).maybeSingle(),
      ]);
      return {
        hasApresiasi: likeRes.data?.liked === true,
        isFollowing: !!followRes.data,
      };
    }
  );

  const hasApresiasi = personalData?.hasApresiasi ?? false;
  const isFollowing = personalData?.isFollowing ?? false;

  const redirectToLogin = () => {
    const qs = searchParams?.toString() ?? "";
    const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
    router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
  };

  const handleApresiasi = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    if (!postId) return;

    const newLiked = !hasApresiasi;
    
    // Optimistic Update
    mutatePersonal({ hasApresiasi: newLiked, isFollowing }, false);
    mutate({ ...swrData!, likeCount: likeCount + (newLiked ? 1 : -1) }, false);

    const { error } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id, liked: newLiked }, { onConflict: "user_id,post_id" });
    if (error) {
       mutatePersonal(); // Rolling back
       mutate();
    }
  };

  const handleToggleFollow = async () => {
    if (!authorId || !user) {
      if (!user) redirectToLogin();
      return;
    }
    if (authorId === user.id) return;

    setFollowBusy(true);
    const newFollowing = !isFollowing;
    
    // Optimistic Update
    mutatePersonal({ hasApresiasi, isFollowing: newFollowing }, false);

    try {
      if (isFollowing) {
        await supabase.from("user_followers").delete().eq("follower_id", user.id).eq("following_id", authorId);
      } else {
        await supabase.from("user_followers").insert([{ follower_id: user.id, following_id: authorId }]);
      }
    } catch {
      mutatePersonal(); // Rollback
    } finally {
      setFollowBusy(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sharePath = post.slug ?? post.id;
    const url = `${origin}/post/${sharePath}`;
    const title = post.title ?? "";
    try {
      if (navigator.share) {
        await navigator.share({ title, text: `${url}\n\n${title}`, url });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${url}\n\n${title}`);
        alert("Tautan dan judul telah disalin.");
      }
    } catch {}
  };

  return {
    post,
    user,
    loading: loading && !post,
    authChecked,
    hasApresiasi,
    showLikes,
    likeCount,
    authorId,
    isFollowing,
    followBusy,
    setShowLikes,
    handleApresiasi,
    handleToggleFollow,
    handleShare,
    redirectToLogin,
  };
}
