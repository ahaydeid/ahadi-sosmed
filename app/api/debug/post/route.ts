import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL on server" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data: post, error: postError } = await supabaseAdmin.from("post").select("*").eq("id", id).maybeSingle();
    const { data: content, error: contentError } = await supabaseAdmin.from("post_content").select("*").eq("post_id", id).maybeSingle();

    return NextResponse.json({ post, postError: postError ?? null, content, contentError: contentError ?? null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
