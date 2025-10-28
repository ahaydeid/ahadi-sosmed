import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PostDetailClient from "./PostDetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ahadi.my.id";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string, { auth: { persistSession: false } });

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // ambil data dasar post
  const { data: post } = await supabase.from("post").select("id").eq("id", params.id).single();

  if (!post) {
    return {
      title: "Tulisan tidak ditemukan",
      description: "Konten tidak tersedia",
      robots: { index: false, follow: false },
    };
  }

  // ambil konten untuk og
  const { data: content } = await supabase.from("post_content").select("title, description, image_url").eq("post_id", post.id).single();

  const title = content?.title ?? "Tulisan";
  const desc = (content?.description ?? "Baca selengkapnya").slice(0, 160);
  const url = `${SITE_URL}/post/${post.id}`;
  const image = content?.image_url && content.image_url.startsWith("http") ? content.image_url : `${SITE_URL}/og-default.jpg`;

  return {
    title,
    description: desc,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description: desc,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [image],
    },
  };
}

export default function Page({ params }: { params: { id: string } }) {
  // komponen client menerima id sebagai prop
  return <PostDetailClient id={params.id} />;
}
