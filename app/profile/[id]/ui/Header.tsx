"use client";

import { MoreVertical, ArrowLeft, LogOut, Settings } from "lucide-react";
import VerifiedBadge from "@/app/components/ui/VerifiedBadge";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useSidebar } from "@/app/context/SidebarContext";

interface HeaderProps {
  displayName: string;
  verified: boolean;
  onLogout: () => void;
  isOwnProfile: boolean;
}

export default function Header({ displayName, verified, onLogout, isOwnProfile }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { isCollapsed } = useSidebar();

  const setupRoute = "/profile/setup" as Route;

  return (
    <header className={`fixed top-0 right-0 bg-white border-b border-gray-200 z-20 h-14 flex items-center justify-between px-4 transition-all duration-300 ${isCollapsed ? "left-0 md:left-20" : "left-0 md:left-64"}`}>
      <div className="flex items-center">
        <button onClick={() => window.history.back()} aria-label="Kembali" className="mr-4 text-gray-700 hover:text-black transition">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-lg font-bold text-gray-800 truncate flex items-center gap-1">
          {displayName}
          {verified && <VerifiedBadge className="w-4 h-4" />}
        </h1>
      </div>

      {isOwnProfile && (
        <div className="relative">
          <button onClick={() => setMenuOpen((prev) => !prev)} aria-label="Menu" className="text-gray-700 hover:text-black transition">
            < MoreVertical className="w-6 h-6" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-sm py-1 z-50">
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-gray-100 transition whitespace-nowrap text-left">
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Logout</span>
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push(setupRoute);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition whitespace-nowrap text-left"
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Pengaturan Akun</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
