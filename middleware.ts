import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export const config = {
  // Jalankan middleware di semua route kecuali yang publik sepenuhnya
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|login|signup).*)"],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Daftar rute yang hanya boleh diakses jika user sudah login
  const protectedRoutes = ["/chat", "/components", "/notif", "/profile", "/write"];

  // 🔓 Halaman "/" dikecualikan — bisa diakses publik meskipun belum login
  if (pathname === "/") {
    return res;
  }

  // 🚫 Jika user belum login dan akses route dilindungi → redirect ke /login
  if (protectedRoutes.some((route) => pathname.startsWith(route)) && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🔁 Jika user sudah login tapi akses /login → arahkan ke beranda
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ✅ Jika lolos semua pengecekan, lanjutkan request
  return res;
}
