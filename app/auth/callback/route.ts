import { NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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

  // Siapkan response redirect lebih awal (supaya cookie ditulis ke response ini)
  const res = NextResponse.redirect(new URL(to, url.origin));

  // Ambil store cookie server
  const store = await nextCookies();

  // Pakai API cookies getAll/setAll (non-deprecated)
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        // baca semua cookie masuk dari request yang aktif
        return store.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        // tulis semua cookie ke response redirect
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...(options as CookieOptions) });
        });
      },
    },
  });

  if (code) {
    // Exchange code → session (akan memanggil setAll di atas)
    await supabase.auth.exchangeCodeForSession(code);
  }

  return res;
}
