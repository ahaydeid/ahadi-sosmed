"use server";

import { supabase } from "@/lib/supabaseClient";

/**
 * Menambah jumlah views untuk posting tertentu.
 * @param postId UUID dari post yang ingin di-update.
 */
export async function incrementPostViews(postId: string) {
  try {
    await supabase.rpc("increment_post_views", { postid: postId });
  } catch (err) {
    console.error("Gagal menambah views:", err);
  }
}
