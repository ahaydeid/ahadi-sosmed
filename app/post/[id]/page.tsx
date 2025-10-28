// app/post/[id]/page.tsx
import PostDetailClient from "./PostDetailClient";
import { supabaseServer } from "@/lib/supabaseServer";

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  // unwrap params (Next 16 memberikan Promise-like params)
  const { id } = await params;

  // optional: cek di server apakah post ada -> supaya bisa return "Tulisan tidak ditemukan"
  const supabase = supabaseServer();
  const { data: post, error: postError } = await supabase.from("post").select("id, user_id, created_at, visibility, status").eq("id", id).maybeSingle();

  if (!post || postError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-center text-gray-600">Tulisan tidak ditemukan</h1>
      </div>
    );
  }

  // render client component TANPA mengirim postId
  // PostDetailClient akan baca id lewat useParams()
  return (
    <div className="min-h-screen p-4 bg-white">
      <h1 className="sr-only">{post.id}</h1>
      <PostDetailClient />
    </div>
  );
}
