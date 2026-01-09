"use client";

import { useSidebar } from "@/app/context/SidebarContext";
import BottomNavbar from "./BottomNavbar";
import AuthListener from "./AuthListener";
import RegisterSW from "./RegisterSW";
import { Suspense } from "react";

export default function ClientLayout({ 
  children, 
  poppinsVariable 
}: { 
  children: React.ReactNode;
  poppinsVariable: string;
}) {
  const { isCollapsed } = useSidebar();
  
  return (
    <div suppressHydrationWarning className={`${poppinsVariable} antialiased relative min-h-screen bg-gray-50 transition-all duration-300`}>
      <Suspense fallback={null}>
        <AuthListener />
        <RegisterSW />

        {/* WRAPPER KONTEN - Margin mengikuti state sidebar di desktop */}
        <div suppressHydrationWarning className={`transition-all duration-300 ${isCollapsed ? "md:ml-20" : "md:ml-64"}`}>
          {children}
        </div>

        <BottomNavbar />
      </Suspense>
    </div>
  );
}
