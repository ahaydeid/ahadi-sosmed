"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ChatItem {
  id: string;
  name: string;
  avatar_url?: string | null;
  lastMessage: string;
  time: string;
  unreadCount: number;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

export default function ChatPage() {
  const [chatData, setChatData] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id ?? null);
    };
    getSession();
  }, []);

  const loadChats = useCallback(async () => {
    if (!currentUserId) return;

    setLoading(true);
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

    const chatList = await Promise.all(
      messages.map(async (m) => {
        const partnerId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;

        const { data: lastMessage } = await supabase.from("messages_content").select("id, text, image_url, created_at").eq("message_id", m.id).order("created_at", { ascending: false }).limit(1).single();

        const { data: partner } = await supabase.from("user_profile").select("display_name, avatar_url").eq("id", partnerId).single();

        const { count: unreadCount } = await supabase.from("message_reads").select("*", { count: "exact", head: true }).eq("user_id", currentUserId).eq("is_read", false);

        return {
          id: m.id,
          name: partner?.display_name ?? "Pengguna",
          avatar_url: partner?.avatar_url ?? null,
          lastMessage: lastMessage?.text ?? (lastMessage?.image_url ? "[Gambar]" : "(kosong)"),
          time: formatTime(lastMessage?.created_at),
          unreadCount: unreadCount ?? 0,
        };
      })
    );

    setChatData(chatList);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const timer = setTimeout(() => {
      loadChats();
    }, 0);

    return () => clearTimeout(timer);
  }, [currentUserId, loadChats]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("messages_content_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_content",
        },
        async () => {
          await loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadChats]);

  const handleSearch = async (term: string) => {
    setQuery(term);
    const queryBuilder = supabase.from("user_profile").select("id, display_name, avatar_url");

    if (term.trim()) queryBuilder.ilike("display_name", `%${term}%`);
    const { data, error } = await queryBuilder.limit(20);
    if (error) {
      console.error("Search error:", error.message);
      return;
    }

    const filtered = data?.filter((u) => u.id !== currentUserId) ?? [];
    setResults(filtered);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  const markAsRead = async (chatId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase.from("message_reads").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", currentUserId).eq("message_id", chatId).eq("is_read", false);

      if (error) console.error("Gagal menandai pesan terbaca:", error);
      else console.log(`Pesan di chat ${chatId} ditandai sudah dibaca`);
    } catch (e) {
      console.error("Error saat markAsRead:", e);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4">
      <div className="sticky top-0 z-40 bg-white flex justify-between items-center border-b border-b-gray-200 mb-5 pt-6 pb-2">
        {!searchMode ? (
          <>
            <h1 className="text-2xl font-bold">Pesan</h1>
            <Search className="w-5 h-5 text-gray-800 cursor-pointer" onClick={() => setSearchMode(true)} />
          </>
        ) : (
          <div className="flex items-center w-full gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari pengguna..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
              autoFocus
            />
            <X
              className="w-5 h-5 text-gray-600 cursor-pointer"
              onClick={() => {
                setSearchMode(false);
                setQuery("");
                setResults([]);
              }}
            />
          </div>
        )}
      </div>

      {searchMode && results.length > 0 && (
        <div className="space-y-2 mb-5">
          {results.map((user) => (
            <div key={user.id} onClick={() => router.push(`/chat/${user.id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center relative shrink-0">
                {user.avatar_url ? <Image src={user.avatar_url} alt={user.display_name} fill sizes="36px" className="object-cover" /> : <User className="w-5 h-5 text-gray-500" />}
              </div>
              <p className="text-sm font-medium text-gray-800">{user.display_name}</p>
            </div>
          ))}
        </div>
      )}

      {!searchMode &&
        chatData.map((chat) => (
          <div
            key={chat.id}
            onClick={async () => {
              await markAsRead(chat.id);
              router.push(`/chat/${chat.id}`);
            }}
            className="flex items-start mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 -mx-2 cursor-pointer"
          >
            <div className="flex items-start gap-3 w-[90%]">
              <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0 relative overflow-hidden bg-gray-200">
                {chat.avatar_url ? <Image src={chat.avatar_url} alt={chat.name} fill sizes="40px" className="object-cover" /> : <User className="w-6 h-6 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{chat.name}</p>
                <p className="text-gray-500 text-sm line-clamp-1">{chat.lastMessage}</p>
              </div>
            </div>
            <div className="w-[10%] flex flex-col items-end justify-center text-right">
              <span className="text-[11px] text-green-600 font-medium mb-1">{chat.time}</span>
              {chat.unreadCount > 0 && <span className="bg-green-500 text-white text-[11px] font-medium w-5 h-5 rounded-full flex items-center justify-center">{chat.unreadCount}</span>}
            </div>
          </div>
        ))}
    </div>
  );
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Baru";
  if (diffMinutes < 60) return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffHours < 24) return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari`;
}
