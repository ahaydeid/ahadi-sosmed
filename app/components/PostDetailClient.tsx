// components/PostDetailClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Star, Eye, Heart, MessageCircle, ChevronLeft, Share2 } from "lucide-react";
import Image from "next/image";
import PostComments from "./PostComments";
import CommentInput from "./CommentInput";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import ModalLikes from "@/app/components/ModalLikes";

const formatPostDate = (dateString: string): string => {
  const postDate = new Date(dateString);
  const currentYear = new Date().getFullYear();
  const postYear = postDate.getFullYear();
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  if (postYear !== currentYear) options.year = "numeric";
  return postDate.toLocaleDateString("id-ID", options).replace(/,$/, "").trim();
};

interface PostDetailData {
  id: string;
  slug?: string | null;
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

export default function PostDetailPage({ initialPostId, initialSlug }: { initialPostId?: string; initialSlug?: string }) {
  const params = useParams() as Record<string, string | undefined>;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // prefer prop, fallback to params.id or params.key
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

      // ambil slug juga dari post_content
      const { data: contentData } = await supabase.from("post_content").select("title, description, image_url, author_image, slug").eq("post_id", postId).single();

      const { data: profileData } = await supabase.from("user_profile").select("display_name").eq("id", postData.user_id).single();

      const [{ count: likesCount }, { count: commentsCount }, { count: viewsCount }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("liked", true),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", postId),
        supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", postId),
      ]);

      await supabase.from("post_views").insert([{ post_id: postId }]);

      const resolvedSlug = contentData?.slug ?? initialSlug ?? undefined;
      if (resolvedSlug) setSlug(resolvedSlug);

      setPost({
        id: postData.id,
        slug: resolvedSlug ?? null,
        title: contentData?.title ?? "(Tanpa judul)",
        description: contentData?.description ?? "",
        image_url: contentData?.image_url ?? null,
        author: profileData?.display_name ?? "Anonim",
        author_image: contentData?.author_image ?? null,
        date: formatPostDate(postData.created_at),
        likes: (likesCount as number) ?? 0,
        comments: (commentsCount as number) ?? 0,
        views: ((viewsCount as number) ?? 0) + 1,
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

  const handleApresiasi = async () => {
    if (!user) {
      const qs = searchParams?.toString() ?? "";
      const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
      router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
      return;
    }

    if (!postId) return;

    // cek apakah user sudah pernah like
    const { data: existing, error: existingErr } = await supabase.from("post_likes").select("liked").eq("post_id", postId).eq("user_id", user.id).maybeSingle();

    if (existingErr) {
      console.error("Gagal cek like:", existingErr);
      return;
    }

    const newLiked = existing ? !existing.liked : true;

    // upsert untuk toggle like
    const { error: likeErr } = await supabase.from("post_likes").upsert({ post_id: postId, user_id: user.id, liked: newLiked }, { onConflict: "user_id,post_id" });

    if (likeErr) {
      console.error("Gagal simpan like:", likeErr);
      return;
    }

    // update state UI
    setHasApresiasi(newLiked);
    setLikeCount((v) => v + (newLiked ? 1 : -1));
  };

  const redirectToLogin = () => {
    const qs = searchParams?.toString() ?? "";
    const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
    router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
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

  const handleShare = async (): Promise<void> => {
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
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
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
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(`${url}\n\n${title}`);
        alert("Tautan dan judul telah disalin. Buka WhatsApp lalu tempel (paste).");
        return;
      }
      if (typeof window !== "undefined") {
        window.prompt("Salin teks ini lalu buka WhatsApp dan tempel:", `${url}\n\n${title}`);
      }
    } catch (err) {
      console.error("share failed:", err);
    }
  };

  if (loading || !post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat postingan...</div>;
  }

  const showFollow = authorId && (!user || (user && authorId !== user.id));
  const isSelf = !!user && authorId === user.id;

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="sticky top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-10 flex items-center px-4 -mx-4">
        <button onClick={() => window.history.back()} className="absolute left-4 rounded-full hover:bg-gray-100 transition z-20" aria-label="Kembali">
          <ChevronLeft className="w-6 h-6 text-gray-800" />
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-base text-gray-800 truncate">Tulisan {post.author}</h2>
        </div>
      </div>

      <h1 className="text-2xl text-gray-800 mt-5 font-bold leading-snug mb-2">{post.title}</h1>

      <p className="text-sm text-gray-600 mb-3">{post.date}</p>

      <div className="flex items-center gap-2 mb-4">
        {authorId ? (
          <Link href={`/profile/${authorId}`} className="flex items-center gap-2 group cursor-pointer" aria-label={`Lihat profil ${post.author}`}>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center ring-1 ring-transparent group-hover:ring-gray-300 transition">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800">{post.author}</span>
          </Link>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800">{post.author}</span>
          </>
        )}

        {isSelf ? (
          <span className="text-sm rounded-full px-3 py-0.5 border border-gray-300 italic bg-gray-50 text-gray-600">saya</span>
        ) : (
          showFollow && (
            <button
              onClick={handleToggleFollow}
              disabled={followBusy}
              className={`text-sm rounded-full px-3 py-0.5 transition ${isFollowing ? "border border-gray-300 text-gray-600 italic hover:bg-gray-100" : "border border-sky-500 text-sky-500 hover:bg-sky-50"}`}
            >
              {isFollowing ? "mengikuti" : "ikuti"}
            </button>
          )
        )}
      </div>

      {post.image_url && (
        <div className="w-full rounded-xs overflow-hidden mb-4">
          <Image src={post.image_url as string} alt={post.title} sizes="100vw" width={1600} height={900} className="w-full h-auto" />
        </div>
      )}

      <div className="text-base text-gray-800 leading-relaxed space-y-4 mb-6 prose max-w-none">
        <ReactMarkdown>{post.description}</ReactMarkdown>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleApresiasi}
          className={`text-sm px-3 py-2 rounded flex items-center gap-1 border transition
            ${hasApresiasi ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
        >
          <Star className="w-4 h-4" />
          {hasApresiasi ? "diapresiasi" : "apresiasi"}
        </button>

        <div className="flex items-center gap-3 border-gray-200 border rounded px-3 py-2 w-fit">
          <div className="flex items-center gap-1 text-gray-700 text-sm">
            <Eye className="w-4 h-4" />
            <span>{post.views}</span>
          </div>
          <button onClick={() => setShowLikes(true)} className="flex cursor-pointer hover:text-sky-400 items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Lihat yang menyukai">
            <Heart className="w-4 h-4" />
            <span>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1 cursor-pointer hover:text-sky-400 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Bagikan">
            <Share2 className="w-4 h-4" />
            bagikan
          </button>
        </div>
      </div>

      <hr className="my-4 border-gray-200" />

      {authChecked &&
        (user ? (
          <CommentInput postId={post.id} />
        ) : (
          <button onClick={redirectToLogin} className="px-4 py-2 text-left text-sky-600 hover:bg-sky-50 rounded transition text-sm">
            Login untuk berkomentar
          </button>
        ))}

      <h2 className="text-lg font-bold mb-4 mt-4">Komentar</h2>
      <PostComments key={post.id} postId={post.id} />
      <ModalLikes postId={post.id} open={showLikes} onClose={() => setShowLikes(false)} />
    </div>
  );
}
