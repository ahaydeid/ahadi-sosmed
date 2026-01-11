"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import { ChatSkeleton } from "../components/Skeleton";
import useSWR from "swr";

interface ChatItem {
  id: string;
  name: string;
  avatar_url?: string | null;
  lastMessage: string;
  time: string;
  lastTs: number;
  unreadCount: number;
  lastFromSelf: boolean;
  verified?: boolean;
}

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  verified?: boolean;
}

export default function ChatPage() {
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id ?? null);
    };
    getSession();
  }, []);

  // Fetcher function untuk SWR
  const fetchChats = useCallback(async (): Promise<ChatItem[]> => {
    if (!currentUserId) return [];

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, sender_deleted_at, receiver_deleted_at")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (messagesError || !messages || messages.length === 0) {
      return [];
    }

    const chatListPromise = messages.map(async (m) => {
      const isSender = m.sender_id === currentUserId;
      const myDeletedAt = isSender ? m.sender_deleted_at : m.receiver_deleted_at;

      const { data: lastMessage } = await supabase
        .from("messages_content")
        .select("id, text, image_url, created_at, sender_id")
        .eq("message_id", m.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Filter: Sembunyikan room jika pesan terakhir <= waktu dihapus
      if (myDeletedAt && lastMessage && new Date(lastMessage.created_at) <= new Date(myDeletedAt)) {
        return null;
      }
      // Jika room kosong (belum ada pesan) dan pernah dihapus, juga sembunyikan
      if (myDeletedAt && !lastMessage) {
        return null;
      }

      const partnerId = isSender ? m.receiver_id : m.sender_id;
      const { data: partner } = await supabase.from("user_profile").select("display_name, avatar_url, verified").eq("id", partnerId).maybeSingle();

      const { data: mr } = await supabase.from("message_reads").select("last_read_at").eq("user_id", currentUserId).eq("message_id", m.id).maybeSingle();
      const lastRead = mr?.last_read_at ?? "1970-01-01T00:00:00Z";
      
      let effectiveStart = lastRead;
      if (myDeletedAt && new Date(myDeletedAt) > new Date(lastRead)) {
        effectiveStart = myDeletedAt;
      }

      const { count: unreadCountRaw } = await supabase.from("messages_content")
        .select("*", { count: "exact", head: true })
        .eq("message_id", m.id)
        .neq("sender_id", currentUserId)
        .gt("created_at", effectiveStart);

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
        verified: partner?.verified
      } as ChatItem;
    });

    const chatList = (await Promise.all(chatListPromise)).filter((c): c is ChatItem => c !== null);
    chatList.sort((a, b) => b.lastTs - a.lastTs);

    return chatList;
  }, [currentUserId]);

  // SWR hook dengan caching
  const { data: chatData = [], isLoading, mutate } = useSWR(
    currentUserId ? `chats-${currentUserId}` : null,
    fetchChats,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true, // Force fresh data saat mount
      dedupingInterval: 2000, // Prevent duplicate requests within 2s
    }
  );

  const loading = isLoading;

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("messages_update_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void mutate();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_content" }, () => {
        // Revalidate cache saat ada pesan baru
        void mutate();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, mutate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchMode(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (term: string) => {
    setQuery(term);
    if (!term.trim()) {
      setResults([]);
      return;
    }
    
    if (!currentUserId) return;
    
    // Gunakan RPC untuk mendapatkan visible chat partners (JAUH LEBIH CEPAT!)
    const { data: partnerData, error: rpcError } = await supabase
      .rpc('get_visible_chat_partners', { user_id_param: currentUserId });
    
    if (rpcError || !partnerData || partnerData.length === 0) {
      setResults([]);
      return;
    }
    
    const visiblePartnerIds = partnerData.map((p: { partner_id: string }) => p.partner_id);
    
    // Cari user yang namanya match DAN ada di visible partner list
    const { data, error } = await supabase
      .from("user_profile")
      .select("id, display_name, avatar_url, verified")
      .ilike("display_name", `%${term}%`)
      .in("id", visiblePartnerIds)
      .limit(20);
    
    if (error) return;
    setResults(data ?? []);
  };

  const markAsRead = async (chatId: string) => {
    if (!currentUserId) return;
    const payload = { user_id: currentUserId, message_id: chatId, last_read_at: new Date().toISOString() };
    const { error } = await supabase.from("message_reads").upsert(payload, { onConflict: "user_id,message_id" });
    if (error) return;
  };

  if (!mounted || loading) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-white px-4 pt-20">
        <div suppressHydrationWarning className="h-8 w-24 bg-gray-100 animate-pulse rounded mb-6" />
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-white px-4">
      <div suppressHydrationWarning className="top-0 z-20 bg-white flex justify-between items-center border-b border-b-gray-200 mb-5 pt-6 pb-2 relative">
        <h1 suppressHydrationWarning className="text-2xl font-bold">Pesan</h1>
        <button aria-label="Cari" className="p-2 rounded hover:bg-gray-100" onClick={() => setSearchMode((v) => !v)}>
          <Search className="w-5 h-5" />
        </button>

        {searchMode && (
          <div suppressHydrationWarning ref={searchBoxRef} className="absolute right-0 top-full mt-2 w-full max-w-md bg-white border border-gray-50 rounded-xl shadow-xs p-2 z-50">
            <input suppressHydrationWarning type="text" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Cari pengguna..." className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm" autoFocus />
            {query.trim().length > 0 && (
              <div suppressHydrationWarning className="mt-2 max-h-72 overflow-auto">
                {results.length === 0 ? (
                  <div suppressHydrationWarning className="text-xs text-gray-500 px-2 py-3">Tidak ada hasil</div>
                ) : (
                  results.map((user) => (
                    <div suppressHydrationWarning key={user.id} onClick={() => router.push(`/chat/${user.id}`)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div suppressHydrationWarning className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 relative shrink-0">
                        {user.avatar_url ? <Image src={user.avatar_url} alt={user.display_name} fill sizes="36px" className="object-cover" /> : <div suppressHydrationWarning className="w-9 h-9 rounded-full bg-gray-300" />}
                      </div>
                      <div suppressHydrationWarning className="flex items-center gap-1 min-w-0">
                        <p suppressHydrationWarning className="text-sm font-medium text-gray-800 truncate">{user.display_name}</p>
                        {user.verified && <VerifiedBadge className="w-4 h-4" />}
                      </div>
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
            suppressHydrationWarning
            key={chat.id}
            onClick={async () => {
              await markAsRead(chat.id);
              router.push(`/chat/${chat.id}`);
            }}
            className="flex items-start mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 -mx-2 cursor-pointer"
          >
            <div suppressHydrationWarning className="flex items-start gap-3 flex-1 min-w-0">
              <div suppressHydrationWarning className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden bg-gray-200">
                {chat.avatar_url ? <Image src={chat.avatar_url} alt={chat.name} fill sizes="40px" className="object-cover" /> : <div suppressHydrationWarning className="w-10 h-10 rounded-full bg-gray-300" />}
              </div>
              <div suppressHydrationWarning className="flex-1 min-w-0">
                <div suppressHydrationWarning className="flex items-center gap-1">
                  <p suppressHydrationWarning className="font-semibold text-sm truncate">{chat.name}</p>
                  {chat.verified && <VerifiedBadge className="w-3 h-3" />}
                </div>
                <p suppressHydrationWarning className="text-gray-500 text-sm line-clamp-1">{chat.lastMessage}</p>
              </div>
            </div>
            <div suppressHydrationWarning className="flex flex-col items-end justify-center text-right shrink-0 ml-2">
              <span suppressHydrationWarning className={`text-[11px] font-medium mb-1 ${timeColor}`}>
                {chat.time}
              </span>
              {showUnread && (
                <span suppressHydrationWarning className="bg-green-500 text-white text-[11px] font-medium w-5 h-5 rounded-full flex items-center justify-center">
                  {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(dateStr?: string) {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  const now = new Date();
  
  // Reset waktu ke midnight untuk perbandingan hari yang akurat
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffDays = Math.floor((todayOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));

  // Jika kurang dari 1 menit
  if (diffMinutes < 1) {
    return "Baru saja";
  }

  // Jika hari ini, tampilkan jam saja
  if (diffDays === 0) {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  }
  
  // Jika kemarin
  if (diffDays === 1) {
    return "Kemarin";
  }
  
  // Jika lebih dari kemarin, tampilkan tanggal
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
