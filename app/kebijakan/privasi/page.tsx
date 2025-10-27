"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivasiPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-white text-gray-800 pb-10">
      {/* 🔹 Sticky Header */}
      <header className="sticky top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm h-14 flex items-center justify-between px-4 z-10">
        <button onClick={() => router.back()} aria-label="Kembali" className="text-gray-700 hover:text-black transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1 text-center">Kebijakan Privasi</h1>
        <div className="w-5" /> {/* spacer agar teks tetap center */}
      </header>

      {/* 🔹 Isi Halaman */}
      <div className="px-6 pt-8">
        <p className="mb-4">
          Privasimu penting bagi kami. Kebijakan ini menjelaskan bagaimana <strong>Ahadi</strong> mengumpulkan, menyimpan, menggunakan, dan melindungi data pribadi pengguna ketika kamu berinteraksi di platform ini. Kami berkomitmen untuk
          menjaga keamanan dan kerahasiaan setiap informasi yang kamu percayakan kepada kami.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Data yang Kami Kumpulkan</h2>
        <p className="mb-4">
          Ahadi dapat mengumpulkan informasi dasar seperti nama, alamat email, foto profil, serta aktivitas kamu di platform (misalnya postingan, komentar, atau interaksi lainnya). Kami juga dapat menyimpan data teknis seperti alamat IP dan
          jenis perangkat yang digunakan untuk menjaga keamanan sistem.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Cara Kami Menggunakan Data</h2>
        <p className="mb-4">
          Data yang dikumpulkan digunakan untuk memperbaiki pengalaman pengguna, menampilkan konten yang relevan, serta menjaga kenyamanan komunitas. Kami tidak akan pernah menjual atau membagikan data pribadimu kepada pihak ketiga tanpa
          izinmu, kecuali jika diwajibkan oleh hukum.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Keamanan dan Penyimpanan Data</h2>
        <p className="mb-4">
          Kami menggunakan langkah keamanan teknis dan administratif untuk melindungi data dari akses yang tidak sah. Namun, meskipun kami berupaya maksimal, tidak ada sistem digital yang sepenuhnya bebas dari risiko. Kami menyarankan kamu
          tetap berhati-hati dan menjaga kerahasiaan informasi pribadimu.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Hak Pengguna</h2>
        <p className="mb-4">
          Kamu berhak mengakses, memperbarui, atau menghapus informasi pribadimu kapan saja melalui pengaturan akun. Apabila kamu ingin menonaktifkan akun atau menghapus data permanen, kamu dapat menghubungi kami melalui halaman bantuan.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Perubahan Kebijakan</h2>
        <p className="mb-4">
          Kebijakan Privasi ini dapat diperbarui sewaktu-waktu untuk menyesuaikan dengan perkembangan layanan Ahadi atau ketentuan hukum yang berlaku. Perubahan penting akan kami umumkan melalui pemberitahuan di aplikasi atau situs web
          resmi Ahadi.
        </p>

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
