"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

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
