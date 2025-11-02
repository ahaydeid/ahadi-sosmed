"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

type ModalReactListProps = {
  onClose: () => void;
  postId: string;
};

type ReactionItem = {
  emoji: string;
  count: number;
};

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const ModalReactList = ({ onClose, postId }: ModalReactListProps) => {
  const [reactions, setReactions] = useState<ReactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReactions = async () => {
      if (!postId) return;
      setLoading(true);

      const { data, error } = await supabase.from("rage_reacts").select("emoji").eq("rage_post_id", postId);

      if (error) {
        console.error("Gagal ambil data reaksi:", error);
        setLoading(false);
        return;
      }

      const grouped: Record<string, ReactionItem> = {};
      data.forEach((r) => {
        if (!grouped[r.emoji]) {
          grouped[r.emoji] = { emoji: r.emoji, count: 1 };
        } else {
          grouped[r.emoji].count++;
        }
      });

      const sorted = Object.values(grouped).sort((a, b) => b.count - a.count);
      setReactions(sorted);
      setLoading(false);
    };

    fetchReactions();
  }, [postId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl w-full max-w-md mx-4 p-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-600 hover:text-black transition">
          <X className="w-6 h-6" />
        </button>

        <h2 className="font-bold text-lg mb-4">Reaksi orang-orang</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-4">Memuat...</div>
        ) : reactions.length === 0 ? (
          <div className="text-center text-gray-500 italic py-4">Belum ada yang bereaksi 😌</div>
        ) : (
          <div className="flex flex-col gap-3 text-base">
            {reactions.map((r) => (
              <div key={r.emoji} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{r.emoji}</span>
                </div>
                <span className="font-semibold text-gray-700">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalReactList;
