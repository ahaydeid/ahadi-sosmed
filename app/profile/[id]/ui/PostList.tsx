import Link from "next/link";
import PostCard from "@/app/components/PostCard";
import { PostCardData } from "@/lib/types/post";
import { incrementPostViews } from "@/lib/actions/incrementViews";

interface PostListProps {
  posts: PostCardData[];
  loading: boolean;
  isOwner?: boolean;
}

export default function PostList({ posts, loading, isOwner }: PostListProps) {
  return (
    <div className="mt-4 max-w-full mx-auto space-y-2">
      <div className="mb-5">
        <hr className="border border-gray-200 max-w-[95%] mx-auto" />
      </div>

      <h2 className="text-lg font-semibold text-gray-800 ms-5 mt-4">
        Tulisan <span className="font-normal text-gray-600">({posts.length})</span>
      </h2>

      {loading && <p className="text-center py-5 text-gray-500">Memuat tulisan...</p>}
      {!loading && posts.length === 0 && <p className="text-center py-5 text-gray-500">Belum ada tulisan</p>}
      {!loading &&
        posts.map((post) => (
          <Link key={post.id} href={`/post/${post.id}`} className="block transition hover:bg-gray-100" onClick={() => incrementPostViews(post.id)}>
            <PostCard post={post} isOwner={isOwner} />
          </Link>
        ))}
    </div>
  );
}
