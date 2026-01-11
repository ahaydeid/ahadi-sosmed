"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, Heart, MessageCircle, User } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import { formatCompact } from "@/lib/formatCompact";
import { formatReadingTime } from "@/lib/utils/readingTime";
import { extractFirstImage, extractPreviewText } from "@/lib/utils/html";
import BookmarkButton from "./BookmarkButton";
import { PostCardData } from "@/lib/types/post";

interface FeaturedSectionProps {
  posts: (PostCardData & { verified?: boolean })[];
}

export default function FeaturedSection({ posts }: FeaturedSectionProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mb-12 px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Postingan Populer</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-gray-300 to-transparent ml-4"></div>
      </div>

      {/* Featured Posts - Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {posts.map((post) => {
          const image = post.imageUrl || extractFirstImage(post.description);
          const preview = extractPreviewText(post.description);

          return (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="flex-shrink-0 w-72"
            >
              <div className="bg-white rounded-xs overflow-hidden hover:shadow-sm transition-shadow h-full">
                {/* Image */}
                {image && (
                  <div className="relative w-full h-40 overflow-hidden bg-gray-100">
                    <img
                      src={image}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Author */}
                  <div className="flex items-center mb-2">
                    {post.authorImage ? (
                      <Image
                        src={post.authorImage}
                        alt={post.author}
                        width={20}
                        height={20}
                        className="rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-5 h-5 mr-2 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-900 mr-0.5">{post.author}</span>
                    {post.verified && <VerifiedBadge className="w-3 h-3" />}
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-gray-900 mb-2 line-clamp-2 text-sm">
                    {post.title}
                  </h4>

                  {/* Description */}
                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                    {preview}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatReadingTime(post.description)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {formatCompact(post.likes)}
                    </span>
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
