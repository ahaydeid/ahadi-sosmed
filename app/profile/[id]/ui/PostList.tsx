"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import PostCard from "@/app/components/PostCard";
import { PostCardData } from "@/lib/types/post";
import { incrementPostViews } from "@/lib/actions/incrementViews";

interface PostListProps {
  posts: PostCardData[];
  loading: boolean;
  isOwner?: boolean;
}

export default function PostList({ posts, loading, isOwner }: PostListProps) {
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

      <h2 className="text-lg font-semibold text-gray-800 ms-5 mt-4">
        Tulisan <span className="font-normal text-gray-600">({postList.length})</span>
      </h2>

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
