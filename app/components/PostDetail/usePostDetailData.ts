"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

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
  const [postId] = useState<string | undefined>(initialPostId ?? paramIdOrKey);
  const [post, setPost] = useState<PostDetailData | null>(null);
  const [slug, setSlug] = useState<string | undefined>(initialSlug ?? undefined);

  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [hasApresiasi, setHasApresiasi] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [authorId, setAuthorId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followBusy, setFollowBusy] = useState<boolean>(false);

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
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      setLoading(true);

      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id").eq("id", postId).single();

      if (postError || !postData) {
        setLoading(false);
        return;
      }

      setAuthorId(postData.user_id);

      const { data: contentData } = await supabase.from("post_content").select("title, description, author_image, slug").eq("post_id", postId).single();

      const { data: profileData } = await supabase.from("user_profile").select("display_name, verified").eq("id", postData.user_id).single();

      const [{ count: likesCount }, { count: commentsCount }, { data: viewsRow }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("liked", true),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", postId),
        supabase.from("post_views").select("views").eq("post_id", postId).maybeSingle(),
      ]);

      const totalViews = viewsRow?.views ?? 0;
      const resolvedSlug = contentData?.slug ?? initialSlug ?? undefined;
      if (resolvedSlug) setSlug(resolvedSlug);

      setPost({
        id: postData.id,
        slug: resolvedSlug ?? null,
        title: contentData?.title ?? "(Tanpa judul)",
        description: contentData?.description ?? "",
        // image_url removed
        author: profileData?.display_name ?? "Anonim",
        author_verified: profileData?.verified ?? false,
        author_image: contentData?.author_image ?? null,
        date: formatPostDate(postData.created_at),
        likes: (likesCount as number) ?? 0,
        comments: (commentsCount as number) ?? 0,
        views: totalViews,
      });

      setLikeCount((likesCount as number) ?? 0);
      setLoading(false);
    };

    fetchPost();
  }, [postId, initialSlug]);

  useEffect(() => {
    const checkApresiasi = async () => {
      if (!user || !postId) return;
      const { data, error } = await supabase.from("post_likes").select("liked").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
      if (!error) setHasApresiasi(data?.liked === true);
    };
    checkApresiasi();
  }, [user, postId]);

  useEffect(() => {
    const checkFollow = async () => {
      if (!authorId || !user) return;
      if (authorId === user.id) {
        setIsFollowing(false);
        return;
      }
      const { data, error } = await supabase.from("user_followers").select("follower_id").eq("follower_id", user.id).eq("following_id", authorId).maybeSingle();
      if (!error) setIsFollowing(!!data);
    };
    checkFollow();
  }, [authorId, user]);

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

    const { data: existing, error: existingErr } = await supabase.from("post_likes").select("liked").eq("post_id", postId).eq("user_id", user.id).maybeSingle();

    if (existingErr) return;

    const newLiked = existing ? !existing.liked : true;
    const { error: likeErr } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id, liked: newLiked }, { onConflict: "user_id,post_id" });

    if (!likeErr) {
      setHasApresiasi(newLiked);
      setLikeCount((v) => v + (newLiked ? 1 : -1));
    }
  };

  const handleToggleFollow = async () => {
    if (!authorId) return;
    if (!user) {
      redirectToLogin();
      return;
    }
    if (authorId === user.id) return;

    setFollowBusy(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("user_followers").delete().eq("follower_id", user.id).eq("following_id", authorId);
        if (!error) setIsFollowing(false);
      } else {
        const { error } = await supabase.from("user_followers").insert([{ follower_id: user.id, following_id: authorId }]);
        if (!error) setIsFollowing(true);
      }
    } finally {
      setFollowBusy(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const sharePath = slug ?? post.id;
    const url = `${origin}/post/${sharePath}`;
    const title = post.title ?? "";
    try {
      const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> }) : undefined;
      if (nav && typeof nav.share === "function") {
        await nav.share({ title, text: `${url}\n\n${title}`, url });
        return;
      }
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(title);
          const waUrl = `https://wa.me/?text=${encodeURIComponent(`${url}\n\n${title}`)}`;
          const win = window.open(waUrl, "_blank");
          if (win) {
            alert("Judul otomatis disalin. Setelah WhatsApp terbuka, tempel (paste) judul di atas preview jika ingin menambahkan judul.");
            return;
          }
        } catch {}
      }
      const waUrl = `https://wa.me/?text=${encodeURIComponent(`${url}\n\n${title}`)}`;
      const win = window.open(waUrl, "_blank");
      if (win) return;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${url}\n\n${title}`);
        alert("Tautan dan judul telah disalin. Buka WhatsApp lalu tempel (paste).");
        return;
      }
      window.prompt("Salin teks ini lalu buka WhatsApp dan tempel:", `${url}\n\n${title}`);
    } catch {}
  };

  return {
    post,
    user,
    loading,
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
