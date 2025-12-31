"use client";
import React, { useState } from "react";
import { X } from "lucide-react";

import { getDeviceId } from "@/lib/device";

type ModalPostProps = {
  onClose: () => void;
  onPostSuccess?: () => void; // ✅ sudah benar
};

import { submitRagePost } from "../logic/post-utils";

const ModalPost = ({ onClose, onPostSuccess }: ModalPostProps) => {
  const [nickname, setNickname] = useState("");
  const [kata, setKata] = useState("");
  const [isi, setIsi] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!isi.trim()) {
      alert("Isi hati wajib diisi!");
      return;
    }

    const device_id = getDeviceId();

    try {
      setLoading(true);
      await submitRagePost(device_id, nickname, kata, isi);

      alert("Udah terkirim! 😡🔥");
      onPostSuccess?.();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message === "LIMIT_REACHED") {
        alert("Lu udah marah 3 kali hari ini 😤. Besok aja lagi 😌");
      } else {
        console.error("❌ Gagal kirim marahan:", err);
        alert("Gagal kirim marahan 😭");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 p-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">
            Nama Samaran <span className="text-gray-400 italic font-light">(opsional)</span>
          </label>
          <input
            placeholder="e.g. fufufafa"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">
            1-2 Kata <span className="italic text-gray-400 font-light">(opsional)</span>
          </label>
          <input
            type="text"
            value={kata}
            onChange={(e) => setKata(e.target.value)}
            placeholder="e.g. Adili jokowi"
            className="w-full border border-gray-300 rounded-md p-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="mb-5">
          <label className="block text-gray-800 font-semibold mb-1">Isi Hati</label>
          <textarea
            rows={4}
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Luapin di sini..."
            className="w-full border border-gray-300 rounded-md p-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          ></textarea>
        </div>

        <button onClick={handleSubmit} disabled={loading} className={`w-full bg-red-600 text-white font-bold text-lg py-2 rounded-md transition ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-red-700"}`}>
          {loading ? "Ngamuk dulu..." : "Kirim"}
        </button>
      </div>
    </div>
  );
};

export default ModalPost;
