import UnderDevelopment from "../components/UnderDevelopment";
import React from "react";
import type { Metadata } from "next";

// Opsional: Atur Metadata untuk halaman ini
export const metadata: Metadata = {
  title: "Notifikasi | Dalam Pengembangan",
  description: "Halaman notifikasi sedang dikembangkan.",
};

export default function NotificationsPage() {
  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <h1 className="sticky top-0 z-40 bg-white text-2xl font-bold mb-8 pt-2 pb-2">Notifikasi</h1>

      {/* Render komponen UnderDevelopment */}
      <UnderDevelopment />
    </div>
  );
}
