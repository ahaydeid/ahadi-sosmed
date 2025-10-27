"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Star, Eye, Heart, MessageCircle, ChevronLeft, Share2 } from "lucide-react";
import Image from "next/image";
import PostComments from "../../components/PostComments";
import CommentInput from "@/app/components/CommentInput";
import ReactMarkdown from "react-markdown";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";

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

// tipe Web Share API (dengan dukungan files) + guard
interface ShareDataWithFiles {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

type NavigatorWithShare = Navigator & {
  canShare?: (data?: ShareDataWithFiles) => boolean;
  share?: (data?: ShareDataWithFiles) => Promise<void>;
};

function supportsFileShare(n: Navigator): n is NavigatorWithShare {
  const nav = n as NavigatorWithShare;
  return typeof nav.share === "function" && typeof nav.canShare === "function";
}

// bikin image share ala kartu: judul, author, tanggal, dan thumbnail
async function buildShareCard(opts: { title: string; author: string; date: string; imageUrl?: string | null }): Promise<Blob> {
  const W = 1080; // 9:16 friendly juga kalau mau
  const H = 1350;
  const pad = 48;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ctx null");

  // background sederhana
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // area gambar
  const imgX = pad;
  const imgY = pad;
  const imgW = W - pad * 2;
  const imgH = Math.round((imgW * 9) / 16);

  // gambar jika ada
  if (opts.imageUrl) {
    try {
      // ambil via fetch agar bisa draw tanpa crossOrigin kalau server izinkan
      const res = await fetch(opts.imageUrl, { mode: "cors" });
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      // cover
      const r = bmp.width / bmp.height;
      const targetR = imgW / imgH;
      let sx = 0,
        sy = 0,
        sw = bmp.width,
        sh = bmp.height;
      if (r > targetR) {
        const newW = bmp.height * targetR;
        sx = Math.round((bmp.width - newW) / 2);
        sw = Math.round(newW);
      } else {
        const newH = bmp.width / targetR;
        sy = Math.round((bmp.height - newH) / 2);
        sh = Math.round(newH);
      }
      ctx.drawImage(bmp, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
    } catch {
      // kalau gagal, kasih blok abu-abu
      ctx.fillStyle = "#eee";
      ctx.fillRect(imgX, imgY, imgW, imgH);
    }
  } else {
    ctx.fillStyle = "#eee";
    ctx.fillRect(imgX, imgY, imgW, imgH);
  }

  // title
  const titleY = imgY + imgH + 36;
  ctx.fillStyle = "#111827";
  ctx.font = "700 48px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  // wrap manual sederhana
  const maxW = W - pad * 2;
  const words = opts.title.trim() ? opts.title.trim().split(/\s+/) : ["(Tanpa", "judul)"];
  let line = "";
  let y = titleY;
  const lineHeight = 58;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + " " + words[i] : words[i];
    const m = ctx.measureText(test);
    if (m.width > maxW) {
      ctx.fillText(line, pad, y);
      line = words[i];
      y += lineHeight;
      if (y > titleY + lineHeight * 3) break; // batasi 3 baris
    } else {
      line = test;
    }
  }
  if (y <= titleY + lineHeight * 3 && line) {
    ctx.fillText(line, pad, y);
    y += lineHeight;
  }

  // meta (author • date)
  ctx.fillStyle = "#6b7280";
  ctx.font = "400 32px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const meta = `${opts.author} • ${opts.date}`;
  ctx.fillText(meta, pad, y + 8);

  // branding kecil
  ctx.fillStyle = "#0EA5E9";
  ctx.font = "600 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("ahadi", pad, H - pad);

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), "image/png", 0.95));
  return blob;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [post, setPost] = useState<PostDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [hasApresiasi, setHasApresiasi] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [authorId, setAuthorId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followBusy, setFollowBusy] = useState<boolean>(false);

  // auth
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

  // load post detail
  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      setLoading(true);

      const { data: postData, error: postError } = await supabase.from("post").select("id, created_at, user_id").eq("id", id).single();

      if (postError || !postData) {
        setLoading(false);
        return;
      }

      setAuthorId(postData.user_id);

      const { data: contentData } = await supabase.from("post_content").select("title, description, image_url, author_image").eq("post_id", id).single();

      const { data: profileData } = await supabase.from("user_profile").select("display_name").eq("id", postData.user_id).single();

      // hitung agregat sesuai skema baru
      const [{ count: likesCount }, { count: commentsCount }, { count: viewsCount }] = await Promise.all([
        supabase.from("post_likes").select("*", { count: "exact", head: true }).eq("post_id", id).eq("liked", true),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
        supabase.from("post_views").select("*", { count: "exact", head: true }).eq("post_id", id),
      ]);

      // catat view
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

  // cek status apresiasi dari db
  useEffect(() => {
    const checkApresiasi = async () => {
      if (!user || !id) return;
      const { data, error } = await supabase.from("post_likes").select("liked").eq("post_id", id).eq("user_id", user.id).maybeSingle();
      if (!error) setHasApresiasi(data?.liked === true);
    };
    checkApresiasi();
  }, [user, id]);

  // cek follow
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

  // toggle apresiasi pakai upsert/update kolom liked
  const handleApresiasi = async () => {
    if (!user) {
      const qs = searchParams?.toString() ?? "";
      const current = pathname ? pathname + (qs ? `?${qs}` : "") : "/";
      router.push(`/login?redirectedFrom=${encodeURIComponent(current)}`);
      return;
    }

    const { data: existing } = await supabase.from("post_likes").select("liked").eq("post_id", id).eq("user_id", user.id).maybeSingle();

    if (!existing) {
      const { error } = await supabase.from("post_likes").upsert({ post_id: id as string, user_id: user.id, liked: true }, { onConflict: "user_id,post_id" });
      if (!error) {
        setHasApresiasi(true);
        setLikeCount((v) => v + 1);
      }
      return;
    }

    const newLiked = !existing.liked;
    const { error } = await supabase.from("post_likes").update({ liked: newLiked }).eq("post_id", id).eq("user_id", user.id);

    if (!error) {
      setHasApresiasi(newLiked);
      setLikeCount((v) => v + (newLiked ? 1 : -1));
    }
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

  const handleShare = async () => {
    if (!post) return;

    const url = typeof window !== "undefined" ? window.location.href : "";
    const cardBlob = await buildShareCard({
      title: post.title,
      author: post.author,
      date: post.date,
      imageUrl: post.image_url ?? undefined,
    });

    const file = new File([cardBlob], "ahadi-share.png", { type: "image/png" });

    try {
      if (typeof navigator !== "undefined" && supportsFileShare(navigator)) {
        const canFiles = navigator.canShare?.({ files: [file] }) === true;
        if (canFiles) {
          await navigator.share?.({
            files: [file],
            title: post.title,
            text: post.title,
            url,
          });
          return;
        }
      }

      // fallback: buka gambar di tab baru + copy link
      const blobUrl = URL.createObjectURL(cardBlob);
      window.open(blobUrl, "_blank");
      try {
        await navigator.clipboard.writeText(`${post.title}\n${url}`);
        alert("Gambar dibuka di tab baru. Tautan sudah disalin.");
      } catch {
        alert("Gambar dibuka di tab baru.");
      }
    } catch {
      // fallback terakhir: copy link biasa
      try {
        await navigator.clipboard.writeText(`${post.title}\n${url}`);
        alert("Tautan disalin");
      } catch {}
    }
  };

  if (loading || !post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat postingan...</div>;
  }

  const showFollow = authorId && (!user || (user && authorId !== user.id));

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

      <h1 className="text-2xl mt-5 font-bold leading-snug mb-2">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-3">{post.date}</p>

      <div className="flex items-center gap-2 mb-4">
        {authorId ? (
          <Link href={`/profile/${authorId}`} className="flex items-center gap-2 group cursor-pointer" aria-label={`Lihat profil ${post.author}`}>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center ring-1 ring-transparent group-hover:ring-gray-300 transition">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800">{post.author}</span>
          </Link>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800">{post.author}</span>
          </>
        )}

        {showFollow && (
          <button
            onClick={handleToggleFollow}
            disabled={followBusy}
            className={`text-sm rounded-full px-3 py-0.5 transition ${isFollowing ? "border border-gray-300 text-gray-600 italic hover:bg-gray-100" : "border border-sky-500 text-sky-500 hover:bg-sky-50"}`}
          >
            {isFollowing ? "mengikuti" : "ikuti"}
          </button>
        )}
      </div>

      {post.image_url && (
        <div className="w-full rounded-md overflow-hidden mb-4 flex justify-center">
          <Image src={post.image_url} alt={post.title} width={800} height={400} className="object-contain w-auto h-auto max-w-full rounded-md" />
        </div>
      )}

      <div className="text-base text-justify text-gray-700 leading-relaxed space-y-4 mb-6 prose max-w-none">
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
          <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
            <Heart className="w-4 h-4" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </div>
          <button onClick={handleShare} className="flex cursor-pointer items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Bagikan">
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
    </div>
  );
}
