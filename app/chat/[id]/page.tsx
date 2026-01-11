"use client";

import Image from "next/image";
import ChatInput from "@/app/components/ChatInput";
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { User, MoreVertical, ArrowLeft, Trash2, ShieldAlert, BadgeCheck } from "lucide-react";
import { ChatDetailSkeleton } from "@/app/components/Skeleton";
import { useSidebar } from "@/app/context/SidebarContext";
import ConfirmModal from "@/app/components/ConfirmModal";

interface ChatMessage {
  id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
}

interface PartnerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  verified?: boolean;
}

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [messageRoomId, setMessageRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isCollapsed } = useSidebar();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [roomData, setRoomData] = useState<{ sender_id: string; receiver_id: string; sender_deleted_at: string | null; receiver_deleted_at: string | null } | null>(null);

  const markAsRead = useCallback(async (roomId: string, uid: string) => {
    if (!uid) return;
    const payload = {
      user_id: uid,
      message_id: roomId,
      last_read_at: new Date().toISOString(),
    };
    await supabase.from("message_reads").upsert(payload, { onConflict: "user_id,message_id" });
  }, []);

  useEffect(() => {
    const scrollToBottom = () => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: "auto" });
      }
    };
    // Scroll immediately and then again after a short delay for mobile Safari/Chrome
    scrollToBottom();
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  // Effect 1: Loading initial data (room, partner, etc)
  useEffect(() => {
    if (!id) return;

    const loadChat = async () => {
      try {
        setLoading(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? null;
        setCurrentUserId(userId);
        if (!userId) {
          setLoading(false);
          return;
        }

        let activeRoomId: string | null = null;
        let partnerId: string | null = null;

        const { data: room } = await supabase.from("messages").select("id, sender_id, receiver_id, sender_deleted_at, receiver_deleted_at").eq("id", id).maybeSingle();

        if (room) {
          activeRoomId = room.id;
          partnerId = room.sender_id === userId ? room.receiver_id : room.sender_id;
          setRoomData(room);
        } else {
          partnerId = id;
          const { data: existingRoom } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id, sender_deleted_at, receiver_deleted_at")
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
            .maybeSingle();

          if (existingRoom) {
            activeRoomId = existingRoom.id;
            setRoomData(existingRoom);
          }
        }

        if (!partnerId) {
          setLoading(false);
          return;
        }

        const { data: partnerProfile } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").eq("id", partnerId).single();
        setPartner(partnerProfile ?? null);
        setMessageRoomId(activeRoomId);

        if (activeRoomId) {
          const myDeletedAt = room?.sender_id === userId ? room?.sender_deleted_at : room?.receiver_deleted_at;
          
          let query = supabase.from("messages_content").select("id, sender_id, text, image_url, created_at").eq("message_id", activeRoomId);

          if (myDeletedAt) {
            query = query.gt("created_at", myDeletedAt);
          }

          const { data: chatData } = await query.order("created_at", { ascending: true });

          setMessages(chatData ?? []);
          void markAsRead(activeRoomId, userId);
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("❌ Error loading chat:", e);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [id, markAsRead]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  // Effect 2: Real-time Listener & Interactions (Sync subscription with cleanup)
  useEffect(() => {
    if (!messageRoomId || !currentUserId) return;

    // 1. Realtime listener untuk pesan baru
    const channel = supabase
      .channel(`room-${messageRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_content",
          filter: `message_id=eq.${messageRoomId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => (prev.find((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));

          if (newMessage.sender_id !== currentUserId) {
            void markAsRead(messageRoomId, currentUserId);
          }
        }
      )
      .subscribe();

    // 2. Auto-mark as read on focus
    const onFocus = () => {
      void markAsRead(messageRoomId, currentUserId);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [messageRoomId, currentUserId, markAsRead]);

  if (loading) {
    return (
      <div suppressHydrationWarning className="min-h-screen bg-white">
        <div suppressHydrationWarning className="px-4 py-3 border-b border-gray-100 mb-4">
          <div suppressHydrationWarning className="animate-pulse flex items-center gap-3">
            <div suppressHydrationWarning className="w-6 h-6 rounded-full bg-gray-200" />
            <div suppressHydrationWarning className="w-10 h-10 rounded-full bg-gray-200" />
            <div suppressHydrationWarning className="w-32 h-4 bg-gray-200 rounded" />
          </div>
        </div>
        <ChatDetailSkeleton />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="h-[100dvh] bg-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <div suppressHydrationWarning className="sticky top-0 z-40 bg-white flex items-center justify-between px-3 pb-3 border-b border-gray-200">
        <div suppressHydrationWarning className="flex items-center gap-3 pt-3 flex-1 min-w-0">
          {/* Tombol Kembali (Tetap terpisah) */}
          <ArrowLeft className="w-6 h-6 text-gray-800 cursor-pointer shrink-0" onClick={() => router.back()} />

          {/* Area Profil yang Dapat Diklik */}
          <Link href={`/profile/${partner?.id}`} className="flex items-center gap-3 cursor-pointer p-2 -m-2 flex-1 min-w-0">
            {/* Avatar */}
            <div suppressHydrationWarning className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
              {partner?.avatar_url ? <Image src={partner.avatar_url} alt={partner.display_name} width={40} height={40} className="object-cover w-10 h-10" /> : <div suppressHydrationWarning className="w-6 h-6 text-gray-600 flex items-center justify-center"><User className="w-6 h-6" /></div>}
            </div>
            {/* Nama Pengguna */}
            <div className="flex items-center gap-1 min-w-0">
              <h1 className="font-semibold text-gray-800 truncate">{partner?.display_name ?? "Pengguna"}</h1>
              {partner?.verified && <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />}
            </div>
          </Link>
        </div>

        {/* Dropdown Menu */}
        <div suppressHydrationWarning className="relative pt-3" ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>

          {showDropdown && (
            <div suppressHydrationWarning className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowDeleteModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Chat
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowBlockModal(true);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
              >
                <ShieldAlert className="w-4 h-4" />
                Blokir Pengguna
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CHAT CONTENT */}
      <div suppressHydrationWarning className="flex-1 overflow-y-auto px-3 pt-4 pb-4 bg-white flex flex-col gap-2">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-10">
            Belum ada pesan. Mulailah percakapan dengan <span className="font-semibold">{partner?.display_name ?? "Pengguna"}</span>.
          </p>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            const createdAt = new Date(msg.created_at);
            const now = new Date();
            const isToday = createdAt.toDateString() === now.toDateString();

            const time = isToday ? createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : createdAt.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit" });

            return (
              <div suppressHydrationWarning key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div suppressHydrationWarning className={`rounded-xl px-3 py-2 min-w-12 max-w-[85%] flex flex-col ${isCurrentUser ? "bg-green-200 text-gray-800" : "bg-gray-100 text-gray-800"}`}>
                  <div suppressHydrationWarning>
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                    {msg.image_url && <Image src={msg.image_url} alt="gambar" width={400} height={300} className="rounded-md mt-1 max-w-full h-auto" />}
                  </div>
                  <div suppressHydrationWarning className="self-end text-[11px]">
                    <span suppressHydrationWarning className={`${isCurrentUser ? "text-gray-600" : "text-gray-500"}`}>{time}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div suppressHydrationWarning ref={bottomRef} />
      </div>

      {/* CHAT INPUT */}
      <div suppressHydrationWarning className="bg-white px-3 pb-3 pt-2 border-t border-gray-100 shadow-sm">
        <ChatInput receiverId={partner?.id ?? ""} messageRoomId={messageRoomId} currentUserId={currentUserId} setMessageRoomId={setMessageRoomId} />
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          if (!messageRoomId || !currentUserId || !roomData) return;

          const isSender = roomData.sender_id === currentUserId;
          const now = new Date().toISOString();

          // Cek apakah lawan bicara juga sudah menghapus (logic hard delete)
          const otherDeletedAt = isSender ? roomData.receiver_deleted_at : roomData.sender_deleted_at;

          if (otherDeletedAt) {
            // Hard Delete: Kedua belah pihak sudah menghapus
            const { error } = await supabase.from("messages").delete().eq("id", messageRoomId);
            if (error) {
              alert("Gagal menghapus permanen: " + error.message);
            } else {
              router.push("/chat");
            }
          } else {
            // Soft Delete: Hanya user ini yang menghapus
            const updateObj = isSender ? { sender_deleted_at: now } : { receiver_deleted_at: now };
            const { error } = await supabase.from("messages").update(updateObj).eq("id", messageRoomId);

            if (error) {
              alert("Gagal membersihkan history: " + error.message);
            } else {
              router.push("/chat");
            }
          }
        }}
        title="Hapus Chat?"
        message="Chat ini akan dihapus dan tidak dapat dikembalikan."
        confirmLabel="Hapus"
        isDanger
      />

      <ConfirmModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        onConfirm={() => {
          // Mockup block functionality
          setShowBlockModal(false);
          alert(`Berhasil memblokir ${partner?.display_name}.`);
        }}
        title="Blokir Pengguna?"
        message={`Setelah diblokir, ${partner?.display_name} tidak dapat mengirimkan pesan lagi kepada Anda.`}
        confirmLabel="Blokir"
        isDanger
      />
    </div>
  );
}
