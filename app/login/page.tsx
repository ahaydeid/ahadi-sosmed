"use client";

import { Chrome, Facebook, Github, Twitter, Apple } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

interface Provider {
  name: string;
  icon: React.ElementType;
  isDisabled: boolean;
}

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const providers: Provider[] = [
    { name: "Google", icon: Chrome, isDisabled: false },
    { name: "Facebook", icon: Facebook, isDisabled: false },
    { name: "GitHub", icon: Github, isDisabled: true },
    { name: "Twitter (X)", icon: Twitter, isDisabled: true },
    { name: "Apple", icon: Apple, isDisabled: true },
  ];

  const handleLogin = async (providerName: string) => {
    if (providerName === "Google" || providerName === "Facebook") {
      try {
        setLoadingProvider(providerName);

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: providerName.toLowerCase() as "google" | "facebook",
          options: {
            redirectTo: `${window.location.origin}/`, // langsung ke halaman utama
          },
        });

        if (error) {
          console.error("Login error:", error.message);
          return;
        }

        if (data?.url) {
          // 🚀 redirect keluar ke OAuth tanpa error ESLint
          window.open(data.url, "_self");
        }
      } finally {
        setLoadingProvider(null);
      }
    } else {
      console.log(`${providerName} belum tersedia untuk login`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Masuk Akun</h1>
      </div>

      {/* Tombol Login Sosial */}
      <div className="w-full max-w-xs space-y-3">
        {providers.map((provider) => (
          <button
            key={provider.name}
            disabled={provider.isDisabled || loadingProvider === provider.name}
            onClick={() => handleLogin(provider.name)}
            className={`flex items-center justify-center gap-3 w-full border rounded-lg py-2.5 transition active:scale-95 ${
              provider.isDisabled ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {provider.icon && <provider.icon className="w-5 h-5" />}
            <span className="text-sm font-medium">{loadingProvider === provider.name ? "Menghubungkan..." : `Lanjutkan dengan ${provider.name}`}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-500 mt-8 text-center">
        Dengan melanjutkan, kamu menyetujui <span className="text-sky-600 hover:underline cursor-pointer">Ketentuan Layanan</span> dan <span className="text-sky-600 hover:underline cursor-pointer">Kebijakan Privasi</span>.
      </p>
    </div>
  );
}
