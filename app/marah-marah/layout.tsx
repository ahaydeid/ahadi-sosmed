import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marah-marah | Ahadi",
  description: "Luapkan kemarahanmu secara anonim di Ahadi. Bebas ekspresikan perasaanmu tanpa batasan. Platform anonim untuk berbagi emosi.",
  alternates: {
    canonical: "/marah-marah",
  },
  openGraph: {
    title: "Marah-marah | Ahadi",
    description: "Luapkan kemarahanmu secara anonim di Ahadi. Bebas ekspresikan perasaanmu tanpa batasan.",
    url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://ahadi.my.id"}/marah-marah`,
  },
};

export default function MarahMarahLayout({ children }: { children: React.ReactNode }) {
  return children;
}
