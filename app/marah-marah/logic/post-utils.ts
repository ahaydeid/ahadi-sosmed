import { supabase } from "@/lib/supabase/client";

export const animalIcons: Record<string, string> = {
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

export const generateRandomNickname = async (device_id: string) => {
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

export const getOrCreateProfile = async (device_id: string, nickname?: string) => {
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

export const checkDailyLimit = async (device_id: string) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const { data, error } = await supabase.from("rage_posts").select("id").eq("device_id", device_id).gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
  if (error) return false;
  return (data?.length || 0) < 3;
};

export const submitRagePost = async (device_id: string, nickname: string, kata: string, isi: string) => {
  const allowed = await checkDailyLimit(device_id);
  if (!allowed) {
    throw new Error("LIMIT_REACHED");
  }

  const finalName = await getOrCreateProfile(device_id, nickname.trim());
  const { error } = await supabase.from("rage_posts").insert([{ nickname: finalName, kata: kata.trim() || null, isi, device_id }]);
  
  if (error) throw error;
  
  return true;
};
