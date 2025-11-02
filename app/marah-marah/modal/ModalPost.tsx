"use client";
import React, { useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";

type ModalPostProps = {
  onClose: () => void;
  onPostSuccess?: () => void; // ✅ sudah benar
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const animalIcons: Record<string, string> = {
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
  kuda: "Star",
  rusa: "Leaf",
  musang: "Ghost",
  katak: "Droplet",
  bebek: "Water",
  kangguru: "Zap",
  ular: "Infinity",
  rakun: "User",
  macan: "Flame",
  kijang: "Leaf",
  ayam: "Egg",
  paus: "Fish",
  lumba: "Waveform",
  naga: "Flame",
  roh: "Sparkles",
  iblis: "Skull",
  malaikat: "Sun",
  jin: "Ghost",
  peri: "Star",
  hantu: "Ghost",
  seraph: "Sun",
};

const ModalPost = ({ onClose, onPostSuccess }: ModalPostProps) => {
  // ✅ tambahkan onPostSuccess ke sini
  const [nickname, setNickname] = useState("");
  const [kata, setKata] = useState("");
  const [isi, setIsi] = useState("");
  const [loading, setLoading] = useState(false);

  const generateRandomNickname = async (device_id: string) => {
    const animals = Object.keys(animalIcons);
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const iconName = animalIcons[randomAnimal] || "User";
    let baseName = `anonim ${randomAnimal}`;

    const { data: duplicates } = await supabase.from("rage_profiles").select("nickname").ilike("nickname", `${baseName}%`);
    if (duplicates && duplicates.length > 0) {
      const count = duplicates.length + 1;
      baseName = `${baseName} ${count.toString().padStart(2, "0")}`;
    }

    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    await supabase.from("rage_profiles").insert([
      {
        device_id,
        nickname: baseName,
        icon_name: iconName,
        bg_color: randomColor,
      },
    ]);

    return baseName;
  };

  const getOrCreateProfile = async (device_id: string, nickname?: string) => {
    const { data: existingProfile, error: fetchError } = await supabase.from("rage_profiles").select("device_id, nickname").eq("device_id", device_id).maybeSingle();
    if (fetchError) throw fetchError;
    if (existingProfile) return existingProfile.nickname;

    if (!nickname?.trim()) return await generateRandomNickname(device_id);

    const lower = nickname.toLowerCase();
    const iconMatch = animalIcons[lower] || Object.keys(animalIcons).find((key) => lower.includes(key));
    const iconName = (iconMatch && animalIcons[iconMatch]) || "User";
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    await supabase.from("rage_profiles").insert([{ device_id, nickname, icon_name: iconName, bg_color: randomColor }]);

    return nickname;
  };

  const checkDailyLimit = async (device_id: string) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const { data, error } = await supabase.from("rage_posts").select("id").eq("device_id", device_id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
    if (error) return false;
    return (data?.length || 0) < 3;
  };

  const handleSubmit = async () => {
    if (!isi.trim()) {
      alert("Isi hati wajib diisi!");
      return;
    }

    const device_id = getDeviceId();

    try {
      setLoading(true);
      const allowed = await checkDailyLimit(device_id);
      if (!allowed) {
        alert("Lu udah marah 3 kali hari ini 😤. Besok aja lagi 😌");
        setLoading(false);
        return;
      }

      const finalName = await getOrCreateProfile(device_id, nickname.trim());
      const { error } = await supabase.from("rage_posts").insert([{ nickname: finalName, kata: kata.trim() || null, isi, device_id }]);
      if (error) throw error;

      alert("Udah terkirim! 😡🔥");
      onPostSuccess?.(); // ✅ panggil langsung fungsi parent biar refresh
      onClose();
    } catch (err) {
      console.error("❌ Gagal kirim marahan:", err);
      alert("Gagal kirim marahan 😭");
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
