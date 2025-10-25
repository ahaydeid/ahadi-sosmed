import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import BottomNavbar from "./components/BottomNavbar";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Somedi",
  description: "Dibuat oleh ahadi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased relative min-h-screen pb-14 bg-gray-50`}>
        {children}
        <BottomNavbar />
      </body>
    </html>
  );
}
