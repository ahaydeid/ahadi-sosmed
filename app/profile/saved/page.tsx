"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Eye, Heart, MessageCircle, Bookmark, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import useSWR, { mutate } from "swr";
import { useSidebar } from "@/app/context/SidebarContext";

interface SavedPost {
  id: string;
  title: string;
  description: string;
  slug: string;
  author_image: string | null;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  created_at: string;
  saved_at: string;
  likes_count: number;
  comments_count: number;
  views: number;
}

interface SavedResponse {
  success: boolean;
  posts: SavedPost[];
  total: number;
  page: number;
  hasMore: boolean;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SavedPostsPage() {
  const [page, setPage] = useState(1);
  const { isCollapsed } = useSidebar();
  
  // Use SWR for caching and performance
  const { data, error, isLoading } = useSWR<SavedResponse>(
    `/api/posts/saved?page=${page}&limit=20`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true
    }
  );

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const hasMore = data?.hasMore || false;

  const handleUnsave = async (postId: string) => {
    // Optimistic Update: Remove from local cache immediately
    if (data) {
      const updatedPosts = data.posts.filter((p) => p.id !== postId);
      mutate(`/api/posts/saved?page=${page}&limit=20`, {
        ...data,
        posts: updatedPosts,
        total: total - 1
      }, false);
    }

    try {
      const response = await fetch("/api/posts/save", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) throw new Error("Failed to unsave");
      
      // Revalidate to ensure sync with server
      mutate(`/api/posts/saved?page=${page}&limit=20`);
    } catch (error) {
      console.error("Error unsaving post:", error);
      // Revert on error
      mutate(`/api/posts/saved?page=${page}&limit=20`);
    }
  };

  const calculateReadingTime = (description: string) => {
    const words = description.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading && page === 1 && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div>
           <p className="text-red-500 font-medium mb-2">Gagal memuat postingan tersimpan</p>
           <button onClick={() => mutate(`/api/posts/saved?page=${page}&limit=20`)} className="text-sky-500 hover:underline">Coba lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Premium Sticky Header */}
      <header className={`fixed top-0 right-0 bg-white border-b border-gray-200 z-20 h-14 flex items-center justify-center px-4 transition-all duration-300 ${isCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"}`}>
        <button 
          onClick={() => window.history.back()}
          className="absolute left-4 text-gray-700 hover:text-black transition p-1 hover:bg-gray-100 rounded-full"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 truncate">
          Posting Tersimpan
        </h1>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 pt-20">
        {/* Post Count in Content Area */}
        <div className="mb-6">
          <p className="text-gray-500 font-medium">
            {total} {total === 1 ? "postingan" : "postingan"} tersimpan
          </p>
        </div>

        {/* Empty State */}
        {posts.length === 0 && !isLoading && (
          <div className="bg-white rounded-xs p-12 text-center border border-gray-100 shadow-sm max-w-4xl mx-auto">
            <Bookmark className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Belum ada postingan tersimpan
            </h2>
            <p className="text-gray-600 mb-6">
              Simpan postingan yang kamu sukai untuk dibaca nanti.
            </p>
            <Link
              href="/"
              className="inline-block bg-sky-500 text-white px-6 py-2 rounded-lg hover:bg-sky-600 transition shadow-sm font-medium"
            >
              Jelajahi Beranda
            </Link>
          </div>
        )}

        {/* Posts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => {
            // Extract first image from description
            const imageMatch = post.description.match(/<img[^>]*\s+src=["']([^"'>]+)["']/i);
            const postImage = imageMatch ? imageMatch[1] : null;

            return (
              <div
                key={post.id}
                className="bg-white rounded-xs overflow-hidden hover:shadow-sm transition-shadow border border-gray-100 flex flex-col h-full"
              >
                <Link
                  href={`/post/${post.slug || post.id}`}
                  className="flex flex-col flex-1"
                >
                  {/* Thumbnail Container */}
                  {postImage && (
                    <div className="w-full h-48 flex-shrink-0">
                      <img
                        src={postImage}
                        alt={post.title}
                        className="w-full h-full object-cover border-b border-gray-50"
                      />
                    </div>
                  )}

                  {/* Content Area */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Author */}
                    <div className="flex items-center gap-2 mb-3">
                      {post.author.avatar_url ? (
                        <Image
                          src={post.author.avatar_url}
                          alt={post.author.display_name}
                          width={24}
                          height={24}
                          className="rounded-full object-cover w-5 h-5 border border-gray-100"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[8px] font-bold">
                          {post.author.display_name[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-medium text-gray-700 truncate">
                        {post.author.display_name}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-gray-900 mb-2 hover:text-sky-600 transition line-clamp-2 leading-tight">
                      {post.title}
                    </h2>

                    {/* Description */}
                    <p className="text-gray-500 mb-4 line-clamp-2 text-xs leading-relaxed">
                      {post.description.replace(/<[^>]*>/g, "")}
                    </p>

                    {/* Meta Info (Sticky at bottom of content) */}
                    <div className="mt-auto pt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {calculateReadingTime(post.description)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.views}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Actions Bar */}
                <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 italic">
                    Disimpan {formatDate(post.saved_at)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleUnsave(post.id);
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1.5 px-2 py-1 hover:bg-red-50 rounded"
                  >
                    <Bookmark className="w-3 h-3 fill-current" />
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More - Simplified for now as it's separate SWR calls per page in this simple implementation */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setPage(page + 1)}
              disabled={isLoading}
              className="bg-white border border-gray-200 text-gray-700 px-8 py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 font-medium shadow-sm"
            >
              {isLoading ? "Memuat..." : "Muat lebih banyak"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
