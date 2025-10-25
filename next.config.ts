/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com", // untuk foto profil Google OAuth
      },
      {
        protocol: "https",
        hostname: "example.com", // tambahkan contoh domain eksternal
      },
      {
        protocol: "https",
        hostname: "**.facebook.com", // kalau pakai Facebook
      },
    ],
  },
};

module.exports = nextConfig;
