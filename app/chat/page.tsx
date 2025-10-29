"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";

interface ChatItem {
  id: string;
  name: string;
  avatar_url?: string | null;
  lastMessage: string;
  time: string;
  lastTs: number;
  unreadCount: number;
  lastFromSelf: boolean;
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
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

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

    const { data: messages, error: messagesError } = await supabase.from("messages").select("id, sender_id, receiver_id").or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (messagesError) {
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

        const { data: lastMessage } = await supabase.from("messages_content").select("id, text, image_url, created_at, sender_id").eq("message_id", m.id).order("created_at", { ascending: false }).limit(1).single();

        const { data: partner } = await supabase.from("user_profile").select("display_name, avatar_url").eq("id", partnerId).single();

        const { data: mr } = await supabase.from("message_reads").select("last_read_at").eq("user_id", currentUserId).eq("message_id", m.id).maybeSingle();

        const lastRead = mr?.last_read_at ?? "1970-01-01T00:00:00Z";

        const { count: unreadCountRaw } = await supabase.from("messages_content").select("*", { count: "exact", head: true }).eq("message_id", m.id).neq("sender_id", currentUserId).gt("created_at", lastRead);

        const unreadCount = unreadCountRaw ?? 0;

        const lastFromSelf = !!lastMessage && lastMessage.sender_id === currentUserId;
        const effectiveUnread = lastFromSelf ? 0 : unreadCount;
        const lastCreatedAt = lastMessage?.created_at ? new Date(lastMessage.created_at).getTime() : 0;

        return {
          id: m.id,
          name: partner?.display_name ?? "Pengguna",
          avatar_url: partner?.avatar_url ?? null,
          lastMessage: lastMessage?.text ?? (lastMessage?.image_url ? "[Gambar]" : "(kosong)"),
          time: formatTime(lastMessage?.created_at),
          lastTs: lastCreatedAt,
          unreadCount: effectiveUnread,
          lastFromSelf,
        } as ChatItem;
      })
    );

    chatList.sort((a, b) => b.lastTs - a.lastTs);

    setChatData(chatList);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const t = setTimeout(() => void loadChats(), 0);
    return () => clearTimeout(t);
  }, [currentUserId, loadChats]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("messages_content_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_content" }, async () => {
        await loadChats();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadChats]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchMode(false);
        setQuery("");
        setResults([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSearch = async (term: string) => {
    setQuery(term);
    const queryBuilder = supabase.from("user_profile").select("id, display_name, avatar_url");
    if (term.trim()) queryBuilder.ilike("display_name", `%${term}%`);
    const { data, error } = await queryBuilder.limit(20);
    if (error) return;
    const filtered = data?.filter((u) => u.id !== currentUserId) ?? [];
    setResults(filtered);
  };

  const markAsRead = async (chatId: string) => {
    if (!currentUserId) return;
    const payload = { user_id: currentUserId, message_id: chatId, last_read_at: new Date().toISOString() };
    const { error } = await supabase.from("message_reads").upsert(payload, { onConflict: "user_id,message_id" });
    if (error) return;
    await loadChats();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  return (
    <div className="min-h-screen bg-white px-4">
      <div className="top-0 z-20 bg-white flex justify-between items-center border-b border-b-gray-200 mb-5 pt-6 pb-2 relative">
        <h1 className="text-2xl font-bold">Pesan</h1>
        <button aria-label="Cari" className="p-2 rounded hover:bg-gray-100" onClick={() => setSearchMode((v) => !v)}>
          <Search className="w-5 h-5" />
        </button>

        {searchMode && (
          <div ref={searchBoxRef} className="absolute right-0 top-full mt-2 w-full max-w-md bg-white border border-gray-50 rounded-xl shadow-xs p-2 z-50">
            <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Cari pengguna..." className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm" autoFocus />
            {query.trim().length > 0 && (
              <div className="mt-2 max-h-72 overflow-auto">
                {results.length === 0 ? (
                  <div className="text-xs text-gray-500 px-2 py-3">Tidak ada hasil</div>
                ) : (
                  results.map((user) => (
                    <div key={user.id} onClick={() => router.push(`/chat/${user.id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 relative shrink-0">
                        {user.avatar_url ? <Image src={user.avatar_url} alt={user.display_name} fill sizes="36px" className="object-cover" /> : <div className="w-9 h-9 rounded-full bg-gray-300" />}
                      </div>
                      <p className="text-sm font-medium text-gray-800">{user.display_name}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {chatData.map((chat) => {
        const showUnread = chat.unreadCount > 0;
        const timeColor = showUnread ? "text-green-600" : "text-gray-400";
        return (
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
                {chat.avatar_url ? <Image src={chat.avatar_url} alt={chat.name} fill sizes="40px" className="object-cover" /> : <div className="w-10 h-10 rounded-full bg-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{chat.name}</p>
                <p className="text-gray-500 text-sm line-clamp-1">{chat.lastMessage}</p>
              </div>
            </div>
            <div className="w-[10%] flex flex-col items-end justify-center text-right">
              <span className={`text-[11px] font-medium mb-1 ${timeColor}`}>{chat.time}</span>
              {showUnread && <span className="bg-green-500 text-white text-[11px] font-medium w-5 h-5 rounded-full flex items-center justify-center">{chat.unreadCount > 9 ? "9+" : chat.unreadCount}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();

  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 60000) return "Baru";

  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.floor((dayStart(now) - dayStart(d)) / 86400000);

  if (dayDiff === 0) {
    // Hari ini → tampil jam:menit
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) {
    // Kemarin
    return "Kemarin";
  }

  // Lebih dari kemarin → tampil tanggal (dd/mm/yy)
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
