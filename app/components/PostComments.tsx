"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import RepliesModal from "@/app/components/RepliesModal";
import ModalLikes from "@/app/components/ModalLikes";
import CommentItem from "@/app/components/CommentItem";
import { usePostComments } from "@/app/hooks/usePostComments";

interface PostCommentsProps {
  postId: string;
}

export default function PostComments({ postId }: PostCommentsProps) {
  const { comments, loadingInitial, loadingMore, hasMore, loadMore, user, authChecked, toggleLike, likeBusy, redirectToLogin } = usePostComments(postId);

  const [openRootId, setOpenRootId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  if (loadingInitial) {
    return (
      <div className="mt-8 text-gray-500 text-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat komentar...
      </div>
    );
  }

  return (
    <div className="mt-1">
      {comments.length === 0 && <p className="text-gray-500 ms-2 text-sm">Belum ada komentar</p>}

      {comments.map((comment) => (
        <div key={comment.id} className="mb-4">
          <CommentItem
            comment={comment}
            likeBusy={likeBusy.has(comment.id)}
            onLike={() => toggleLike(comment.id)}
            onReply={() => {
              if (!authChecked) return;
              if (!user) {
                redirectToLogin();
                return;
              }
              setOpenRootId(comment.id);
            }}
            onShowLikes={() => setSelectedCommentId(comment.id)}
          />
        </div>
      ))}

      <div className="flex justify-center py-4">
        {loadingMore ? (
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        ) : hasMore && comments.length > 0 ? (
          <button onClick={loadMore} className="text-xs text-sky-600 hover:text-sky-700 font-semibold">
            Muat lebih banyak komentar
          </button>
        ) : comments.length > 0 ? (
          <p className="text-gray-500 text-xs">Semua komentar telah dimuat</p>
        ) : null}
      </div>

      {openRootId && <RepliesModal rootCommentId={openRootId} postId={postId} onClose={() => setOpenRootId(null)} />}
      <ModalLikes commentId={selectedCommentId ?? undefined} open={!!selectedCommentId} onClose={() => setSelectedCommentId(null)} />
    </div>
  );
}
