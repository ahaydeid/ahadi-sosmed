import Image from "next/image";
import { CalendarDays, Eye, Heart, MessageCircle, X, User, MoreVertical, Edit, Trash, Repeat2, Clock, MinusCircle } from "lucide-react";
import VerifiedBadge from "./ui/VerifiedBadge";
import { PostCardData } from "@/lib/types/post";
import { formatCompact } from "@/lib/formatCompact";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BookmarkButton from "./BookmarkButton";

import { extractFirstImage, extractPreviewText } from "@/lib/utils/html";
import { deletePostAction } from "@/lib/actions/postActions";
import { formatReadingTime } from "@/lib/utils/readingTime";

interface PostCardProps {
  post: PostCardData & { verified?: boolean };
  isOwner?: boolean;
  onDeleteSuccess?: (postId: string) => void;
}

const COLLAPSE_KEY = "collapsedPosts";

export default function PostCard({ post, isOwner, onDeleteSuccess }: PostCardProps) {
  // Use utility functions to clean up component logic
  const derivedImage = post.imageUrl || extractFirstImage(post.description);
  const hasImage = !!derivedImage;
  const plainTextDescription = extractPreviewText(post.description);

  const handleCollapse: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(COLLAPSE_KEY) : null;
      const arr: string[] = raw ? JSON.parse(raw) : [];
      if (!arr.includes(post.id)) arr.push(post.id);
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(arr));
    } catch {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([post.id]));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("post:penalize", { detail: { postId: post.id, penalty: -100 } }));
    }
  };

  /* Tombol Menu (Titik Tiga) atau Collapse */
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleMenuToggle: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleEdit: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    router.push(`/edit/${post.id}`);
  };

  const handleDeletePost = async () => {
    try {
      setIsDeleting(true);
      const result = await deletePostAction(post.id);
      
      if (result.success) {
        setShowDeleteConfirm(false);
        onDeleteSuccess?.(post.id);
      } else {
        alert(result.error || "Gagal menghapus postingan.");
      }
    } catch (err) {
      console.error("Gagal menghapus post:", err);
      alert("Gagal menghapus postingan.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative bg-white p-7 py-10 flex flex-row hover:shadow-sm transition-shadow rounded-xs border-b border-gray-100">
      {/* KIRI: teks */}
      <div className="flex-1 min-w-0 pr-4 flex flex-col justify-between">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {post.authorImage ? <Image src={post.authorImage} alt={post.author} width={24} height={24} className="object-cover w-6 h-6" /> : <User className="w-4 h-4 text-gray-500" />}
          </div>
          <div className="flex flex-col">
              {post.repost_of && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 leading-none mb-0.5">
                      <Repeat2 size={10} /> repost
                  </span>
              )}
              <div className="flex items-center gap-1 leading-none">
                <span className="text-xs text-gray-800 font-medium">{post.author}</span>
                {post.verified && <VerifiedBadge className="w-3 h-3" />}
              </div>
          </div>
        </div>

        {/* Judul dan deskripsi */}
        <div className="flex flex-col">
          {!(post.isRepost || post.repost_of || post.title === post.author) && (
              <h2 className="md:text-2xl text-lg font-bold leading-snug mb-1 line-clamp-3">{post.title}</h2>
          )}
          <p className="text-gray-600 text-sm md:text-base mb-2 line-clamp-2">
            {plainTextDescription}
          </p>

          {/* Repost Content - Quote Style */}
          {post.repost_of && (
            <div className="mt-3 mx-2 pl-4 border-l-4 border-gray-900 flex gap-4 transition cursor-pointer group" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/post/${post.repost_of!.slug || post.repost_of!.id}`); 
            }}>
                <div className="flex-1 min-w-0 py-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                            {post.repost_of.authorImage ? (
                                <Image src={post.repost_of.authorImage} alt={post.repost_of.author} width={20} height={20} className="object-cover w-full h-full" />
                            ) : (
                                <User className="w-3 h-3 text-gray-500 m-auto mt-1" />
                            )}
                        </div>
                        <span className="font-bold text-sm text-gray-900 truncate">{post.repost_of.author}</span>
                    </div>
                    
                    <p className="font-bold text-base text-gray-900 leading-snug mb-1 line-clamp-1">{post.repost_of.title}</p>
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 md:line-clamp-3">
                        {extractPreviewText(post.repost_of.description)}
                    </p>
                </div>

                 {/* Thumbnail Image if exists */}
                 {extractFirstImage(post.repost_of.description || "") && (
                    <div className="w-16 h-16 md:w-24 md:h-24 shrink-0 overflow-hidden bg-gray-100 block">
                        <img 
                            src={extractFirstImage(post.repost_of.description || "")!} 
                            alt={post.repost_of.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                    </div>
                 )}
            </div>
          )}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center mt-3 gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs">{formatReadingTime(post.description)}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs">{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span title={String(post.views)}>{formatCompact(post.views)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span title={String(post.likes)}>{formatCompact(post.likes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span title={String(post.comments)}>{formatCompact(post.comments)}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isOwner && (
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition" 
                aria-label="Collapse" 
                title="Sembunyikan posting ini" 
                onClick={handleCollapse}
              >
                <MinusCircle className="w-4 h-4" />
              </button>
            )}
            <BookmarkButton postId={post.id} size="sm" />
          </div>
        </div>
      </div>

      {/* KANAN: gambar */}
      {hasImage && (
        <div className="shrink-0 w-24 h-24 overflow-hidden flex items-center justify-center">
          <img 
            src={derivedImage as string} 
            alt={post.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement?.remove();
            }}
          />
        </div>
      )}

      {/* Tombol Option (Menu) - Only for owner */}
      {isOwner && (
        <div className="absolute top-1 right-1">
          <button 
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition" 
            onClick={handleMenuToggle}
            title="Opsi"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
            
            {showMenu && (
               <div className="absolute right-0 top-7 w-32 bg-white shadow-lg rounded-md border border-gray-100 z-50">
                  <button 
                    onClick={handleEdit}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 text-left"
                  >
                    <Trash className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
               </div>
            )}
            
            {/* Backdrop transparent untuk close menu saat klik luar */}
            {showMenu && (
              <div className="fixed inset-0 z-40" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
              }} />
            )}
        </div>
      )}
      {/* Modal Konfirmasi Hapus */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowDeleteConfirm(false);
        }}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Postingan?</h3>
            <p className="text-gray-600 mb-6">
              Postingan ini akan dihapus permanen beserta semua gambar di dalamnya. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 rounded-lg text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
