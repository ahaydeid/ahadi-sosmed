"use client";

import { useSidebar } from "@/app/context/SidebarContext";
import BottomNavbar from "./BottomNavbar";
import AuthListener from "./AuthListener";
import RegisterSW from "./RegisterSW";
import NotificationHandler from "./NotificationHandler";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

export default function ClientLayout({ 
  children, 
  poppinsVariable 
}: { 
  children: React.ReactNode;
  poppinsVariable: string;
}) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();

  // Deteksi apakah ini halaman detail chat (misal: /chat/123)
  const isChatDetail = pathname.startsWith("/chat/") && pathname !== "/chat";
  
  return (
    <div suppressHydrationWarning className={`${poppinsVariable} antialiased relative min-h-screen bg-gray-50/10 transition-all duration-300`}>
      <Suspense fallback={null}>
        <AuthListener />
        <RegisterSW />
        <NotificationHandler />

        {/* WRAPPER KONTEN - PB-14 (jarak buat menu bawah mobile) dihapus kalau di detail chat */}
        <div 
          suppressHydrationWarning 
          className={`transition-all duration-300 ${!isChatDetail ? "pb-14" : ""} md:pb-0 ${isCollapsed ? "md:ml-20" : "md:ml-64"}`}
        >
          {children}
        </div>

        <BottomNavbar />
      </Suspense>
    </div>
  );
}
