"use client";

import Image from "next/image";
import { CalendarDays, Eye, Heart, MessageCircle, X, User } from "lucide-react";
// 🚀 Import helper function untuk konversi teks polos (FILE INI HARUS ADA DI lib/cleanMarkdown.ts)
import { cleanMarkdownForPreview } from "@/lib/cleanMarkdown";
// 🚀 Import Tipe Data yang Terstandardisasi
import { PostCardData } from "@/lib/types/post";

interface PostCardProps {
  post: PostCardData;
}

export default function PostCard({ post }: PostCardProps) {
  // Tentukan apakah ada gambar atau tidak
  const hasImage = !!post.imageUrl;

  // 🚀 LANGKAH PENTING: Konversi Markdown di 'description' menjadi teks polos.
  // Ini sekarang berjalan karena lib/cleanMarkdown.ts sudah dibuat.
  const plainTextDescription = cleanMarkdownForPreview(post.description);

  return (
    <div className="relative bg-white p-5 py-7 flex justify-between items-start hover:shadow-md transition-shadow rounded-md border-b border-gray-100">
      {/* Kiri: Konten */}
      <div className={`flex-1 ${hasImage ? "pr-3" : ""}`}>
        {/* Header Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {post.authorImage ? <Image src={post.authorImage} alt={post.author} width={24} height={24} className="object-cover w-6 h-6" /> : <User className="w-4 h-4 text-gray-500" />}
          </div>
          <span className="text-xs text-gray-800 font-medium">{post.author}</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold leading-snug line-clamp-3 mb-1">{post.title}</h2>

        {/* Description */}
        {/* MENGGUNAKAN TEKS POLOS HASIL KONVERSI */}
        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{plainTextDescription}</p>

        {/* Footer */}
        <div className="flex flex-wrap items-center mt-3 gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs">{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{post.views}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{post.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </div>
        </div>
      </div>

      {/* Kanan: Thumbnail Post */}
      {hasImage && (
        <div className="w-24 h-20 rounded-md overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center mt-2">
          <Image src={post.imageUrl as string} alt={post.title} width={96} height={80} className="object-cover w-24 h-20" />
        </div>
      )}

      {/* Tombol collapse */}
      <button className="absolute top-1 right-1 text-gray-400 hover:text-gray-600" aria-label="Collapse">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
