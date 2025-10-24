"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export default function TopBar() {
  const [activeTab, setActiveTab] = useState<"teratas" | "followed">("teratas");

  return (
    <div className="sticky top-0 mb-1 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-4 h-12">
        {/* Tabs */}
        <div className="flex items-center space-x-4">
          <button onClick={() => setActiveTab("teratas")} className={`text-sm font-medium ${activeTab === "teratas" ? "font-semibold text-black" : "text-gray-500"}`}>
            Teratas
          </button>
          <button onClick={() => setActiveTab("followed")} className={`text-sm font-medium ${activeTab === "followed" ? "font-semibold text-black" : "text-gray-500"}`}>
            Diikuti
          </button>
        </div>

        {/* Search icon */}
        <button>
          <Search className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
