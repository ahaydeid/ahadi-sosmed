"use client";
import React, { useEffect, useState, useCallback } from "react";
import { X, Send, icons } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { getDeviceId } from "@/lib/device";

type ModalKomentarProps = {
  onClose: () => void;
  postId: string;
};

type Comment = {
  id: string;
  rage_post_id: string;
  parent_id: string | null;
  nickname: string | null;
  isi: string;
  created_at: string;
  device_id: string;
};

type RageProfile = {
  device_id: string;
  nickname: string | null;
  icon_name: string;
  bg_color?: string;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const profileIcons = ["User", "Cat", "Dog", "Heart", "Ghost", "Smile", "Skull", "Star", "Sun", "Moon", "Flame", "Zap"];

// 🔥 pastikan profile ada
const ensureProfile = async (deviceId: string) => {
  const { data: existing } = await supabase.from("rage_profiles").select("device_id").eq("device_id", deviceId).maybeSingle();

  if (!existing) {
    const randomIcon = profileIcons[Math.floor(Math.random() * profileIcons.length)];
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    await supabase.from("rage_profiles").insert([
      {
        device_id: deviceId,
        nickname: "Anonim",
        icon_name: randomIcon,
        bg_color: randomColor,
      },
    ]);
  }
};

const ModalKomentar = ({ onClose, postId }: ModalKomentarProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<RageProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: commentsData } = await supabase.from("rage_comments").select("*").eq("rage_post_id", postId).order("created_at", { ascending: true });

    const { data: profilesData } = await supabase.from("rage_profiles").select("device_id, nickname, icon_name, bg_color");

    setComments(commentsData || []);
    setProfiles(profilesData || []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      await fetchData();
    };

    // panggil async di sini, bukan langsung di body useEffect
    load();

    const channel = supabase
      .channel(`rage_comments_${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rage_comments" }, (payload) => {
        const newComment = payload.new as Comment;
        if (mounted && newComment.rage_post_id === postId) {
          setComments((prev) => [...prev, newComment]);
        }
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData, postId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const deviceId = getDeviceId();

    await ensureProfile(deviceId); // ✅ pastikan profile ada

    const { error } = await supabase.from("rage_comments").insert([
      {
        rage_post_id: postId,
        parent_id: replyTo,
        nickname: "Anonim",
        isi: input.trim(),
        device_id: deviceId,
      },
    ]);

    if (error) {
      console.error("Gagal kirim komentar:", error);
      alert("Gagal kirim komentar 😭");
    } else {
      setInput("");
      setReplyTo(null);
      await fetchData();
    }
  };

  const mainComments = comments.filter((c) => c.parent_id === null);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  const getProfileIcon = (device_id: string) => {
    const profile = profiles.find((p) => p.device_id === device_id);
    if (!profile) return <div className="w-7 h-7 bg-gray-300 rounded-full" />;
    const iconName = profile.icon_name as keyof typeof icons;
    const IconComponent = icons[iconName];
    const bg = profile.bg_color || "#9ca3af";
    return (
      <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
        {IconComponent && <IconComponent className="w-4 h-4 text-white" />}
      </div>
    );
  };

  const getProfileName = (device_id: string, fallback: string | null) => {
    const profile = profiles.find((p) => p.device_id === device_id);
    return profile?.nickname || fallback || "Anonim";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg max-w-[95%] pb-2 max-h-[90vh] flex flex-col relative w-full sm:w-[500px]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        <div className="px-4 pt-3 pb-2 border-b border-b-gray-100">
          <h2 className="text-lg font-bold">Komentar</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-gray-500 text-center">Memuat komentar...</div>
          ) : mainComments.length === 0 ? (
            <div className="text-gray-400 italic text-center">Belum ada komentar 😌</div>
          ) : (
            mainComments.map((main) => (
              <div key={main.id}>
                <div className="flex items-start gap-2">
                  {getProfileIcon(main.device_id)}
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-800 text-sm">{getProfileName(main.device_id, main.nickname)}</h3>
                    <p className="text-sm text-gray-700">{main.isi}</p>
                  </div>
                </div>

                <div className="pl-8 mt-2 space-y-2">
                  {repliesFor(main.id).map((r) => (
                    <div key={r.id} className="flex items-start gap-2 border-l-2 border-gray-200 pl-3">
                      {getProfileIcon(r.device_id)}
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{getProfileName(r.device_id, r.nickname)}</h4>
                        <p className="text-sm text-gray-700">{r.isi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-white sticky bottom-0 flex items-center gap-2">
          <input
            type="text"
            placeholder={replyTo ? "Tulis balasan..." : "Tulis komentar..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button onClick={handleSend} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalKomentar;
