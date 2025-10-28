//plesase
import PostDetailClient from "@/app/components/PostDetailClient";

import { supabaseServer } from "@/lib/supabaseServer";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { data: content } = await supabase.from("post_content").select("title, description, image_url").eq("post_id", id).maybeSingle();

  const title = content?.title ?? "ahadi";
  const desc = (content?.description ?? "").replace(/\n/g, " ").slice(0, 160);
  const image = content?.image_url ?? "https://ahadi.my.id/icon.png";
  const ogImage = image.endsWith(".webp") ? "https://ahadi.my.id/icon.png" : image;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
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
