import { PostCardData } from "@/lib/types/post";

interface StatsSectionProps {
  posts: PostCardData[];
  followersCount: number;
  followingCount: number;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
}

export default function StatsSection({ posts, followersCount, followingCount, onOpenFollowers, onOpenFollowing }: StatsSectionProps) {
  return (
    <>
      <div className="flex justify-center gap-8 mb-4 mt-2">
        <div className="flex flex-col items-center">
          <p className="font-semibold text-gray-800 text-lg">{posts.length}</p>
          <p className="text-gray-500 text-sm">tulisan</p>
        </div>
        <div onClick={onOpenFollowers} className="flex flex-col items-center cursor-pointer select-none active:scale-[0.98]">
          <p className="font-semibold text-gray-800 text-lg">{followersCount}</p>
          <p className="text-gray-500 text-sm">pengikut</p>
        </div>
        <div onClick={onOpenFollowing} className="flex flex-col items-center cursor-pointer select-none active:scale-[0.98]">
          <p className="font-semibold text-gray-800 text-lg">{followingCount}</p>
          <p className="text-gray-500 text-sm">mengikuti</p>
        </div>
      </div>

      <div className="ms-5">
        
      </div>
      <hr className="border border-gray-100" />
    </>
  );
}
