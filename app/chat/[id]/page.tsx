"use client";

import { User, MoreVertical } from "lucide-react";

export default function ChatDetailPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col px-3 pt-4 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white flex items-center justify-between pb-3">
        <div className="flex items-center gap-3 pt-3">
          <div className="w-10 h-10 rounded-full border flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <h1 className="font-semibold text-gray-800">Zahrotuttoyyibah</h1>
        </div>
        <MoreVertical className="w-5 h-5 text-gray-600 cursor-pointer" />
      </div>

      {/* Chat Content */}
      <div className="flex flex-col gap-3 mt-4">
        {/* Pesan kiri */}
        <div className="flex justify-start">
          <div className="relative bg-gray-100 rounded-xl px-3 py-2 max-w-[75%]">
            <p className="text-sm text-gray-800">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s</p>
            <span className="absolute bottom-1 right-2 text-[11px] text-gray-500 z-10">06:10</span>
          </div>
        </div>

        {/* Pesan kanan */}
        <div className="flex justify-end">
          <div className="relative bg-green-200 rounded-xl px-3 py-2 max-w-[75%]">
            <p className="text-sm text-gray-800">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s</p>
            <span className="absolute bottom-1 right-2 text-[11px] text-gray-600 z-10">06:12</span>
          </div>
        </div>

        {/* Pesan kiri lagi */}
        <div className="flex justify-start">
          <div className="relative bg-gray-100 rounded-xl px-3 py-2 max-w-[75%]">
            <p className="text-sm text-gray-800">Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industrys standard dummy text ever since the 1500s</p>
            <span className="absolute bottom-1 right-2 text-[11px] text-gray-500 z-10">06:13</span>
          </div>
        </div>
      </div>
    </div>
  );
}
