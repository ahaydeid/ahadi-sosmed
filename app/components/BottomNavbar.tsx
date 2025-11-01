"use client";

import type { Route } from "next";
import { useEffect, useState, useCallback } from "react";
import { Home, Megaphone, MessageSquare, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BottomNavbar() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const isActive = useCallback((path: string) => pathname === path, [pathname]);

  // ===== Auth session =====
  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !mounted) return;
      setCurrentUserId(data.session?.user?.id ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setCurrentUserId(session?.user?.id ?? null);
      if (!session) {
        setUnreadChatCount(0);
        setUnreadNotifCount(0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== Hitung jumlah chat belum dibaca (versi aman) =====
  const computeUnreadChats = useCallback(async () => {
    if (!currentUserId) return;

    const { data: threads, error: threadsErr } = await supabase.from("messages").select("id, sender_id, receiver_id").or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (threadsErr || !threads || threads.length === 0) {
      setUnreadChatCount(0);
      return;
    }

    const flags = await Promise.all(
      threads.map(async (t) => {
        const otherUserId = t.sender_id === currentUserId ? t.receiver_id : t.sender_id;
        if (!otherUserId) return false;

        const { data: mr } = await supabase.from("message_reads").select("last_read_at").eq("user_id", currentUserId).eq("message_id", t.id).maybeSingle();

        const lastRead = mr?.last_read_at ?? null;

        const { data: lastMsg } = await supabase.from("messages_content").select("sender_id, created_at").eq("message_id", t.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (!lastMsg) return false;
        if (!lastRead && lastMsg.sender_id !== currentUserId) return true;
        if (lastRead && lastMsg.sender_id !== currentUserId && new Date(lastMsg.created_at) > new Date(lastRead)) return true;
        return false;
      })
    );

    const totalUnread = flags.filter(Boolean).length;
    setUnreadChatCount(totalUnread);
  }, [currentUserId]);

  // ===== Hitung jumlah notif belum dibaca =====
  const computeUnreadNotif = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase.from("notifications").select("type, reference_post_id, reference_comment_id, is_read").eq("user_id", currentUserId).eq("is_read", false);

    if (error || !data) return;

    // buat key unik berdasarkan kombinasi type + referensi post/comment
    const uniqueGroups = new Set(data.map((n) => (n.reference_post_id ? `${n.type}_${n.reference_post_id}` : n.reference_comment_id ? `${n.type}_${n.reference_comment_id}` : `${n.type}_${Math.random()}`)));

    setUnreadNotifCount(uniqueGroups.size);
  }, [currentUserId]);

  // ===== Initial compute =====
  useEffect(() => {
    if (!currentUserId) return;
    (async () => {
      await computeUnreadChats();
      await computeUnreadNotif();
    })();
  }, [currentUserId, computeUnreadChats, computeUnreadNotif]);

  // ===== Realtime untuk chat =====
  useEffect(() => {
    if (!currentUserId) return;

    const chMessages = supabase
      .channel("rt_messages_content_for_nav")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_content",
        },
        (payload) => {
          const newMsg = payload.new as { sender_id: string; message_id: string };
          if (newMsg.sender_id !== currentUserId) void computeUnreadChats();
        }
      )
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

  // ===== Realtime untuk notifikasi =====
  useEffect(() => {
    if (!currentUserId) return;

    const chNotif = supabase
      .channel("rt_notifications_for_nav")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => void computeUnreadNotif()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chNotif);
    };
  }, [currentUserId, computeUnreadNotif]);

  const profileHref = (currentUserId ? `/profile/${currentUserId}` : `/login?redirectedFrom=${encodeURIComponent("/profile")}`) as Route;
  const profileActive = currentUserId ? pathname.startsWith(`/profile/${currentUserId}`) : false;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white shadow z-50">
      <ul className="flex justify-around items-center h-14 px-2">
        <li>
          <Link href={"/" as Route} className="relative flex flex-col items-center">
            <Home className={`w-6 h-6 ${isActive("/") ? "text-black" : "text-gray-500"}`} />
            {isActive("/") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>

        <li>
          <Link href={"/ungkapin" as Route} className="relative flex flex-col items-center">
            <Megaphone className={`w-6 h-6 ${isActive("/ungkapin") ? "text-black" : "text-gray-500"}`} />
            {isActive("/ungkapin") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>

        <li>
          <Link href={"/chat" as Route} className="relative flex flex-col items-center">
            <MessageSquare className={`w-6 h-6 ${isActive("/chat") ? "text-black" : "text-gray-500"}`} />
            {isActive("/chat") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unreadChatCount > 99 ? "99+" : unreadChatCount}</span>
            )}
          </Link>
        </li>

        <li>
          <Link href={"/notif" as Route} className="relative flex flex-col items-center">
            <Bell className={`w-6 h-6 ${isActive("/notif") ? "text-black" : "text-gray-500"}`} />
            {isActive("/notif") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
            )}
          </Link>
        </li>

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
