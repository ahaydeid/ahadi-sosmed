"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";

type ModalReactProps = {
  onClose: () => void;
  postId: string;
  onReactSuccess: () => void;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const reactions = [
  { emoji: "😌", label: "Sabar, bang" },
  { emoji: "🤬", label: "Tai banget sumpah" },
  { emoji: "😤", label: "Emang kurang ajar" },
  { emoji: "😈", label: "Gak bisa didiemin, bang!" },
  { emoji: "😡", label: "Kesel bener gua!" },
];

const ModalReact = ({ onClose, postId, onReactSuccess }: ModalReactProps) => {
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleReaction = async (emoji: string) => {
    const reaction = reactions.find((r) => r.emoji === emoji);
    const deviceId = getDeviceId();

    if (!reaction) {
      console.error("❌ Emoji tidak ditemukan di daftar reactions!");
      return;
    }

    const payload = {
      rage_post_id: postId,
      emoji: reaction.emoji,
      label: reaction.label, // WAJIB
      device_id: deviceId,
    };

    console.log("Insert payload:", payload);

    const { error } = await supabase.from("rage_reacts").insert([payload]);
    if (error) {
      alert("Gagal simpan reaksi: " + JSON.stringify(error));
      console.error("Gagal simpan reaksi:", error);
      return;
    }

    onReactSuccess();

    setIsClosing(true);
    setTimeout(() => {
      setShowEmoji(reaction.emoji);
      setTimeout(() => {
        setShowEmoji(null);
        onClose();
      }, 1500);
    }, 150);
  };

  if (showEmoji) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent">
        <span className="text-[100px] animate-bounce">{showEmoji}</span>
      </div>
    );
  }

  if (isClosing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 p-5 relative">
        {/* Tombol close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        {/* Judul */}
        <h2 className="font-bold text-lg mb-4">Komporin</h2>

        {/* Daftar Reaksi */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-base">
          {reactions.map((r) => (
            <button key={r.label} onClick={() => handleReaction(r.emoji)} className="flex items-center gap-1 px-2 py-1 rounded-md border border-transparent hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition text-left">
              <span>{r.emoji}</span>
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModalReact;
