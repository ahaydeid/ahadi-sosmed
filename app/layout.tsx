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

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ahadi.my.id";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Ahadi | Wadah Ekspresi dan Tulisan",
    template: "%s | Ahadi"
  },
  description: "Ahadi adalah platform sosial media untuk berbagi tulisan, opini, dan ekspresi secara bebas dan kreatif.",
  keywords: ["sosial media", "blog", "tulisan", "opini", "ekspresi", "ahadi", "indonesia"],
  authors: [{ name: "Ahadi Team" }],
  creator: "Ahadi Team",
  publisher: "Ahadi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: baseUrl,
    siteName: "Ahadi",
    title: "Ahadi | Wadah Ekspresi dan Tulisan",
    description: "Platform sosial media untuk berbagi tulisan dan ekspresi secara bebas.",
    images: [
      {
        url: "/icon.png",
        width: 1200,
        height: 630,
        alt: "Ahadi Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ahadi | Wadah Ekspresi dan Tulisan",
    description: "Platform sosial media untuk berbagi tulisan dan ekspresi secara bebas.",
    images: ["/icon.png"],
  },
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
