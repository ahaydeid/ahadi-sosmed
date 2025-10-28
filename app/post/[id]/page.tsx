// import React from "react";
// import Image from "next/image";
import PostDetailClient from "./PostDetailClient";
import { supabaseServer } from "@/lib/supabaseServer";

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const supabase = supabaseServer();
  const { data: post, error: postError } = await supabase.from("post").select("id, user_id, created_at, visibility, status").eq("id", id).maybeSingle();
  if (!post || postError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <h1 className="text-center text-gray-600">Tulisan tidak ditemukan</h1>
      </div>
    );
  }

  const { data: content } = await supabase.from("post_content").select("*").eq("post_id", id).maybeSingle();

  return (
    <div>
      <div className="min-h-screen p-4 bg-white">
        <h1 className="sr-only">{content?.title ?? "(Tanpa judul)"}</h1>
        <PostDetailClient postId={id} />
      </div>
    </div>
  );
}
