"use client";

import type { Route } from "next";
import { useEffect, useState, useCallback } from "react";
import { Home, Pencil, MessageSquare, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BottomNavbar() {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

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
      if (!session) setUnreadChatCount(0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ===== Hitung jumlah chat (user) yang punya pesan belum dibaca =====
  const computeUnreadChats = useCallback(async () => {
    if (!currentUserId) return;

    // Ambil semua thread di mana user ini terlibat
    const { data: threads, error: threadsErr } = await supabase.from("messages").select("id, sender_id, receiver_id").or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

    if (threadsErr || !threads || threads.length === 0) {
      setUnreadChatCount(0);
      return;
    }

    // Cek setiap thread apakah ada pesan baru dari lawan bicara
    const flags = await Promise.all(
      threads.map(async (t) => {
        const otherUserId = t.sender_id === currentUserId ? t.receiver_id : t.sender_id;
        if (!otherUserId) return false;

        // Ambil kapan terakhir user ini baca chat ini
        const { data: mr } = await supabase.from("message_reads").select("last_read_at").eq("user_id", currentUserId).eq("message_id", t.id).maybeSingle();

        const lastRead = mr?.last_read_at ?? "1970-01-01T00:00:00Z";

        // Cek apakah ada pesan baru dari lawan bicara setelah waktu terakhir baca
        const { count, error: msgErr } = await supabase.from("messages_content").select("*", { count: "exact", head: true }).eq("message_id", t.id).eq("sender_id", otherUserId).gt("created_at", lastRead);

        if (msgErr) return false;
        return (count ?? 0) > 0;
      })
    );

    // Hitung jumlah thread (user) yang punya pesan belum dibaca
    const totalUnread = flags.filter(Boolean).length;
    setUnreadChatCount(totalUnread);
  }, [currentUserId]);

  // ===== Initial compute =====
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

  // ===== Realtime refresh =====
  useEffect(() => {
    if (!currentUserId) return;

    // Update saat pesan baru masuk
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

    // Update saat status baca berubah
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

  // ===== State UI =====
  const shouldShowNotifBubble = pathname !== "/notif";

  // Sama seperti halaman lain: redirect ke login + redirectedFrom jika belum login
  const profileHref = (currentUserId ? `/profile/${currentUserId}` : `/login?redirectedFrom=${encodeURIComponent("/profile")}`) as Route;

  const profileActive = currentUserId ? pathname.startsWith(`/profile/${currentUserId}`) : false;

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
            {shouldShowNotifBubble && unreadChatCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">•</span>}
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
