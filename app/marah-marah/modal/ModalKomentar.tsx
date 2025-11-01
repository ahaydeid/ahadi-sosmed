"use client";
import React, { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
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
  emoji: string;
  isi: string;
  created_at: string;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const ModalKomentar = ({ onClose, postId }: ModalKomentarProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  // Ambil komentar dari DB
  useEffect(() => {
    let mounted = true;

    const fetchComments = async () => {
      const { data, error } = await supabase.from("rage_comments").select("*").eq("rage_post_id", postId).order("created_at", { ascending: true });

      if (error) console.error("Gagal ambil komentar:", error);
      else if (mounted) setComments(data || []);

      setLoading(false);
    };

    fetchComments();

    // Realtime listener untuk komentar baru, update, dan hapus
    const channel = supabase
      .channel(`rage_comments_${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rage_comments" }, (payload) => {
        const newComment = payload.new as Comment;
        if (newComment.rage_post_id === postId) {
          setComments((prev) => [...prev, newComment]);
        }
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rage_comments" }, (payload) => {
        setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rage_comments" }, (payload) => {
        const updated = payload.new as Comment;
        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [postId]);

  // Kirim komentar baru
  const handleSend = async () => {
    if (!input.trim()) return;

    const deviceId = getDeviceId();

    const newComment = {
      rage_post_id: postId,
      parent_id: replyTo,
      nickname: "Anonim",
      emoji: replyTo ? "😤" : "😡",
      isi: input.trim(),
      device_id: deviceId,
    };

    const { error } = await supabase.from("rage_comments").insert(newComment);
    if (error) console.error("Gagal kirim komentar:", error);
    else {
      setInput("");
      setReplyTo(null);
    }
  };

  const mainComments = comments.filter((c) => c.parent_id === null);
  const repliesFor = (id: string) => comments.filter((c) => c.parent_id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg max-w-[95%] pb-2 max-h-[90vh] flex flex-col relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        <div className="p-4">
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
                <div className="flex flex-col">
                  <p className="font-semibold text-gray-800">
                    {main.nickname} {main.emoji}
                  </p>
                  <p className="text-sm text-gray-700">{main.isi}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-400 mr-5">
                      {new Date(main.created_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button onClick={() => setReplyTo(replyTo === main.id ? null : main.id)} className="text-xs text-red-500 hover:underline">
                      Balas
                    </button>
                  </div>
                </div>

                <div className="pl-6 mt-2 space-y-2">
                  {repliesFor(main.id).map((r) => (
                    <div key={r.id} className="border-l-2 border-gray-200 pl-3">
                      <p className="font-semibold text-gray-800">
                        {r.nickname} {r.emoji}
                      </p>
                      <p className="text-sm text-gray-700">{r.isi}</p>
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(r.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-white sticky bottom-0 flex items-center gap-2 border-t">
          {replyTo && <span className="text-xs text-gray-500 absolute -top-4 left-4 italic">Balas komentar...</span>}
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
