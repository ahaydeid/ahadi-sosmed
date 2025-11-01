import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Konfigurasi (sebelumnya: matcher)
 * Menentukan path mana yang akan dilewati oleh proxy/middleware ini.
 * Mengecualikan semua file statis dan file khusus Next.js.
 */
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};

/**
 * Fungsi utama middleware/proxy
 * Bertanggung jawab untuk otentikasi Supabase dan proteksi rute.
 */
export default async function proxyMiddleware(req: NextRequest) {
  const currentPath = req.nextUrl.pathname;

  // Daftar Rute Publik (Tidak memerlukan otentikasi)
  if (
    currentPath === "/" ||
    currentPath === "/login" ||
    currentPath === "/signup" ||
    currentPath.startsWith("/auth") ||
    currentPath === "/post" ||
    currentPath.startsWith("/post/") ||
    currentPath.startsWith("/kebijakan/") ||
    currentPath === "/marah-marah"
  ) {
    // Lewatkan permintaan ke halaman berikutnya (publik)
    return NextResponse.next();
  }

  // Siapkan objek Response untuk memodifikasi cookie
  const res = NextResponse.next();

  // Inisialisasi Klien Supabase Sisi Server
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      // Ambil semua cookie dari request untuk Supabase
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      // Set cookie di response (untuk memperbarui sesi Supabase)
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...(options as CookieOptions) });
        });
      },
    },
  });

  // Ambil data user dari sesi Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logika Proteksi Rute (Akses Terbatas)
  if (!user) {
    // Jika user belum login, redirect ke halaman /login
    const loginUrl = new URL("/login", req.url);

    // Simpan path yang ingin diakses user sebagai parameter 'redirectedFrom'
    const fullPath = req.nextUrl.pathname + (req.nextUrl.search || "");
    loginUrl.searchParams.set("redirectedFrom", fullPath || "/");

    return NextResponse.redirect(loginUrl);
  }

  // Jika user sudah login, lanjutkan permintaan dan set cookie yang diperbarui
  return res;
}
