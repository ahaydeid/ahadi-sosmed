import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Feed from "./components/Feed";
import TopBar from "./components/TopBar";
import { PostCardData } from "@/lib/types/post";

export const revalidate = 60;

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (key) => cookieStore.get(key)?.value } });

  const { data: posts, error } = await supabase.from("post").select("id, created_at, user_id, visibility").eq("visibility", "public").order("created_at", { ascending: false }).limit(20);

  if (error || !posts) {
    console.error("Error loading posts:", error?.message);
    return <p className="text-center text-gray-500 mt-10">Gagal memuat postingan</p>;
  }

  const postIds = posts.map((p) => p.id);
  const userIds = posts.map((p) => p.user_id);

  const { data: contents } = await supabase.from("post_content").select("post_id, title, description, image_url, author_image, slug").in("post_id", postIds);

  const { data: profiles } = await supabase.from("user_profile").select("id, display_name, avatar_url, verified").in("id", userIds);

  const contentMap = new Map(contents?.map((c) => [c.post_id, c]));
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  const initialPosts: (PostCardData & { slug?: string | null; verified?: boolean; created_at: string })[] = posts.map((p) => {
    const content = contentMap.get(p.id);
    const profile = profileMap.get(p.user_id);

    return {
      id: p.id,
      author: profile?.display_name ?? "Anonim",
      authorImage: content?.author_image ?? profile?.avatar_url ?? null,
      title: content?.title ?? "(Tanpa judul)",
      description: content?.description ?? "",
      imageUrl: content?.image_url ?? null,
      date: new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      created_at: p.created_at, // <--- Tambahkan baris ini (mentah dari Supabase)
      views: 0,
      likes: 0,
      comments: 0,
      slug: content?.slug ?? null,
      verified: profile?.verified ?? false,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Feed initialPosts={initialPosts} />
    </div>
  );
}
