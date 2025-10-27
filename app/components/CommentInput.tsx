// components/CommentInput.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient"; // gunakan klien yang sama
import type { User } from "@supabase/supabase-js";

interface CommentInputProps {
  postId: string;
  parentCommentId?: string | null;
  onCommentSent?: () => void;
}

export default function CommentInput({ postId, parentCommentId = null, onCommentSent }: CommentInputProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto expand tinggi textarea (maks 200px)
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  // Sinkronkan status auth dengan klien yang sama
  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      setAuthChecked(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSendComment = async () => {
    if (!text.trim() || !user) return;

    const { error } = await supabase.from("comments").insert([
      {
        post_id: postId,
        user_id: user.id,
        parent_comment_id: parentCommentId,
        text: text.trim(),
      },
    ]);

    if (error) {
      console.error("Gagal mengirim komentar:", error.message);
      return;
    }

    setText("");
    onCommentSent?.();
  };

  // Tunggu pengecekan auth agar tidak flicker
  if (!authChecked) return null;

  // ❗️Kalau belum login: JANGAN render apa pun (biar parent yang tampilkan "Login untuk berkomentar")
  if (!user) return null;

  // Sudah login → render textarea & tombol kirim (UI tidak diubah)
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
      <div className="flex self-end">
        <button onClick={handleSendComment} disabled={!text.trim()} className="flex max-h-10 rounded-full bg-sky-600 p-3 text-white disabled:opacity-50 hover:bg-sky-600 transition" aria-label="Kirim komentar">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
