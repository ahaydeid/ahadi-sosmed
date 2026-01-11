"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import type { CommentData } from "@/lib/types/comment";
import { getInitials } from "@/lib/format";

interface CommentItemProps {
  comment: CommentData;
  onReply: () => void;
  onLike: () => void;
  likeBusy: boolean;
  onShowLikes: () => void;
}

export default function CommentItem({ comment, onReply, onLike, likeBusy, onShowLikes }: CommentItemProps) {
  const liked = comment.likedByMe;

  let replySummary: string | null = null;
  if (comment.respondersUniqueCount > 0) {
    if (comment.respondedByMe) {
      const others = comment.respondersUniqueCount - 1;
      replySummary = others > 0 ? `kamu dan ${others} orang lainnya membalas...` : "kamu membalas...";
    } else if (comment.followedResponderName) {
      const others = comment.respondersUniqueCount - 1;
      replySummary = others > 0 ? `${comment.followedResponderName} dan ${others} orang lainnya membalas...` : `${comment.followedResponderName} membalas...`;
    } else {
      replySummary = `${comment.respondersUniqueCount} orang membalas...`;
    }
  }

  return (
    <div className="flex items-start gap-3">
      {comment.avatarUrl ? (
        <Image src={comment.avatarUrl} alt={comment.author} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className={`w-8 h-8 rounded-full ${comment.avatarColor} flex items-center justify-center text-white font-semibold text-sm`}>
          <span>{getInitials(comment.author)}</span>
        </div>
      )}

      <div className="flex-1">
        <div className="bg-gray-100 rounded-xl p-3">
          <Link href={`/profile/${comment.user_id}`} className="flex items-center gap-1 mb-1 hover:underline">
            <p className="font-semibold text-sm text-gray-800">{comment.author}</p>
            {comment.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </Link>

          <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.text}</p>
        </div>

        <div className="flex items-center gap-6 mt-2 text-sm text-gray-700">
          <span>{comment.time}</span>
          <button className={`hover:underline disabled:opacity-50 ${liked ? "text-sky-700" : ""}`} onClick={onLike} disabled={likeBusy}>
            {liked ? "Batal Suka" : "Suka"}
          </button>
          <button className="hover:underline" onClick={onReply}>
            Balas
          </button>
          <button type="button" onClick={onShowLikes} className="flex hover:text-sky-400 items-center gap-1" aria-label="Lihat yang menyukai komentar">
            <Heart className={`w-4 h-4 ${liked ? "text-sky-600" : "text-gray-700 hover:text-sky-400"}`} />
            <span>{comment.likes}</span>
          </button>
        </div>

        {replySummary && (
          <button type="button" onClick={onReply} className="text-xs text-gray-600 mt-1 hover:underline text-left">
            {replySummary}
          </button>
        )}
      </div>
    </div>
  );
}


