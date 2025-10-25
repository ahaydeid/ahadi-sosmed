"use client";
import Image from "next/image";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { User, MoreVertical } from "lucide-react";

interface ChatMessage {
  id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
}

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>(); // id = messages.id
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerName, setPartnerName] = useState<string>("Pengguna");
  const [loading, setLoading] = useState(true);

  // Ganti dengan user aktif kamu
  const currentUserId = "c1228d6b-f95f-477a-8ddc-c0ab97d7e4b2";

  useEffect(() => {
    if (!id) return;

    const loadChat = async () => {
      setLoading(true);

      // 1️⃣ Ambil data pesan
      const { data: chatData, error: chatError } = await supabase.from("messages_content").select("id, sender_id, text, image_url, created_at").eq("message_id", id).order("created_at", { ascending: true });

      if (chatError) {
        console.error("Error fetching chat messages:", chatError.message);
        setLoading(false);
        return;
      }

      setMessages(chatData ?? []);

      // 2️⃣ Ambil data lawan bicara
      const { data: messageInfo } = await supabase.from("messages").select("sender_id, receiver_id").eq("id", id).single();

      if (messageInfo) {
        const partnerId = messageInfo.sender_id === currentUserId ? messageInfo.receiver_id : messageInfo.sender_id;

        const { data: partnerProfile } = await supabase.from("user_profile").select("display_name").eq("id", partnerId).single();

        if (partnerProfile?.display_name) {
          setPartnerName(partnerProfile.display_name);
        }
      }

      setLoading(false);
    };

    loadChat();

    // 3️⃣ Aktifkan realtime listener
    const channel = supabase
      .channel("messages_content_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_content",
          filter: `message_id=eq.${id}`,
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
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat chat...</div>;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col px-3 pt-4 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white flex items-center justify-between pb-3">
        <div className="flex items-center gap-3 pt-3">
          <div className="w-10 h-10 rounded-full border flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <h1 className="font-semibold text-gray-800">{partnerName}</h1>
        </div>
        <MoreVertical className="w-5 h-5 text-gray-600 cursor-pointer" />
      </div>

      {/* Chat Content */}
      <div className="flex flex-col gap-3 mt-4">
        {messages.map((msg) => {
          const isCurrentUser = msg.sender_id === currentUserId;
          const time = new Date(msg.created_at).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={msg.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
              <div className={`relative rounded-xl px-3 py-2 pb-5 max-w-[90%] ${isCurrentUser ? "bg-green-200 text-gray-800" : "bg-gray-100 text-gray-800"}`}>
                {msg.text && <p className="text-sm">{msg.text}</p>}
                {msg.image_url && <Image src={msg.image_url} alt="gambar" width={400} height={300} className="rounded-md mt-1 max-w-full h-auto" />}
                <span className={`absolute bottom-1 right-2 text-[11px] ${isCurrentUser ? "text-gray-600" : "text-gray-500"}`}>{time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
