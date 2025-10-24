"use client"; // <-- SOLUSI: Jadikan Client Component

import { Wrench } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation"; // Opsi yang lebih baik dari window.history.back()

/**
 * Komponen untuk menampilkan pesan halaman sedang dalam pengembangan.
 */
export default function UnderDevelopment() {
  const router = useRouter(); // Gunakan useRouter dari next/navigation

  const handleBack = () => {
    // Menggunakan router.back() adalah cara yang lebih baik
    // daripada window.history.back() di Next.js
    router.back();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
      {/* Ikon Kunci Pas/Wrench */}
      <Wrench className="w-12 h-12 text-blue-500 mb-4" />

      {/* Judul */}
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Sedang Dalam Pengembangan</h2>

      {/* Deskripsi */}
      <p className="text-gray-600 max-w-md">Mohon maaf, halaman ini sedang dalam tahap pembangunan dan pembaruan. Fitur ini akan segera tersedia!</p>

      {/* Tombol yang sekarang berfungsi karena berada di Client Component */}
      <div className="mt-6">
        <button
          onClick={handleBack} // Menggunakan fungsi handleBack dari useRouter
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-150"
        >
          Kembali ke Halaman Sebelumnya
        </button>
      </div>
    </div>
  );
}
