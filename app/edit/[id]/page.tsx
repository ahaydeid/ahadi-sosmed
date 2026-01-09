"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import RichTextEditor from "@/app/components/Editor/RichTextEditor";
import { useParams, useRouter } from "next/navigation";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isRepost, setIsRepost] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          alert("Kamu belum login!");
          router.push("/login");
          return;
        }

        // Fetch post to check ownership
        const { data: post, error: postError } = await supabase
          .from("post")
          .select("user_id, repost_of")
          .eq("id", id)
          .single();

        if (postError || !post) {
          console.error("Post not found:", postError);
          alert("Postingan tidak ditemukan.");
          router.push("/profile/" + userId);
          return;
        }

        if (post.user_id !== userId) {
          alert("Kamu tidak memiliki izin untuk mengedit postingan ini.");
          router.push("/");
          return;
        }

        setIsRepost(!!post.repost_of);

        // Fetch content
        const { data: contentData, error: contentError } = await supabase
          .from("post_content")
          .select("title, description")
          .eq("post_id", id)
          .single();

        if (contentError) {
          console.error("Gagal mengambil konten:", contentError);
          alert("Gagal memuat konten.");
          return;
        }

        if (contentData) {
          setTitle(contentData.title);
          setContent(contentData.description);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPost();
    }
  }, [id, router]);

  function generateSlug(text: string): string {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    return `${base}-${Date.now().toString(36)}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Judul dan isi tidak boleh kosong.");
      return;
    }
    setSaving(true);
    try {
      // Only regenerate slug if NOT a repost, optionally? 
      // Actually usually you don't change slug for reposts or even existing posts often.
      // But preserving existing logic:
      const slug = generateSlug(title);

      const { error: updateError } = await supabase
        .from("post_content")
        .update({
          title,
          description: content,
          slug, 
        })
        .eq("post_id", id);

      if (updateError) {
        console.error("Gagal update konten:", updateError.message);
        alert("Gagal menyimpan perubahan.");
        return;
      }

      alert("Perubahan berhasil disimpan!");
      router.push(`/post/${slug}`); // Redirect to the updated post
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan saat menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">Edit Tulisan</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isRepost && (
          <input
            type="text"
            placeholder="Judul"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white border rounded px-3 py-3 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        )}

        <div className="border rounded-md focus:ring-1 focus:ring-gray-600">
          <RichTextEditor content={content} onChange={setContent} placeholder="Tulis opini kamu di sini..." />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </div>
  );
}
