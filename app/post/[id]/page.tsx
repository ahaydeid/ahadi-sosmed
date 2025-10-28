import "server-only";
import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import PostDetailClient from "./PostDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ahadi.my.id";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const supabase = await getSupabaseAdmin();
    const { data: post } = await supabase.from("post").select("id").eq("id", params.id).maybeSingle();
    if (!post) return { title: "Tulisan tidak ditemukan", description: "Konten tidak tersedia" };
    const { data: content } = await supabase.from("post_content").select("title, description, image_url").eq("post_id", post.id).maybeSingle();
    const title = content?.title ?? "Tulisan";
    const desc = (content?.description ?? "").slice(0, 160);
    const url = `${SITE_URL}/post/${post.id}`;
    const img = content?.image_url && content.image_url.startsWith("http") ? content.image_url : `${SITE_URL}/og-default.jpg`;
    return {
      title,
      description: desc,
      metadataBase: new URL(SITE_URL),
      alternates: { canonical: url },
      openGraph: { type: "article", url, title, description: desc, images: [{ url: img, width: 1200, height: 630 }] },
      twitter: { card: "summary_large_image", title, description: desc, images: [img] },
    };
  } catch {
    return { title: "Tulisan tidak ditemukan", description: "Konten tidak tersedia" };
  }
}

export default function Page({ params }: { params: { id: string } }) {
  return <PostDetailClient id={params.id} />;
}
