"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PostCard from "@/app/components/PostCard";
import { PostCardData } from "@/lib/types/post";
import { incrementPostViews } from "@/lib/actions/incrementViews";
import Link from "next/link";
import { Pencil } from "lucide-react";

interface PostListProps {
  posts: PostCardData[];
  loading: boolean;
  isOwner?: boolean;
  canPost?: boolean;
}

export default function PostList({ posts, loading, isOwner, canPost }: PostListProps) {
  const router = useRouter();
  const [postList, setPostList] = useState(posts);

  useEffect(() => {
    setPostList(posts);
  }, [posts]);

  const handleDeleteSuccess = (deletedPostId: string) => {
    setPostList((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  return (
    <div className="mt-4 max-w-full mx-auto md:px-4 space-y-2">
      <div className="mb-5">
        <hr className="border border-gray-200 max-w-[95%] mx-auto" />
      </div>

      <div className="flex items-center justify-between px-5 mt-4 mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          Tulisan <span className="font-normal text-gray-600">({postList.length})</span>
        </h2>

        {isOwner && (
          <div>
            {canPost ? (
              <Link
                href="/write"
                className="flex items-center px-4 h-9 rounded-lg space-x-2 bg-black hover:bg-gray-800 transition whitespace-nowrap"
              >
                <Pencil className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">Buat tulisan</span>
              </Link>
            ) : (
              <Link
                href="/poster"
                className="flex items-center px-4 h-9 rounded-lg bg-black hover:bg-gray-800 transition whitespace-nowrap"
              >
                <span className="text-sm font-medium text-white">Ajukan Poster</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {loading && <p className="text-center py-5 text-gray-500">Memuat tulisan...</p>}
      {!loading && postList.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada tulisan</p>}
      {!loading &&
        postList.map((post) => (
          <div
            key={post.id}
            onClick={() => {
              incrementPostViews(post.id);
              router.push(`/post/${post.slug || post.id}`);
            }}
            className="block transition hover:bg-gray-100 cursor-pointer"
          >
            <PostCard post={post} isOwner={isOwner} onDeleteSuccess={handleDeleteSuccess} />
          </div>
        ))}
    </div>
  );
}
