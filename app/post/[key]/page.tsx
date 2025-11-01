import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import PostDetailPage from "../../components/PostDetail/PostDetailPage";

interface Props {
  params: { key: string } | Promise<{ key: string }>;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const supabase = supabaseServer();

  let postId: string | null = null;
  let slugValue: string | null = null;

  if (isUuid(key)) {
    postId = key;
    const { data: contentForSlug } = await supabase.from("post_content").select("slug, title, description, image_url").eq("post_id", postId).maybeSingle();
    slugValue = contentForSlug?.slug ?? null;
  } else {
    slugValue = key;
    const { data: slugRow } = await supabase.from("post_content").select("post_id, title, description, image_url").eq("slug", key).maybeSingle();
    postId = slugRow?.post_id ?? null;
  }

  const content =
    (await (async () => {
      if (postId) {
        const { data } = await supabase.from("post_content").select("title, description, image_url").eq("post_id", postId).maybeSingle();
        return data ?? null;
      }
      return null;
    })()) ?? null;

  if (!postId) {
    return {
      title: "ahadi",
      description: "Sosial media ahadi",
      twitter: { card: "summary_large_image" },
    };
  }

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

  const pagePath = slugValue ? slugValue : postId;
  const pageUrl = `${base}/post/${pagePath}`;

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
  const { key } = await params;
  const supabase = supabaseServer();

  let postId: string | null = null;
  let slugValue: string | null = null;

  if (isUuid(key)) {
    postId = key;
    const { data: contentForSlug } = await supabase.from("post_content").select("slug").eq("post_id", postId).maybeSingle();
    slugValue = contentForSlug?.slug ?? null;
  } else {
    slugValue = key;
    const { data: slugRow } = await supabase.from("post_content").select("post_id").eq("slug", key).maybeSingle();
    postId = slugRow?.post_id ?? null;
  }

  if (!postId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-center text-gray-600">Tulisan tidak ditemukan</h1>
      </div>
    );
  }

  const { data: post } = await supabase.from("post").select("id").eq("id", postId).maybeSingle();

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
      <PostDetailPage initialPostId={postId} initialSlug={slugValue ?? undefined} />
    </div>
  );
}
