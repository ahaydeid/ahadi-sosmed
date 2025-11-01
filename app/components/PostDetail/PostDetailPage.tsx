"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import PostActions from "./PostActions";
import PostComments from "../PostComments";
import CommentInput from "../CommentInput";
import ModalLikes from "@/app/components/ModalLikes";
import { usePostDetailData } from "./usePostDetailData";

export default function PostDetailPage({ initialPostId, initialSlug }: { initialPostId?: string; initialSlug?: string }) {
  const { post, user, loading, authChecked, hasApresiasi, showLikes, likeCount, authorId, isFollowing, followBusy, setShowLikes, handleApresiasi, handleToggleFollow, handleShare, redirectToLogin } = usePostDetailData(
    initialPostId,
    initialSlug
  );

  if (loading || !post) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat postingan...</div>;
  }

  const showFollow = authorId && (!user || (user && authorId !== user.id));
  const isSelf = !!user && authorId === user.id;

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header atas dengan tombol kembali */}
      <div className="sticky top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 z-10 flex items-center px-4 -mx-4">
        <button onClick={() => window.history.back()} className="absolute left-4 rounded-full hover:bg-gray-100 transition z-20" aria-label="Kembali">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-base text-gray-800 truncate">Tulisan {post.author}</h2>
        </div>
      </div>

      {/* Judul & tanggal */}
      <h1 className="text-2xl text-gray-800 mt-5 font-bold leading-snug mb-2">{post.title}</h1>
      <p className="text-sm text-gray-600 mb-3">{post.date}</p>

      {/* BAGIAN AUTHOR dipindahkan ke sini */}
      <div className="flex items-center gap-2 mb-4 mt-4">
        {authorId ? (
          <Link href={`/profile/${authorId}`} className="flex items-center gap-2 group cursor-pointer" aria-label={`Lihat profil ${post.author}`}>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center ring-1 ring-transparent group-hover:ring-gray-300 transition">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
              {post.author}
              {post.author_verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
            </span>
          </Link>
        ) : (
          <>
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center">
              {post.author_image ? <Image src={post.author_image} alt={post.author} width={32} height={32} className="object-cover w-8 h-8" /> : <div className="w-6 h-6 rounded-full bg-gray-300" />}
            </div>
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
              {post.author}
              {post.author_verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
            </span>
          </>
        )}

        {isSelf ? (
          <span className="text-sm rounded-full px-3 py-0.5 border border-gray-300 italic bg-gray-50 text-gray-600">saya</span>
        ) : (
          showFollow && (
            <button
              onClick={handleToggleFollow}
              disabled={followBusy}
              className={`text-sm rounded-full px-3 py-0.5 transition ${isFollowing ? "border border-gray-300 text-gray-600 italic hover:bg-gray-100" : "border border-sky-500 text-sky-500 hover:bg-sky-50"}`}
            >
              {isFollowing ? "mengikuti" : "ikuti"}
            </button>
          )
        )}
      </div>

      {/* Gambar post */}
      {post.image_url && (
        <div className="w-full rounded-xs overflow-hidden mb-4">
          <Image src={post.image_url as string} alt={post.title} sizes="100vw" width={1600} height={900} className="w-full h-auto" />
        </div>
      )}

      {/* Deskripsi */}
      <div className="text-base text-gray-800 leading-relaxed space-y-4 mb-6 prose max-w-none">
        <ReactMarkdown>{post.description}</ReactMarkdown>
      </div>

      {/* Aksi post */}
      <PostActions hasApresiasi={hasApresiasi} likeCount={likeCount} views={post.views} comments={post.comments} onApresiasi={handleApresiasi} onShowLikes={() => setShowLikes(true)} onShare={handleShare} />

      <hr className="my-4 border-gray-200" />

      {/* Komentar */}
      {authChecked &&
        (user ? (
          <CommentInput postId={post.id} />
        ) : (
          <button onClick={redirectToLogin} className="px-4 py-2 text-left text-sky-600 hover:bg-sky-50 rounded transition text-sm">
            Login untuk berkomentar
          </button>
        ))}

      <h2 className="text-lg font-bold mb-4 mt-4">Komentar</h2>
      <PostComments key={post.id} postId={post.id} />

      {/* Modal Likes */}
      <ModalLikes postId={post.id} open={showLikes} onClose={() => setShowLikes(false)} />
    </div>
  );
}
