"use client";

import Image from "next/image";
import { CalendarDays, Eye, Heart, MessageCircle, X, User } from "lucide-react";

export interface PostCardData {
  id: string;
  author: string;
  authorImage?: string | null; // dari post_content.author_image
  title: string;
  description: string;
  imageUrl?: string | null; // dari post_content.image_url
  date: string;
  views: number;
  likes: number;
  comments: number;
}

interface PostCardProps {
  post: PostCardData;
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className="relative bg-white p-5 shadow-xs flex justify-between items-start hover:shadow-md transition-shadow rounded-md border border-gray-100">
      {/* Kiri: Konten */}
      <div className="flex-1 pr-3">
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
        <p className="text-gray-600 text-sm line-clamp-2 mb-2">{post.description}</p>

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
      <div className="w-24 h-20 rounded-md overflow-hidden bg-gray-200 shrink-0 flex items-center justify-center mt-2">
        {post.imageUrl ? <Image src={post.imageUrl} alt={post.title} width={96} height={80} className="object-cover w-24 h-20" /> : <div className="text-gray-400 text-xs">Tanpa gambar</div>}
      </div>

      {/* Tombol collapse */}
      <button className="absolute top-1 right-1 text-gray-400 hover:text-gray-600" aria-label="Collapse">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
