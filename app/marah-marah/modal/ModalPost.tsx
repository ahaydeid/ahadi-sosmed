"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";

type ModalPostProps = {
  onClose: () => void;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const levels = [
  { emoji: "😌", label: "Sabar Gua" },
  { emoji: "😤", label: "Agak Kesel si" },
  { emoji: "😠", label: "Mulai Emosi" },
  { emoji: "🤯", label: "Gak bisa ini!!!" },
  { emoji: "😡", label: "Emosi gua" },
  { emoji: "🤬", label: "Bangs******t" },
  { emoji: "😈", label: "Awas aja nanti" },
];

const ModalPost = ({ onClose }: ModalPostProps) => {
  const [nickname, setNickname] = useState("");
  const [kata, setKata] = useState("");
  const [isi, setIsi] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nickname.trim() || !isi.trim()) {
      alert("Nama samaran dan isi hati wajib diisi!");
      return;
    }

    const levelObj = levels.find((l) => l.label === selectedLevel);
    const device_id = getDeviceId();

    setLoading(true);

    const { error } = await supabase.from("rage_posts").insert([
      {
        nickname,
        rage_level: levelObj?.label || null,
        rage_emoji: levelObj?.emoji || null,
        kata: kata.trim() || null,
        isi,
        device_id,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Gagal kirim marahan 😭");
    } else {
      alert("Udah terkirim! 😡🔥");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 p-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">Nama Samaran</label>
          <input
            placeholder="e.g. Fufufafa"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="mb-4">
          <p className="font-semibold text-gray-800 mb-2">
            Kondisi level marah sekarang <span className="italic font-light">(opsional)</span>
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            {levels.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSelectedLevel(item.label)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 border text-left transition ${selectedLevel === item.label ? "bg-red-100 border-red-500 text-red-700" : "border-transparent hover:bg-gray-100"}`}
              >
                <span>{item.emoji}</span>
                <span className="truncate">→ {item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-800 font-semibold mb-1">
            1-2 Kata <span className="italic font-light">(opsional)</span>
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
