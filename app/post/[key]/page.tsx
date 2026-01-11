import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import PostDetailPage from "../../components/PostDetail/PostDetailPage";

interface Props {
  params: { key: string } | Promise<{ key: string }>;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const supabase = admin;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://ahadi.my.id";

  // 1. Fetch content (either by slug or UUID)
  let query = supabase.from("post_content").select("post_id, title, description, slug");
  if (isUuid(key)) {
    query = query.eq("post_id", key);
  } else {
    query = query.eq("slug", key);
  }

  const { data: content } = await query.maybeSingle();

  if (!content) {
    return {
      title: "Ahadi",
      description: "Sosial media ahadi",
      twitter: { card: "summary_large_image" },
    };
  }

  const title = content.title;
  const desc = content.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  
  // 2. Extract thumbnail
  const thumbnailMatch = content.description.match(/<img[^>]*\s+src=["']([^"'>]+)["']/i);
  const rawImage = thumbnailMatch ? thumbnailMatch[1] : "/icon.png";
  
  const ogImage = (() => {
    try {
      if (rawImage.startsWith('http')) return rawImage;
      const url = new URL(rawImage, base);
      return url.href;
    } catch {
      return `${base}/icon.png`;
    }
  })();

  const imageType = ogImage.endsWith(".png") ? "image/png" : "image/jpeg";

  const pagePath = content.slug || content.post_id;
  const pageUrl = `${base}/post/${pagePath}`;

  return {
    title,
    description: desc,
    metadataBase: new URL(base),
    alternates: {
      canonical: `/post/${pagePath}`,
    },
    openGraph: {
      title,
      description: desc,
      url: pageUrl,
      siteName: "Ahadi",
      images: [
        {
          url: ogImage,
          secureUrl: ogImage,
          alt: title,
          type: imageType,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

export async function generateStaticParams() {
  const supabase = admin;
  const { data: posts } = await supabase.from("post_content").select("slug");

  if (!posts) return [];
  return posts.map((p) => ({ key: String(p.slug) }));
}

export default async function Page({ params }: Props) {
  const { key } = await params;
  const supabase = admin;

  let postId: string | null = null;
  let slugValue: string | null = null;
  let fetchError = null;

  if (isUuid(key)) {
    postId = key;
    const { data: contentForSlug, error } = await supabase.from("post_content").select("slug").eq("post_id", postId).maybeSingle();
    if (error) fetchError = error;
    slugValue = contentForSlug?.slug ?? null;
  } else {
    slugValue = key;
    const { data: slugRow, error } = await supabase.from("post_content").select("post_id").eq("slug", key).maybeSingle();
    if (error) fetchError = error;
    postId = slugRow?.post_id ?? null;
  }

  if (fetchError || !postId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Ops! Terjadi masalah</h1>
        <p className="text-center text-gray-600 max-w-xs">
          {fetchError ? "Gagal memuat konten. Silakan cek koneksi internet Anda atau coba lagi nanti." : "Tulisan tidak ditemukan atau tautan salah."}
        </p>
      </div>
    );
  }

  const { data: post, error: err3 } = await supabase.from("post").select("id").eq("id", postId).maybeSingle();

  if (err3 || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Ops! Terjadi masalah</h1>
        <p className="text-center text-gray-600 max-w-xs">
          {err3 ? "Gagal memuat detail tulisan. Silakan coba beberapa saat lagi." : "Tulisan tidak ditemukan."}
        </p>
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
