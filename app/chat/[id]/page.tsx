"use client";

import Image from "next/image";
import ChatInput from "@/app/components/ChatInput";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, MoreVertical, ArrowLeft } from "lucide-react";

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const loadChat = async () => {
      try {
        setLoading(true);

        // Ambil session user aktif
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) console.error("Session error:", sessionError);

        const userId = sessionData?.session?.user?.id ?? null;
        setCurrentUserId(userId);
        if (!userId) {
          console.warn("Tidak ada userId (belum login?)");
          setLoading(false);
          return;
        }

        // --- Tentukan apakah id = room.id atau user.id
        let activeRoomId: string | null = null;
        let partnerId: string | null = null;

        const { data: room, error: roomError } = await supabase.from("messages").select("id, sender_id, receiver_id").eq("id", id).maybeSingle();

        if (roomError) console.error("Error ambil room:", roomError);

        if (room) {
          activeRoomId = room.id;
          partnerId = room.sender_id === userId ? room.receiver_id : room.sender_id;
        } else {
          partnerId = id;
          const { data: existingRoom, error: existingError } = await supabase
            .from("messages")
            .select("id, sender_id, receiver_id")
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
            .maybeSingle();

          if (existingError) console.error("Error cari existing room:", existingError);
          if (existingRoom) {
            activeRoomId = existingRoom.id;
          }
        }

        if (!partnerId) {
          console.warn("partnerId tidak ditemukan");
          setLoading(false);
          return;
        }

        // Ambil profil partner
        const { data: partnerProfile, error: partnerError } = await supabase.from("user_profile").select("id, display_name, avatar_url").eq("id", partnerId).single();

        if (partnerError) console.error("Error ambil profil:", partnerError);
        setPartner(partnerProfile ?? null);
        setMessageRoomId(activeRoomId);

        // Ambil pesan jika sudah ada room
        if (activeRoomId) {
          const { data: chatData, error: chatError } = await supabase.from("messages_content").select("id, sender_id, text, image_url, created_at").eq("message_id", activeRoomId).order("created_at", { ascending: true });

          if (chatError) console.error("Error ambil pesan:", chatError);
          setMessages(chatData ?? []);

          // Realtime listener
          const channel = supabase
            .channel(`room-${activeRoomId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages_content",
                filter: `message_id=eq.${activeRoomId}`,
              },
              (payload) => {
                const newMessage = payload.new as ChatMessage;
                setMessages((prev) => (prev.find((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]));
              }
            )
            .subscribe();

          // Bersihkan listener saat keluar halaman
          return () => {
            supabase.removeChannel(channel);
          };
        } else {
          setMessages([]);
        }
      } catch (e) {
        console.error("❌ Uncaught error loadChat:", e);
      } finally {
        setLoading(false);
      }
    };

    loadChat();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white flex items-center justify-between px-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3 pt-3">
          <ArrowLeft className="w-6 h-6 text-gray-800 cursor-pointer" onClick={() => router.back()} />
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {partner?.avatar_url ? <Image src={partner.avatar_url} alt={partner.display_name} width={40} height={40} className="object-cover w-10 h-10" /> : <User className="w-6 h-6 text-gray-600" />}
          </div>
          <h1 className="font-semibold text-gray-800">{partner?.display_name ?? "Pengguna"}</h1>
        </div>
        <MoreVertical className="w-5 h-5 text-gray-600 cursor-pointer" />
      </div>

      {/* CHAT CONTENT */}
      <div className="flex-1 flex flex-col gap-3 mt-4 overflow-y-auto px-3 pt-12 pb-15">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-10">
            Belum ada pesan. Mulailah percakapan dengan <span className="font-semibold">{partner?.display_name ?? "Pengguna"}</span>.
          </p>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            const time = new Date(msg.created_at).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                <div className={`relative rounded-xl px-3 py-2 pb-5 min-w-12 max-w-[85%] ${isCurrentUser ? "bg-green-200 text-gray-800" : "bg-gray-100 text-gray-800"}`}>
                  {msg.text && <p className="text-sm">{msg.text}</p>}
                  {msg.image_url && <Image src={msg.image_url} alt="gambar" width={400} height={300} className="rounded-md mt-1 max-w-full h-auto" />}
                  <span className={`absolute bottom-1 right-2 text-[11px] ${isCurrentUser ? "text-gray-600" : "text-gray-500"}`}>{time}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* CHAT INPUT */}
      <div className="fixed bottom-15 left-0 right-0 z-40 px-3 pt-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <ChatInput receiverId={partner?.id ?? ""} messageRoomId={messageRoomId} currentUserId={currentUserId} setMessageRoomId={setMessageRoomId} />
      </div>
    </div>
  );
}
