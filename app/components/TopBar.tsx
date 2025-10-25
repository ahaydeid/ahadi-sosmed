"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search } from "lucide-react"; // 🔍 icon search

export default function TopBar() {
  const [activeTab, setActiveTab] = useState<"teratas" | "followed">("teratas");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  // 🔹 Cek apakah user sudah login
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };

    checkSession();

    // 🔁 Listener agar berubah otomatis jika user login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="sticky top-0 mb-1 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Tabs */}
        <div className="flex items-center space-x-4">
          <button onClick={() => setActiveTab("teratas")} className={`text-sm ${activeTab === "teratas" ? "font-semibold text-black" : "text-gray-500"}`}>
            Teratas
          </button>
          <button onClick={() => setActiveTab("followed")} className={`text-sm ${activeTab === "followed" ? "font-semibold text-black" : "text-gray-500"}`}>
            Diikuti
          </button>
        </div>

        {/* 🔹 Jika belum login → tombol Login */}
        {!isLoggedIn ? (
          <button onClick={() => router.push("/login")} className="bg-sky-600 hover:bg-sky-600 text-white text-sm font-medium px-3 py-1.5 rounded transition-colors">
            Login
          </button>
        ) : (
          // 🔍 Jika sudah login → tombol Search (dummy)
          <button aria-label="Cari" className="text-gray-700 hover:text-black transition">
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
