import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ahadi.my.id";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL on server" }, { status: 500 });
    }

    // buat client admin untuk query server-side
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ambil data post dan konten terkait
    const { data: post, error: postError } = await supabaseAdmin.from("post").select("id, user_id, created_at").eq("id", id).maybeSingle();

    const { data: content, error: contentError } = await supabaseAdmin.from("post_content").select("title, description, image_url").eq("post_id", id).maybeSingle();

    // siapkan URL gambar absolut bila ada
    const rawImage = typeof content?.image_url === "string" ? content.image_url : undefined;
    let absImage: string | undefined = undefined;
    if (rawImage) {
      try {
        absImage = new URL(rawImage, BASE).href;
      } catch {
        absImage = rawImage;
      }
    }

    // cek cepat apakah gambar bisa diakses (HEAD), agar kita tahu crawler bisa ambil image
    let imageCheck: { ok: boolean; status?: number; contentType?: string } = { ok: false };
    if (absImage) {
      try {
        const res = await fetch(absImage, { method: "HEAD" });
        imageCheck = {
          ok: res.ok,
          status: res.status,
          contentType: res.headers.get("content-type") ?? undefined,
        };
      } catch {
        imageCheck = { ok: false };
      }
    }

    // susun object OG-ready supaya gampang dibaca
    const og = {
      title: typeof content?.title === "string" ? content.title : null,
      description: typeof content?.description === "string" ? content.description.replace(/\n/g, " ").slice(0, 160) : null,
      image: absImage ?? null,
    };

    return NextResponse.json({
      ok: true,
      post: post ?? null,
      postError: postError ?? null,
      content: content ?? null,
      contentError: contentError ?? null,
      og,
      imageCheck,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
