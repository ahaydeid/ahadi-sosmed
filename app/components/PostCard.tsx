'use client';

import { CalendarDays, Eye, Heart, MessageCircle, MinusCircle } from 'lucide-react';

export interface PostCardData {
  id: string;
  author: string;
  title: string;
  description: string;
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
    <div className="relative bg-white p-5 shadow-xs flex justify-between items-start hover:shadow-md transition-shadow">
      {/* Konten kiri */}
      <div className="flex-1 pr-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-red-500 rounded-full" />
          <span className="text-xs text-gray-800 font-medium">{post.author}</span>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold leading-snug line-clamp-3 mt-2 mb-1">{post.title}</h2>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{post.description}</p>

        {/* Footer */}
        <div className="flex flex-wrap items-center mt-4 gap-4 text-gray-500 text-sm">
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

      {/* Thumbnail kanan */}
      <div className="w-20 mt-6 h-16 bg-gray-200 rounded-xs shrink-0" />

      {/* Tombol collapse */}
      <button
        className="absolute top-1 right-1 text-gray-400 hover:text-gray-600"
        aria-label="Collapse"
      >
        <MinusCircle className="w-5 h-5" />
      </button>
    </div>
  );
}
