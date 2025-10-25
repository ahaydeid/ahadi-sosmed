"use client";

import React, { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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

      if (!chatId) {
        const { data, error } = await supabase
          .from("messages")
          .insert([{ sender_id: currentUserId, receiver_id: receiverId }])
          .select("id")
          .single();
        if (error || !data?.id) {
          setSending(false);
          return;
        }
        chatId = data.id;
        setMessageRoomId?.(chatId);
      }

      await supabase.from("messages_content").insert([{ message_id: chatId, sender_id: currentUserId, text }]);

      el.value = "";
      el.style.height = "auto";
      el.style.overflowY = "hidden";
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sticky bottom-0 left-0 w-full bg-white flex items-end gap-2 pt-1 border-t border-t-gray-300 z-40">
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
      <button onClick={handleSend} disabled={sending} className="flex items-center justify-center bg-sky-600 text-white w-10 h-10 rounded-full shadow active:scale-95 transition shrink-0 disabled:opacity-50">
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}
