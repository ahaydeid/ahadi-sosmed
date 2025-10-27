"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function LayananPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-gray-800 pb-10">
      {/* 🔹 Sticky Header */}
      <header className="sticky top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm h-14 flex items-center justify-between px-4 z-10">
        <button onClick={() => router.back()} aria-label="Kembali" className="text-gray-700 hover:text-black transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1 text-center">Ketentuan Layanan</h1>
        <div className="w-5" /> {/* Spacer agar teks tetap center */}
      </header>

      {/* 🔹 Isi Halaman */}
      <div className="px-6 pt-8">
        <h1 className="text-2xl font-bold mb-4">Ketentuan Layanan Ahadi</h1>
        <p className="mb-4">
          Selamat datang di <strong>Ahadi</strong> — ruang sosial untuk berbagi ide, tulisan, dan inspirasi pribadi. Halaman ini berisi ketentuan penggunaan layanan yang berlaku bagi setiap pengguna. Dengan menggunakan platform ini, kamu
          dianggap telah membaca, memahami, dan menyetujui seluruh kebijakan yang dijelaskan di bawah.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Penggunaan yang Bertanggung Jawab</h2>
        <p className="mb-4">
          Pengguna diharapkan menggunakan Ahadi secara positif dan saling menghormati. Dilarang keras memposting konten yang mengandung ujaran kebencian, pornografi, kekerasan, spam, atau pelanggaran terhadap hukum yang berlaku.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Konten dan Kepemilikan</h2>
        <p className="mb-4">
          Setiap konten yang kamu unggah di Ahadi tetap menjadi milikmu. Namun, dengan membagikannya di platform ini, kamu memberikan izin non-eksklusif kepada Ahadi untuk menampilkan dan mendistribusikan konten tersebut dalam konteks
          layanan (misalnya di feed publik atau rekomendasi).
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Keamanan dan Privasi</h2>
        <p className="mb-4">
          Kami berkomitmen menjaga keamanan akun dan privasi datamu. Jangan membagikan kata sandi kepada siapa pun, dan pastikan aktivitasmu di platform sesuai dengan ketentuan <strong>Kebijakan Privasi</strong> kami.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Perubahan dan Pembaruan</h2>
        <p className="mb-4">Ketentuan ini dapat diperbarui sewaktu-waktu untuk menyesuaikan dengan perkembangan platform. Perubahan akan diumumkan melalui halaman ini atau pemberitahuan di dalam aplikasi.</p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Tanggung Jawab Pengguna</h2>
        <p className="mb-4">Pengguna bertanggung jawab atas seluruh aktivitas yang dilakukan melalui akunnya. Jika ditemukan pelanggaran terhadap ketentuan ini, Ahadi berhak menangguhkan atau menutup akun secara permanen.</p>

        <p className="text-sm text-gray-500 mt-8">
          Terakhir diperbarui:{" "}
          {new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </main>
  );
}
