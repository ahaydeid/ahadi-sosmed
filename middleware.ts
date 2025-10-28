import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)"],
};

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  if (p === "/" || p === "/login" || p.startsWith("/auth") || p === "/post" || p.startsWith("/post/")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set({ name, value, ...(options as CookieOptions) });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = new URL("/login", req.url);
    const full = req.nextUrl.pathname + (req.nextUrl.search || "");
    url.searchParams.set("redirectedFrom", full || "/");
    return NextResponse.redirect(url);
  }

  return res;
}
