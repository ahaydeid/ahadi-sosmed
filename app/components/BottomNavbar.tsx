"use client";

import { Home, Pencil, MessageSquare, Bell, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNavbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

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
            <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">6</span>
          </Link>
        </li>

        {/* Notif */}
        <li>
          <Link href="/notif" className="relative flex flex-col items-center">
            <Bell className={`w-6 h-6 ${isActive("/notif") ? "text-black" : "text-gray-500"}`} />
            {isActive("/notif") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
            <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">17</span>
          </Link>
        </li>

        {/* Profile */}
        <li>
          <Link href="/profile" className="relative flex flex-col items-center">
            <User className={`w-6 h-6 ${isActive("/profile") ? "text-black" : "text-gray-500"}`} />
            {isActive("/profile") && <div className="w-6 h-0.5 bg-black rounded-full mt-1" />}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
