"use client";

import React, { useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Image as ImageIcon, Send } from "lucide-react";

interface ChatInputProps {
  receiverId: string;
  messageRoomId: string | null;
  currentUserId?: string | null;
  setMessageRoomId?: (id: string) => void;
}

export default function ChatInput({ receiverId, messageRoomId, currentUserId, setMessageRoomId }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [sending, setSending] = useState(false);

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 200;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  };

  const handleSend = async () => {
    const el = textareaRef.current;
    if (!el || !currentUserId) return;
    const text = el.value.trim();
    if (!text) return;

    setSending(true);
    console.log("=== Mulai kirim pesan ===");
    console.log("receiverId:", receiverId);
    console.log("messageRoomId:", messageRoomId);
    console.log("currentUserId:", currentUserId);

    try {
      let chatId: string = messageRoomId ?? "";

      // 1️⃣ Buat room jika belum ada
      if (!chatId) {
        console.log("Belum ada chatId, buat room baru...");
        const { data, error } = await supabase
          .from("messages")
          .insert([{ sender_id: currentUserId, receiver_id: receiverId }])
          .select("id")
          .single();

        if (error) {
          console.error("Gagal buat room:", error);
          alert("Gagal membuat room: " + error.message);
          return;
        }
        if (!data?.id) {
          alert("Room tidak terbentuk, data.id kosong");
          return;
        }

        chatId = data.id;
        console.log("Room berhasil dibuat:", chatId);
        setMessageRoomId?.(chatId);
      }

      // 2️⃣ Insert pesan
      console.log("Kirim pesan ke messages_content...");
      const { data: inserted, error: msgError, status, statusText } = await supabase
        .from("messages_content")
        .insert([{ message_id: chatId, sender_id: currentUserId, text }])
        .select("id")
        .single();

      console.log("Insert result:", { inserted, msgError, status, statusText });

      if (msgError) {
        console.error("Error insert messages_content:", msgError);
        alert("Gagal insert messages_content: " + msgError.message);
        return;
      }
      if (!inserted?.id) {
        alert("Insert messages_content tidak mengembalikan ID!");
        return;
      }

      console.log("Pesan berhasil dikirim:", inserted.id);

      // 3️⃣ Reset input
      el.value = "";
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    } catch (err) {
      console.error("❌ Error tak terduga:", err);
      alert(err instanceof Error ? err.message : JSON.stringify(err));
    } finally {
      setSending(false);
      console.log("=== Selesai kirim pesan ===");
    }
  };

  return (
    <div className="sticky bottom-0 left-0 w-full flex items-end gap-2 pt-1 z-40">
      <div className="flex items-end w-full bg-white border border-gray-300 rounded-lg px-3 py-2">
        <textarea
          ref={textareaRef}
          placeholder="Tulis pesan..."
          className="w-full resize-none outline-none text-sm text-gray-700 bg-transparent px-1 py-1 overflow-y-hidden"
          rows={1}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
        />
        <ImageIcon className="w-5 h-5 text-gray-700 cursor-pointer shrink-0 ml-2" />
      </div>
      <button
        onClick={handleSend}
        disabled={sending}
        className="flex items-center justify-center bg-sky-600 text-white w-10 h-10 rounded-full shadow active:scale-95 transition shrink-0 disabled:opacity-50"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
