// components/PostCard.tsx
"use client";

import Image from "next/image";
import { CalendarDays, Eye, Heart, MessageCircle, X, User, BadgeCheck } from "lucide-react";
import { PostCardData } from "@/lib/types/post";
import { formatCompact } from "@/lib/formatCompact";

interface PostCardProps {
  post: PostCardData & { verified?: boolean };
}

const COLLAPSE_KEY = "collapsedPosts";

function cleanHtmlForPreview(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "") // hapus semua tag HTML
    .replace(/&nbsp;/g, " ") // ubah spasi non-breaking
    .replace(/\s+/g, " ") // rapikan spasi
    .trim();
}

export default function PostCard({ post }: PostCardProps) {
  const hasImage = !!post.imageUrl;
  const plainTextDescription = cleanHtmlForPreview(post.description);

  const handleCollapse: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSE_KEY) : null;
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(post.id)) arr.push(post.id);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(arr));
    } catch {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([post.id]));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("post:penalize", { detail: { postId: post.id, penalty: -100 } }));
    }
  };

  return (
    <div className="relative bg-white p-5 py-7 flex justify-between items-start hover:shadow-md transition-shadow rounded-md border-b border-gray-100">
      <div className={`flex-1 ${hasImage ? "pr-3" : ""}`}>
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {post.authorImage ? <Image src={post.authorImage} alt={post.author} width={24} height={24} className="object-cover w-6 h-6" /> : <User className="w-4 h-4 text-gray-500" />}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-800 font-medium">{post.author}</span>
            {post.verified && <BadgeCheck className="w-3 h-3 text-sky-500" />}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold leading-snug line-clamp-3 mb-1">{post.title}</h2>

        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{plainTextDescription}</p>

        {/* Meta info */}
        <div className="flex flex-wrap items-center mt-3 gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs">{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span title={String(post.views)}>{formatCompact(post.views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span title={String(post.likes)}>{formatCompact(post.likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span title={String(post.comments)}>{formatCompact(post.comments)}</span>
          </div>
        </div>
      </div>

      {/* Preview Image */}
      {hasImage && (
        <div className="rounded-md overflow-hidden shrink-0 flex justify-center mt-9 self-start w-24 h-20">
          <Image src={post.imageUrl as string} alt={post.title} width={96} height={80} className="object-cover w-full h-full" />
        </div>
      )}

      {/* Collapse Button */}
      <button className="absolute top-1 right-1 text-gray-400 hover:text-gray-600" aria-label="Collapse" title="Sembunyikan/Susutkan ranking postingan ini" onClick={handleCollapse}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
