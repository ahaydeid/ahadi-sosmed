"use client";

import { useEffect, useState, useCallback } from "react";
import { Home, Pencil, MessageSquare, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BottomNavbar() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  const isActive = (path: string) => pathname === path;

  // Auth session
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setCurrentUserId(data.session?.user.id ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setCurrentUserId(session?.user?.id ?? null);
      if (!session) setUnreadChatCount(0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Hitung JUMLAH CHAT (distinct thread) yang punya unread > 0
  const computeUnreadChats = useCallback(async () => {
    if (!currentUserId) return;

    const { data: threads, error: threadsErr } = await supabase.from("messages").select("id, sender_id, receiver_id").or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (threadsErr || !threads || threads.length === 0) {
      setUnreadChatCount(0);
      return;
    }

    const flags: boolean[] = await Promise.all(
      threads.map(async (t) => {
        const { data: mr } = await supabase.from("message_reads").select("last_read_at").eq("user_id", currentUserId).eq("message_id", t.id).maybeSingle();

        const lastRead = mr?.last_read_at ?? "1970-01-01T00:00:00Z";

        const { count, error } = await supabase.from("messages_content").select("*", { count: "exact", head: true }).eq("message_id", t.id).neq("sender_id", currentUserId).gt("created_at", lastRead);

        if (error) return false;
        return (count ?? 0) > 0; // true jika chat ini punya unread
      })
    );

    const totalChatsWithUnread = flags.filter(Boolean).length;
    setUnreadChatCount(totalChatsWithUnread);
  }, [currentUserId]);

  // Initial compute: jadwalkan async agar tidak dianggap sync setState di effect
  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    const t = setTimeout(() => {
      if (!cancelled) void computeUnreadChats();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentUserId, computeUnreadChats]);

  // Realtime refresh saat ada pesan baru atau last_read_at berubah
  useEffect(() => {
    if (!currentUserId) return;

    const chMessages = supabase
      .channel("rt_messages_content_for_nav")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages_content" }, () => void computeUnreadChats())
      .subscribe();

    const chReads = supabase
      .channel("rt_message_reads_for_nav")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_reads",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void computeUnreadChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chMessages);
      supabase.removeChannel(chReads);
    };
  }, [currentUserId, computeUnreadChats]);

  const shouldShowNotifBubble = pathname !== "/notif";
  const profileHref = currentUserId ? `/profile/${currentUserId}` : "/login";
  const profileActive = currentUserId ? isActive(`/profile/${currentUserId}`) : isActive("/login");

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white shadow z-50">
      <ul className="flex justify-around items-center h-14 px-2">
        {/* Home */}
        <li>
          <Link href="/" className="relative flex flex-col items-center">
            <Home className={`w-6 h-6 ${isActive("/") ? "text-black" : "text-gray-500"}`} />
            {isActive("/") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>

        {/* Write */}
        <li>
          <Link href="/write" className="relative flex flex-col items-center">
            <Pencil className={`w-6 h-6 ${isActive("/write") ? "text-black" : "text-gray-500"}`} />
            {isActive("/write") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>

        {/* Chat */}
        <li>
          <Link href="/chat" className="relative flex flex-col items-center">
            <MessageSquare className={`w-6 h-6 ${isActive("/chat") ? "text-black" : "text-gray-500"}`} />
            {isActive("/chat") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>
            )}
          </Link>
        </li>

        {/* Notif */}
        <li>
          <Link href="/notif" className="relative flex flex-col items-center">
            <Bell className={`w-6 h-6 ${isActive("/notif") ? "text-black" : "text-gray-500"}`} />
            {isActive("/notif") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            {shouldShowNotifBubble && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">1</span>}
          </Link>
        </li>

        {/* Profile */}
        <li>
          <Link href={profileHref} className="relative flex flex-col items-center">
            <User className={`w-6 h-6 ${profileActive ? "text-black" : "text-gray-500"}`} />
            {profileActive && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
