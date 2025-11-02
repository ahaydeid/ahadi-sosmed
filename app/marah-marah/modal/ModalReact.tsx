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

const creatureIcons: Record<string, string> = {
  kucing: "Cat",
  anjing: "Dog",
  harimau: "Flame",
  serigala: "Skull",
  elang: "Feather",
  burung: "Bird",
  kelinci: "Rabbit",
  panda: "Heart",
  gajah: "Shield",
  monyet: "Smile",
  koala: "Moon",
  singa: "Crown",
  beruang: "Mountain",
  rusa: "Leaf",
  musang: "Ghost",
  katak: "Droplet",
  bebek: "Water",
  kangguru: "Zap",
  ular: "Infinity",
  rakun: "User",
  naga: "Flame",
  roh: "Sparkles",
  iblis: "Skull",
  malaikat: "Angel",
  jin: "Ghost",
  peri: "Star",
  hantu: "Ghost",
  seraph: "Sun",
};

const ensureProfile = async (deviceId: string) => {
  const { data: existing, error: fetchError } = await supabase.from("rage_profiles").select("device_id").eq("device_id", deviceId).maybeSingle();

  if (fetchError) console.error("Gagal cek profil:", fetchError);
  if (existing) return;

  const creatures = Object.keys(creatureIcons);
  const randomCreature = creatures[Math.floor(Math.random() * creatures.length)];
  const iconName = creatureIcons[randomCreature] || "User";
  let baseName = `anonim ${randomCreature}`;

  const { data: duplicates } = await supabase.from("rage_profiles").select("nickname").ilike("nickname", `${baseName}%`);

  if (duplicates && duplicates.length > 0) {
    const count = duplicates.length + 1;
    baseName = `${baseName} ${count.toString().padStart(2, "0")}`;
  }

  const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  const { error: insertError } = await supabase.from("rage_profiles").insert([
    {
      device_id: deviceId,
      nickname: baseName,
      icon_name: iconName,
      bg_color: randomColor,
    },
  ]);

  if (insertError) console.error("Gagal buat profil otomatis:", insertError);
};

const reactions = ["🙏", "😌", "😤", "😡", "🤬", "😈"];

const ModalReact = ({ onClose, postId, onReactSuccess }: ModalReactProps) => {
  const [showEmoji, setShowEmoji] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleReaction = async (emoji: string) => {
    const deviceId = getDeviceId();
    await ensureProfile(deviceId);

    const payload = {
      rage_post_id: postId,
      emoji,
      device_id: deviceId,
    };

    const { error } = await supabase.from("rage_reacts").insert([payload]);
    if (error) {
      alert("Gagal simpan reaksi: " + JSON.stringify(error));
      console.error("Gagal simpan reaksi:", error);
      return;
    }

    onReactSuccess();
    setIsClosing(true);
    setTimeout(() => {
      setShowEmoji(emoji);
      setTimeout(() => {
        setShowEmoji(null);
        onClose();
      }, 1000);
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
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>
        <h2 className="font-bold text-lg mb-4">Komporin</h2>
        <div className="grid grid-cols-3 gap-4 text-2xl justify-items-center">
          {reactions.map((emoji) => (
            <button key={emoji} onClick={() => handleReaction(emoji)} className="p-2 hover:scale-125 transition-transform">
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModalReact;
