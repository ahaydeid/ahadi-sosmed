import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import BottomNavbar from "./components/BottomNavbar";
import AuthListener from "./components/AuthListener";
import RegisterSW from "./components/RegisterSW";
import { Suspense } from "react";

const poppins = localFont({
  src: [
    { path: "../public/fonts/poppins/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/poppins/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/poppins/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/poppins/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ahadi",
  description: "Dibuat oleh ahadi",
  icons: { icon: "/icon.png", apple: "/apple-touch-icon.png" },
  themeColor: "#0EA5E9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${poppins.variable} antialiased relative min-h-screen pb-14 bg-gray-50`}>
        <Suspense fallback={null}>
          <AuthListener />
          <RegisterSW />
          {children}
          <BottomNavbar />
        </Suspense>
      </body>
    </html>
  );
}
