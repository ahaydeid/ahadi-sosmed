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
    try {
      let chatId: string = messageRoomId ?? "";

      // 1️⃣ Buat room jika belum ada
      if (!chatId) {
        const { data, error } = await supabase
          .from("messages")
          .insert([{ sender_id: currentUserId, receiver_id: receiverId }])
          .select("id")
          .single();

        if (error) {
          alert("Gagal membuat room: " + error.message);
          return;
        }
        if (!data?.id) {
          alert("Room tidak terbentuk, data.id kosong");
          return;
        }

        chatId = data.id;
        setMessageRoomId?.(chatId);
      }

      // 2️⃣ Insert pesan
      const { data: inserted, error: msgError } = await supabase
        .from("messages_content")
        .insert([{ message_id: chatId, sender_id: currentUserId, text }])
        .select("id")
        .single();

      if (msgError) {
        alert("Gagal insert messages_content: " + msgError.message);
        return;
      }
      
      // 2.5️⃣ Tandai sebagai terbaca secara instan
      await supabase.from("message_reads").upsert({
        user_id: currentUserId,
        message_id: chatId,
        last_read_at: new Date().toISOString()
      }, { onConflict: "user_id,message_id" });

      // 2.6️⃣ Kirim Push Notification ke Penerima
      // Kita fetch profile pengirim (kita sendiri) untuk badge/nama di notif
      const { data: myProfile } = await supabase
        .from("user_profile")
        .select("display_name, avatar_url")
        .eq("id", currentUserId)
        .single();

      void fetch("/api/notifications/push", {
        method: "POST",
        body: JSON.stringify({
           receiverId,
           text,
           messageId: inserted.id,
           senderName: myProfile?.display_name,
           senderAvatar: myProfile?.avatar_url
        }),
        headers: { "Content-Type": "application/json" }
      }).catch(err => console.error("Push secondary error:", err));

      // 3️⃣ Reset input
      el.value = "";
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    } catch (err) {
      console.error("❌ Error tak terduga:", err);
      alert(err instanceof Error ? err.message : JSON.stringify(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sticky bottom-0 left-0 w-full flex items-center gap-2 pt-1 z-40">
      <div className="flex items-center w-full bg-white border border-gray-300 rounded-lg px-3 py-2">
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
        <Send className="w-5 h-5 transform translate-x-[-1px] translate-y-[1px]" />
      </button>
    </div>
  );
}
