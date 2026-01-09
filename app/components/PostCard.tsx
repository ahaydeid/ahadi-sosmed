import Image from "next/image";
import { CalendarDays, Eye, Heart, MessageCircle, X, User, BadgeCheck, MoreVertical, Edit, Trash } from "lucide-react";
import { PostCardData } from "@/lib/types/post";
import { formatCompact } from "@/lib/formatCompact";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { extractFirstImage, extractPreviewText } from "@/lib/utils/html";
import { deletePostAction } from "@/lib/actions/postActions";

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
    <div className="relative bg-white p-5 py-7 flex flex-row hover:shadow-sm transition-shadow rounded-xs border-b border-gray-100">
      {/* KIRI: teks */}
      <div className="flex-1 min-w-0 pr-4 flex flex-col justify-between">
        {/* Author */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {post.authorImage ? <Image src={post.authorImage} alt={post.author} width={24} height={24} className="object-cover w-6 h-6" /> : <User className="w-4 h-4 text-gray-500" />}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-800 font-medium">{post.author}</span>
            {post.verified && <BadgeCheck className="w-3 h-3 text-sky-500" />}
          </div>
        </div>

        {/* Judul dan deskripsi */}
        <div className="flex flex-col">
          <h2 className="md:text-2xl text-lg font-bold leading-snug mb-1 line-clamp-3">{post.title}</h2>
          <p className="text-gray-600 text-sm md:text-base mb-2 line-clamp-2">
            {plainTextDescription}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center mt-3 gap-4 text-gray-500 text-sm">
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

      {/* Tombol Option (Menu) */}
      <div className="absolute top-1 right-1">
        {isOwner ? (
          <>
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
          </>
        ) : (
          <button className="text-gray-400 hover:text-gray-600 p-1" aria-label="Collapse" title="Sembunyikan posting ini" onClick={handleCollapse}>
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
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
