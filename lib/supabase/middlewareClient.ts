import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Supabase middleware client — digunakan di middleware.ts
export const createSupabaseMiddlewareClient = (req: NextRequest, res: NextResponse) => {
  return createMiddlewareClient({ req, res });
};
