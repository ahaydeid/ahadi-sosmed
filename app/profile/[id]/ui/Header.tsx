"use client";

import { MoreVertical, ArrowLeft, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

interface HeaderProps {
  displayName: string;
  verified: boolean;
  onLogout: () => void;
}

export default function Header({ displayName, verified, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  const setupRoute = "/profile/setup" as Route;

  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-20 h-14 flex items-center justify-between px-4">
      <div className="flex items-center">
        <button
          onClick={() => window.history.back()}
          aria-label="Kembali"
          className="mr-4 text-gray-700 hover:text-black transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-lg font-bold text-gray-800 truncate flex items-center gap-1">
          {displayName}
          {verified && <BadgeCheck className="w-4 h-4 text-sky-500" />}
        </h1>
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Menu"
          className="text-gray-700 hover:text-black transition"
        >
          <MoreVertical className="w-6 h-6" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
            <button
              onClick={onLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
            >
              Logout
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                router.push(setupRoute);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Pengaturan Akun
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
