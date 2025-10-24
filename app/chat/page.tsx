"use client";

import { Search, User } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-white px-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white flex justify-between items-center border-b border-b-gray-200 mb-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Pesan</h1>
        <Search className="w-5 h-5 text-gray-800 cursor-pointer" />
      </div>

      {/* Chat Item */}
      <div className="flex items-start mb-5">
        {/* Kiri: avatar + text */}
        <div className="flex items-start gap-3 w-[90%]">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-gray-500" />
          </div>

          {/* Nama & pesan terakhir */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Zahrotuttoyyibah</p>
            <p className="text-gray-500 text-sm line-clamp-1">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a
              type specimen book
            </p>
          </div>
        </div>

        {/* Kanan: waktu + badge */}
        <div className="w-[10%] flex flex-col items-end justify-center text-right">
          <span className="text-[11px] text-green-600 font-medium mb-1">06:10</span>
          <span className="bg-green-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">3</span>
        </div>
      </div>
      {/* Chat Item */}
      <div className="flex items-start mb-5">
        {/* Kiri: avatar + text */}
        <div className="flex items-start gap-3 w-[90%]">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-gray-500" />
          </div>

          {/* Nama & pesan terakhir */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Zahrotuttoyyibah</p>
            <p className="text-gray-500 text-sm line-clamp-1">
              Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a
              type specimen book
            </p>
          </div>
        </div>

        {/* Kanan: waktu + badge */}
        <div className="w-[10%] flex flex-col items-end justify-center text-right">
          <span className="text-[11px] text-green-600 font-medium mb-1">06:10</span>
          <span className="bg-green-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">3</span>
        </div>
      </div>
    </div>
  );
}
