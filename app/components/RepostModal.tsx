"use client";

import { useState } from "react";
import Image from "next/image";
import { X, User } from "lucide-react";
import { formatCompact } from "@/lib/formatCompact";

interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
  originalPost: {
    id: string;
    author: string;
    author_image?: string | null;
    title: string;
    date: string;
  };
}

export default function RepostModal({ isOpen, onClose, onSubmit, originalPost }: RepostModalProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);
    await onSubmit(comment);
    setLoading(false);
    onClose();
    setComment("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Repost this?</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <textarea
            className="w-full text-base placeholder-gray-400 focus:outline-none resize-none mb-4"
            rows={3}
            placeholder="Apa yang Anda pikirkan tentang ini?"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            autoFocus
          />

          {/* Original Post Preview Card */}
          <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 flex gap-3 pointer-events-none select-none">
            <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden shrink-0">
               {originalPost.author_image ? (
                   <Image src={originalPost.author_image} alt={originalPost.author} width={40} height={40} className="object-cover w-full h-full" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500">
                       <User size={20} />
                   </div>
               )}
            </div>
            <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{originalPost.author}</p>
                <p className="font-medium text-sm text-gray-800 line-clamp-1">{originalPost.title}</p>
                <p className="text-xs text-gray-500">{originalPost.date}</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-full transition"
          >
            Batal
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Mengirim..." : "Repost"}
          </button>
        </div>
      </div>
    </div>
  );
}
