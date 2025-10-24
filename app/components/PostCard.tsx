"use client";

import { CalendarDays, Eye, Heart, MessageCircle, MinusCircle } from "lucide-react";

interface PostCardProps {
  post: {
    author: string;
    title: string;
    description: string;
    date: string;
    views: number;
    likes: number;
    comments: number;
  };
}

export default function PostCard({
  post = {
    author: "Ahadi Hadi",
    title: "Lorem Ipsum is simply dummy text of the printing and typesetting industry",
    description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry.",
    date: "4 hari lalu",
    views: 167,
    likes: 76,
    comments: 30,
  },
}: PostCardProps) {
  return (
    // Tetap flex-row di semua ukuran. Gunakan `items-stretch` untuk memastikan tinggi konsisten.
    // Menghapus 'flex-col sm:flex-row' diganti dengan 'flex' saja
    <div className="relative bg-white p-5 shadow-xs flex justify-between items-start">
      {/* Kiri: konten */}
      {/* Konten akan menyusut (flex-1) untuk memberi ruang thumbnail */}
      <div className="flex-1 pr-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          <span className="text-xs text-gray-800">{post.author}</span>
          {/* <button className="text-blue-600 text-sm font-semibold">follow</button> */}
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold leading-snug line-clamp-3 mt-2 mb-1">{post.title}</h2>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{post.description}</p>

        {/* Footer info */}
        {/* Tambahkan flex-wrap agar metrik (views, likes) pindah baris jika layar sangat sempit */}
        <div className="flex flex-wrap items-center mt-5 gap-3 text-gray-500 text-sm">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span className="text-xs">{post.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{post.views}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{post.likes}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </div>
        </div>
      </div>

      {/* Kanan: thumbnail (Tetap kecil dan di samping di semua ukuran) */}
      {/* Mengembalikan ke kode asli Anda, hanya menghapus kelas responsif dari modifikasi sebelumnya */}
      <div className="w-20 mt-7 h-16 bg-gray-200 rounded-xs shrink-0"></div>

      {/* Tombol collapse */}
      <button className="absolute top-1 right-1 text-gray-400 hover:text-gray-600">
        <MinusCircle className="w-5 h-5" />
      </button>
    </div>
  );
}
