"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * Komponen SVG Logo Google
 * Menggunakan SVG inline untuk logo Google
 */
const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M44.5 20H24V28.5H35.4298C34.4063 32.553 30.6548 35.5 24 35.5C18.275 35.5 13.5 30.725 13.5 25C13.5 19.275 18.275 14.5 24 14.5C27.2415 14.5 30.0768 15.7196 32.222 17.6186L38.2573 11.5833C34.2188 7.97184 29.3516 6 24 6C13.953 6 5.5 14.453 5.5 25C5.5 35.547 13.953 44 24 44C34.047 44 42.5 35.547 42.5 25C42.5 23.3248 42.2748 21.6502 41.8384 20H44.5Z"
      fill="#4285F4"
    />
    <path d="M6 24L13 29L13 21L6 24Z" fill="#34A853" />
    <path d="M24 6C29.3516 6 34.2188 7.97184 38.2573 11.5833L32.222 17.6186C30.0768 15.7196 27.2415 14.5 24 14.5C18.275 14.5 13.5 19.275 13.5 25L6.5 25C6.5 14.453 13.953 6 24 6Z" fill="#FBBC04" />
    <path d="M42 25H44V25H42ZM24 44C34.047 44 42.5 35.547 42.5 25H40.5C40.5 34.4682 33.1554 42 24 42C14.8446 42 7.5 34.4682 7.5 25H5.5C5.5 35.547 13.953 44 24 44Z" fill="#EA4335" />
    <path d="M13.5 25L6.5 25C6.5 29.8143 8.35647 34.2104 11.4685 37.5855L17.5038 31.5502C15.8202 29.7423 14.7735 27.478 14.5 25H13.5V25Z" fill="#34A853" />
    <path
      d="M38.2573 11.5833L32.222 17.6186C30.0768 15.7196 27.2415 14.5 24 14.5C18.275 14.5 13.5 19.275 13.5 25H14.5C14.7735 27.478 15.8202 29.7423 17.5038 31.5502L23.5391 37.5855C26.6512 34.2104 28.5076 29.8143 28.5076 25H35.4298C34.4063 32.553 30.6548 35.5 24 35.5C18.275 35.5 13.5 30.725 13.5 25C13.5 19.275 18.275 14.5 24 14.5V6C29.3516 6 34.2188 7.97184 38.2573 11.5833Z"
      fill="#FBBC04"
    />
  </svg>
);

function LoginContent() {
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const existing = searchParams.get("redirectedFrom");
  const qs = searchParams?.toString() ?? "";
  const current = pathname && pathname !== "/login" ? pathname + (qs ? `?${qs}` : "") : "/";
  const redirectedFrom = existing ?? encodeURIComponent(current);

  const handleLogin = async (providerName: "google" | "facebook") => {
    setLoadingProvider(providerName);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectedFrom=${redirectedFrom}`,
        },
      });
      if (!error && data?.url) window.location.assign(data.url);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Masuk Akun</h1>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => handleLogin("google")}
          disabled={loadingProvider === "google"}
          className="flex items-center justify-center gap-3 w-full border rounded-lg py-2.5 bg-white border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          {/* Logo Google diletakkan di sini */}
          {loadingProvider !== "google" && <GoogleLogo />}

          <span className="text-sm font-medium">{loadingProvider === "google" ? "Menghubungkan..." : "Lanjutkan dengan Google"}</span>
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-8 text-center">
        Dengan melanjutkan, kamu menyetujui{" "}
        <Link href="/kebijakan/layanan" className="text-sky-600 hover:underline">
          Ketentuan Layanan
        </Link>{" "}
        dan{" "}
        <Link href="/kebijakan/privasi" className="text-sky-600 hover:underline">
          Kebijakan Privasi
        </Link>
        .
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Memuat…</div>}>
      <LoginContent />
    </Suspense>
  );
}
