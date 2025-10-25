"use client";

import Image from "next/image";
import ChatInput from "@/app/components/ChatInput";
import { useEffect, useState } from "react";
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
  const { id: partnerId } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [messageRoomId, setMessageRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!partnerId) return;

    const loadChat = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      setCurrentUserId(userId);

      const { data: partnerProfile } = await supabase.from("user_profile").select("id, display_name, avatar_url").eq("id", partnerId).single();

      setPartner(partnerProfile ?? null);

      const { data: existingChat } = await supabase.from("messages").select("id").or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`).maybeSingle();

      if (!existingChat) {
        setMessages([]);
        setMessageRoomId(null);
        setLoading(false);
        return;
      }

      setMessageRoomId(existingChat.id);

      const { data: chatData, error: chatError } = await supabase.from("messages_content").select("id, sender_id, text, image_url, created_at").eq("message_id", existingChat.id).order("created_at", { ascending: true });

      if (chatError) {
        console.error("Error fetching chat messages:", chatError.message);
        setLoading(false);
        return;
      }

      setMessages(chatData ?? []);
      setLoading(false);

      const channel = supabase
        .channel(`messages_${existingChat.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages_content",
            filter: `message_id=eq.${existingChat.id}`,
          },
          (payload) => {
            const newMessage = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    loadChat();
  }, [partnerId]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* --- HEADER (STICKY TOP) --- */}
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

      {/* --- CHAT CONTENT (SCROLLABLE AREA) --- */}
      {/* Menggunakan pb-24 agar konten tidak tertutup oleh ChatInput yang fixed */}
      <div className="flex-1 flex flex-col gap-3 mt-4 overflow-y-auto px-3 pb-24">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-10">
            Belum ada pesan. Mulailah percakapan dengan <span className="font-semibold">{partner?.display_name}</span>.
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
      </div>

      {/* --- CHAT INPUT (FIXED BOTTOM) --- */}
      {/* Menggunakan fixed dan memastikan padding horizontal tetap ada (px-3) */}
      <div className="fixed bottom-15 left-0 right-0 bg-white z-40 px-3 pt-2">
        <ChatInput receiverId={partnerId} messageRoomId={messageRoomId} currentUserId={currentUserId} setMessageRoomId={setMessageRoomId} />
      </div>
    </div>
  );
}
