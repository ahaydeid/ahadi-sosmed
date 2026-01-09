import { useState } from "react";
import { Star, Eye, Heart, MessageCircle, Share2, Repeat2, Link2 } from "lucide-react";

interface Props {
  hasApresiasi: boolean;
  likeCount: number;
  views: number;
  comments: number;
  onApresiasi: () => void;
  onShowLikes: () => void;
  onShare: () => void;
  onRepost: () => void; // New prop
}

export default function PostActions({ hasApresiasi, likeCount, views, comments, onApresiasi, onShowLikes, onShare, onRepost }: Props) {
  const [showShareMenu, setShowShareMenu] = useState(false);

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
        
        {/* Share/Repost Dropdown */}
        <div className="relative border-l border-gray-200 pl-2">
            <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1 cursor-pointer hover:text-sky-400 text-gray-700 text-sm" 
                aria-label="Bagikan"
            >
                <Share2 className="w-4 h-4" />
                bagikan
            </button>

            {showShareMenu && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowShareMenu(false)}/>
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <button 
                            onClick={() => { setShowShareMenu(false); onShare(); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
                        >
                            <Link2 className="w-4 h-4" />
                            Salin Tautan
                        </button>
                        <button 
                             onClick={() => { setShowShareMenu(false); onRepost(); }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 border-t border-gray-50"
                        >
                            <Repeat2 className="w-4 h-4" />
                            Repost
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
