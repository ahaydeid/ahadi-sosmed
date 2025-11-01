import { Star, Eye, Heart, MessageCircle, Share2 } from "lucide-react";

interface Props {
  hasApresiasi: boolean;
  likeCount: number;
  views: number;
  comments: number;
  onApresiasi: () => void;
  onShowLikes: () => void;
  onShare: () => void;
}

export default function PostActions({ hasApresiasi, likeCount, views, comments, onApresiasi, onShowLikes, onShare }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onApresiasi}
        className={`text-sm px-3 py-2 rounded flex items-center gap-1 border transition
          ${hasApresiasi ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"}`}
      >
        <Star className="w-4 h-4" />
        {hasApresiasi ? "diapresiasi" : "apresiasi"}
      </button>

      <div className="flex items-center gap-3 border-gray-200 border rounded px-3 py-2 w-fit">
        <div className="flex items-center gap-1 text-gray-700 text-sm">
          <Eye className="w-4 h-4" />
          <span>{views}</span>
        </div>
        <button onClick={onShowLikes} className="flex cursor-pointer hover:text-sky-400 items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Lihat yang menyukai">
          <Heart className="w-4 h-4" />
          <span>{likeCount}</span>
        </button>
        <div className="flex items-center gap-1 text-gray-700 text-sm border-l border-gray-200 pl-2">
          <MessageCircle className="w-4 h-4" />
          <span>{comments}</span>
        </div>
        <button onClick={onShare} className="flex items-center gap-1 cursor-pointer hover:text-sky-400 text-gray-700 text-sm border-l border-gray-200 pl-2" aria-label="Bagikan">
          <Share2 className="w-4 h-4" />
          bagikan
        </button>
      </div>
    </div>
  );
}
