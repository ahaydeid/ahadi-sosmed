import NotificationLists from "../components/NotificationLists";
// import React from "react";
import type { Metadata } from "next";
import { Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Notifikasi | Dalam Pengembangan",
  description: "Halaman notifikasi sedang dikembangkan.",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen py-4">
      <header className="sticky top-0 z-40 bg-white py-2 flex items-center justify-between">
        <h1 className="text-2xl px-4 font-bold">Notifikasi</h1>
        <button aria-label="Cari notifikasi" className="p-2">
          <Search className="w-6 h-6 text-black" />
        </button>
      </header>
      <NotificationLists />
    </div>
  );
}
