/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // 🔹 Foto profil bawaan dari Google OAuth
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      // 🔹 Foto profil dari Facebook
      {
        protocol: "https",
        hostname: "**.facebook.com",
      },
      // 🔹 Domain eksternal lain (opsional)
      {
        protocol: "https",
        hostname: "example.com",
      },
      // 🔹 Gambar yang disimpan di Supabase Storage
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
