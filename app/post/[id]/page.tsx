// app/post/[id]/page.tsx
import { notFound } from "next/navigation";
import PostDetailClient from "./PostDetailClient"; // --> ini harus "use client" di file-nya
import { createClient } from "@supabase/supabase-js";

function supabaseServer() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: content } = await supabase.from("post_content").select("title,description,image_url").eq("post_id", params.id).maybeSingle();

  if (!content) {
    return {
      title: "Tulisan tidak ditemukan",
      description: "Konten tidak tersedia",
      robots: "noindex, nofollow",
    };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || "ahadi.my.id";
  const url = `https://${site.replace(/^https?:\/\//, "").replace(/\/$/, "")}/post/${params.id}`;

  return {
    title: content.title,
    description: (content.description ?? "").slice(0, 150),
    openGraph: {
      title: content.title,
      description: (content.description ?? "").slice(0, 200),
      url,
      images: content.image_url ? [{ url: content.image_url }] : undefined,
    },
    twitter: {
      card: content.image_url ? "summary_large_image" : "summary",
      title: content.title,
      description: (content.description ?? "").slice(0, 200),
    },
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: post } = await supabase.from("post").select("id").eq("id", params.id).maybeSingle();
  const { data: content } = await supabase.from("post_content").select("title,image_url").eq("post_id", params.id).maybeSingle();

  if (!post || !content) notFound();

  return <PostDetailClient postId={params.id} />;
}
