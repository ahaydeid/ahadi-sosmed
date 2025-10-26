// components/CommentInput.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";

interface CommentInputProps {
  postId: string;
  parentCommentId?: string | null;
  onCommentSent?: () => void;
}

export default function CommentInput({ postId, parentCommentId = null, onCommentSent }: CommentInputProps) {
  const supabase = createClientComponentClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Auto expand tinggi textarea (maks 200px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [text]);

  // --- Cek user login
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
      setLoading(false);
    };
    fetchUser();
  }, [supabase]);

  // --- Kirim komentar
  const handleSendComment = async () => {
    if (!text.trim() || !user) return;

    const { error: insertError } = await supabase.from("comments").insert([
      {
        post_id: postId,
        user_id: user.id,
        parent_comment_id: parentCommentId,
        text: text.trim(),
      },
    ]);

    if (insertError) {
      console.error("Gagal mengirim komentar:", insertError.message);
      return;
    }

    setText("");
    onCommentSent?.();
  };

  if (loading) return null;

  // --- Jika belum login
  if (!user) {
    return (
      <div className="mt-3">
        <a href="/login" className="inline-block rounded-md text-blue-600 mb-5 text-sm py-1font-sm hover:bg-sky-600 transition">
          Login untuk berkomentar
        </a>
      </div>
    );
  }

  // --- Jika sudah login
  return (
    <div className="flex gap-2 mt-3 mb-5">
      <textarea
        ref={textareaRef}
        className="flex-1 resize-none rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        placeholder="Tulis komentar..."
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ maxHeight: "200px", overflowY: "auto" }}
      />
      {/* Tambahkan 'self-end' di sini untuk menyelaraskan ke bawah dalam konteks flex container utama */}
      <div className="flex self-end">
        {/* Hapus 'bottom-0' karena tidak berfungsi tanpa 'position: absolute' dan tambahkan 'h-full' jika ingin setinggi div induk, tapi lebih baik biarkan sesuai konten. */}
        <button onClick={handleSendComment} disabled={!text.trim()} className="flex max-h-10 rounded-full bg-sky-600 p-3 text-white disabled:opacity-50 hover:bg-sky-600 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
