"use client";

import NotificationLists from "../components/NotificationLists";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use suppressHydrationWarning on the result of the second pass to be super safe
  if (!mounted) {
    return (
      <div suppressHydrationWarning className="min-h-screen py-4 bg-white">
        <header className="sticky top-0 z-40 bg-white py-2 flex items-center justify-between px-4 border-b border-gray-100">
          <div className="h-8 w-32 bg-gray-100 animate-pulse rounded" />
          <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-full" />
        </header>
        <div className="p-4 space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen py-4">
      <header suppressHydrationWarning className="sticky top-0 z-40 bg-white py-2 flex items-center justify-between">
        <h1 className="text-2xl px-4 font-bold">Notifikasi</h1>
        <button aria-label="Cari notifikasi" className="p-2">
          <Search className="w-6 h-6 text-black" />
        </button>
      </header>
      <NotificationLists />
    </div>
  );
}
