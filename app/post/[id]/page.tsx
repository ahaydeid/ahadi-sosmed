// app/post/[id]/page.tsx
import type { Metadata } from "next";
import PostDetailClient from "@/app/components/PostDetailClient";
import { supabaseServer } from "@/lib/supabaseServer";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = supabaseServer();
  const { data: content } = await supabase.from("post_content").select("title, description, image_url").eq("post_id", id).maybeSingle();

  const title = content?.title ?? "ahadi";
  const desc = (content?.description ?? "").replace(/\n/g, " ").slice(0, 160);
  const rawImage = content?.image_url ?? "https://ahadi.my.id/icon.png";
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ahadi.my.id";
  const absImage = (() => {
    try {
      return new URL(rawImage, base).href;
    } catch {
      return rawImage;
    }
  })();
  const isWebp = /\.webp(\?.*)?$/i.test(absImage);
  const ogImage = isWebp ? `${base}/icon.png` : absImage;
  const pageUrl = `${base}/post/${id}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { data: post } = await supabase.from("post").select("id").eq("id", id).maybeSingle();

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-center text-gray-600">Tulisan tidak ditemukan</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <h1 className="sr-only">{post.id}</h1>
      <PostDetailClient />
    </div>
  );
}
