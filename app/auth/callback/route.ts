import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeDecodeRedirect(raw: string | null | undefined): string {
  if (!raw) return "/";
  try {
    let decoded = raw;
    // decode sampai 3 kali maksimal
    for (let i = 0; i < 3; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    // pastikan relative
    if (!decoded.startsWith("/")) return "/";
    return decoded;
  } catch {
    return "/";
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  // Target redirect yang sudah di-decode & disanitasi
  const to = safeDecodeRedirect(url.searchParams.get("redirectedFrom"));

  // Ambil store cookie server via helper
  const supabase = await createClient();

  if (code) {
    // Exchange code → session (akan memanggil setAll di atas)
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(to, url.origin));
}
