"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User } from "lucide-react";
import Link from "next/link";

interface ChatItem {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

export default function ChatPage() {
  const [chatData, setChatData] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Ganti dengan user aktif kamu
  const currentUserId = "c1228d6b-f95f-477a-8ddc-c0ab97d7e4b2";

  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);

      // 1️⃣ Ambil semua percakapan (messages) yang melibatkan user ini
      const { data: messages, error: messagesError } = await supabase.from("messages").select("id, sender_id, receiver_id").or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`).order("id", { ascending: false });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError.message);
        setLoading(false);
        return;
      }

      if (!messages || messages.length === 0) {
        setChatData([]);
        setLoading(false);
        return;
      }

      // 2️⃣ Ambil pesan terakhir untuk setiap conversation
      const chatList = await Promise.all(
        messages.map(async (m) => {
          // siapa lawan bicara
          const partnerId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;

          // ambil pesan terakhir
          const { data: lastMessage } = await supabase.from("messages_content").select("id, text, image_url, created_at").eq("message_id", m.id).order("created_at", { ascending: false }).limit(1).single();

          // ambil nama lawan bicara
          const { data: partner } = await supabase.from("user_profile").select("display_name").eq("id", partnerId).single();

          // ambil jumlah pesan belum dibaca untuk user ini
          const { count: unreadCount } = await supabase.from("message_reads").select("*", { count: "exact", head: true }).eq("user_id", currentUserId).eq("is_read", false);

          return {
            id: m.id,
            name: partner?.display_name ?? "Pengguna",
            lastMessage: lastMessage?.text ?? (lastMessage?.image_url ? "[Gambar]" : "(kosong)"),
            time: formatTime(lastMessage?.created_at),
            unreadCount: unreadCount ?? 0,
          };
        })
      );

      setChatData(chatList);
      setLoading(false);
    };

    loadChats();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  return (
    <div className="min-h-screen bg-white px-4">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white flex justify-between items-center border-b border-b-gray-200 mb-5 pt-6 pb-2">
        <h1 className="text-2xl font-bold">Pesan</h1>
        <Search className="w-5 h-5 text-gray-800 cursor-pointer" />
      </div>

      {/* Daftar Chat */}
      {chatData.map((chat) => (
        <Link key={chat.id} href={`/chat/${chat.id}`} className="flex items-start mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 -mx-2">
          {/* Kiri: avatar + text */}
          <div className="flex items-start gap-3 w-[90%]">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-gray-500" />
            </div>

            {/* Nama & pesan terakhir */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{chat.name}</p>
              <p className="text-gray-500 text-sm line-clamp-1">{chat.lastMessage}</p>
            </div>
          </div>

          {/* Kanan: waktu + badge */}
          <div className="w-[10%] flex flex-col items-end justify-center text-right">
            <span className="text-[11px] text-green-600 font-medium mb-1">{chat.time}</span>
            {chat.unreadCount > 0 && <span className="bg-green-500 text-white text-[11px] font-medium w-5 h-5 rounded-full flex items-center justify-center">{chat.unreadCount}</span>}
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Helper: Format waktu jadi jam atau label sederhana */
function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Baru";
  if (diffMinutes < 60)
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffHours < 24)
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari`;
}
