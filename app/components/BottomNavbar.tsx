"use client";

import { useEffect, useState } from "react";
import { Home, Pencil, MessageSquare, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BottomNavbar() {
  const pathname = usePathname();

  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // MENGHAPUS: const [showNotif, setShowNotif] = useState<boolean>(true);

  // Ikon notifikasi yang dihitung: tampilkan jika pathname BUKAN "/notif"
  // Asumsi: Anda memiliki mekanisme lain untuk menentukan apakah ada notif yang BACA,
  // tetapi untuk menghilangkan BUBBLE saat di halaman NOTIF, ini solusinya.
  const shouldShowNotifBubble = pathname !== "/notif";

  // User aktif (sementara hardcoded, nanti bisa ambil dari session)
  const currentUserId = "c1228d6b-f95f-477a-8ddc-c0ab97d7e4b2";

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      // Ambil total pesan belum dibaca dari message_reads
      const { count, error } = await supabase.from("message_reads").select("*", { count: "exact", head: true }).eq("user_id", currentUserId).eq("is_read", false);

      if (error) {
        console.error("Error fetching unread count:", error.message);
        return;
      }

      setUnreadChatCount(count ?? 0);
    };

    fetchUnreadMessages();

    // Realtime listener untuk update saat ada perubahan
    const channel = supabase
      .channel("message_reads_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reads",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          fetchUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // MENGHAPUS EFFECT BERMASALAH INI:
  /*
  useEffect(() => {
    // Hilangkan notif bubble saat user buka /notif
    if (pathname === "/notif") {
      setShowNotif(false);
    }
  }, [pathname]);
  */

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
            {unreadChatCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadChatCount > 9 ? "9+" : unreadChatCount}</span>}
          </Link>
        </li>

        {/* Notif */}
        <li>
          <Link href="/notif" className="relative flex flex-col items-center">
            <Bell className={`w-6 h-6 ${isActive("/notif") ? "text-black" : "text-gray-500"}`} />
            {isActive("/notif") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            {/* MODIFIKASI: Menggunakan shouldShowNotifBubble yang dihitung */}
            {shouldShowNotifBubble && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">1</span>}
          </Link>
        </li>

        {/* Profile */}
        <li>
          <Link href={`/profile/${currentUserId}`} className="relative flex flex-col items-center">
            {/* ... (tidak ada perubahan di sini) */}
            <User className={`w-6 h-6 ${isActive(`/profile/${currentUserId}`) ? "text-black" : "text-gray-500"}`} />
            {isActive(`/profile/${currentUserId}`) && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
