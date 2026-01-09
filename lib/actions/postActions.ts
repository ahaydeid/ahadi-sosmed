"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deletePostAction(postId: string) {
  const supabase = await createClient();

  // 1. Ambil data post untuk cek owner dan ambil image paths
  const { data: post, error: fetchError } = await supabase
    .from("post")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (fetchError || !post) {
    return { success: false, error: "Post tidak ditemukan" };
  }

  // 2. Verifikasi kepemilikan (Ownership check)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== post.user_id) {
    return { success: false, error: "Kamu tidak berhak menghapus postingan ini" };
  }

  // 3. Ambil content untuk cleanup storage
  const { data: content } = await supabase
    .from("post_content")
    .select("description")
    .eq("post_id", postId)
    .single();

  if (content) {
    const matches = Array.from(content.description.matchAll(/src=["']([^"'>]+)["']/gi)) as RegExpExecArray[];
    const storagePaths: string[] = [];

    matches.forEach((m) => {
      const url = m[1];
      if (url.includes("/post-images/")) {
        const path = url.split("/post-images/").pop();
        if (path) storagePaths.push(path);
      }
    });

    if (storagePaths.length > 0) {
      await supabase.storage.from("post-images").remove(storagePaths);
    }
  }

  // 4. Hapus dari database
  const { error: deleteError } = await supabase
    .from("post")
    .delete()
    .eq("id", postId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/");
  return { success: true };
}
