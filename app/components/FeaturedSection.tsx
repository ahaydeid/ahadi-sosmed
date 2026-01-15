// Halaman ini tidak lagi menggunakan "use client" untuk menghindari error hydration

import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, Heart, MessageCircle, User, Repeat2 } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import { formatCompact } from "@/lib/formatCompact";
import { formatReadingTime } from "@/lib/utils/readingTime";
import { extractFirstImage, extractPreviewText } from "@/lib/utils/html";
import { PostCardData } from "@/lib/types/post";

interface FeaturedSectionProps {
  posts: (PostCardData & { verified?: boolean })[];
}

export default function FeaturedSection({ posts }: FeaturedSectionProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Tulisan Populer</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent ml-4"></div>
      </div>

      {/* Featured Posts - Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto md:pb-4 pb-1 scrollbar-hide">
        {posts.map((post) => {
          const image = post.imageUrl;
          const originalImage = post.repost_of?.imageUrl;
          
          const preview = post.excerpt || post.description;
          const isRepost = !!post.repost_of;
          const showTitle = post.title && post.title !== "(Tanpa judul)" && post.title !== post.author;

          return (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="flex-shrink-0 w-72"
            >
              <div className="bg-white rounded-xs overflow-hidden hover:shadow-sm transition-shadow h-full flex flex-col border border-gray-100/50">
                {/* Image Header */}
                {image && (
                  <div className="relative w-full h-40 overflow-hidden bg-gray-100">
                    <img
                      src={image}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Content Area */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Reposter Identity Section */}
                  <div className="flex flex-col mb-2">
                    {isRepost && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mb-0.5 font-medium uppercase tracking-tight">
                        <Repeat2 size={10} /> repost 
                      </span>
                    )}
                    <div className="flex items-center">
                      {post.authorImage ? (
                        <Image
                          src={post.authorImage}
                          alt={post.author}
                          width={20}
                          height={20}
                          className="rounded-full mr-2 object-cover aspect-square"
                        />
                      ) : (
                        <div className="w-5 h-5 mr-2 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-3 h-3 text-gray-500" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-gray-900 mr-0.5">{post.author}</span>
                      {post.verified && <VerifiedBadge className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Main content */}
                  {showTitle && (
                    <h4 className="font-bold text-gray-900 mb-1 line-clamp-2 text-sm leading-snug">
                      {post.title}
                    </h4>
                  )}

                  <p className="text-gray-600 text-xs mb-2 line-clamp-2 leading-relaxed">
                    {preview}
                  </p>

                  {/* REPOST QUOTE BOX */}
                  {isRepost && post.repost_of && (
                    <div className="mb-3 pl-3 border-l-3 border-gray-800 py-1 bg-gray-50/30 rounded-r-xs">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden shrink-0">
                          {post.repost_of.authorImage ? (
                            <Image 
                              src={post.repost_of.authorImage} 
                              alt={post.repost_of.author} 
                              width={20}
                              height={20}
                              className="object-cover w-full h-full" 
                            />
                          ) : (
                            <User className="w-3 h-3 text-gray-500 m-auto mt-1" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 truncate">{post.repost_of.author}</span>
                      </div>
                      
                      <h5 className="text-[11px] font-bold text-gray-900 line-clamp-1 mb-1.5 leading-tight">
                        {post.repost_of.title}
                      </h5>
                      
                      {originalImage && (
                        <div className="my-2 w-full h-28 overflow-hidden bg-gray-200">
                          <img 
                            src={originalImage} 
                            alt={post.repost_of.title} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      )}

                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">
                        {post.repost_of.excerpt || post.repost_of.description}
                      </p>
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="mt-auto pt-1 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatReadingTime(post.description).replace(" menit baca", " min")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatCompact(post.views)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {formatCompact(post.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {formatCompact(post.comments)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
