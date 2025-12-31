import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "Ahadi",
  description: "Sosial media Ahadi",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

import { SidebarProvider } from "./context/SidebarContext";
import ClientLayout from "./components/ClientLayout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <SidebarProvider>
        <ClientLayout poppinsVariable={poppins.variable}>
          {children}
        </ClientLayout>
      </SidebarProvider>
    </html>
  );
}
