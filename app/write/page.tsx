"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import RichTextEditor from "@/app/components/Editor/RichTextEditor";
import HashtagInput from "@/app/components/HashtagInput";

export default function WritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);

  useEffect(() => {
    async function checkPermission() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profile")
        .select("can_post")
        .eq("id", session.user.id)
        .single();

      if (!profile?.can_post) {
        alert("Kamu belum memiliki izin untuk membuat tulisan. Silakan ajukan izin poster terlebih dahulu.");
        router.push("/");
        return;
      }

      setCheckingPermission(false);
    }

    checkPermission();
  }, [router]);

  if (checkingPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Memeriksa izin...</p>
      </div>
    );
  }


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
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        alert("Kamu belum login!");
        return;
      }
      const authorImage = session?.user?.user_metadata?.avatar_url || null;

      const { data: newPost, error: postError } = await supabase
        .from("post")
        .insert([{ user_id: userId }])
        .select("id")
        .single();
      if (postError || !newPost?.id) {
        console.error("Gagal membuat post:", postError);
        alert("Gagal membuat post.");
        return;
      }
      const slug = generateSlug(title);

      const { error: contentError } = await supabase.from("post_content").insert([
        {
          post_id: newPost.id,
          title,
          description: content,
          author_image: authorImage,
          slug,
        },
      ]);

      if (contentError) {
        console.error("Gagal menyimpan konten:", contentError.message);
        alert("Gagal menyimpan konten post.");
        return;
      }

      // Save hashtags if any
      if (hashtags.length > 0) {
        const hashtagResponse = await fetch("/api/posts/hashtags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId: newPost.id, hashtags }),
        });

        const hashtagData = await hashtagResponse.json();
        if (!hashtagData.success) {
          console.error("Failed to save hashtags:", hashtagData.message);
          // Don't block post creation, just log the error
        }
      }

      alert("Tulisan berhasil dikirim!");
      router.push(`/post/${slug}`);
    } catch (err) {
      console.error("Error:", err);
      alert("Terjadi kesalahan saat mengirim post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">Buat Tulisan</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded px-3 py-3 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />


        <div className="border border-gray-200 rounded-md focus:ring-1 focus:ring-gray-600">
          <RichTextEditor content={content} onChange={setContent} placeholder="Tulis opini kamu di sini..." />
        </div>

        {/* Hashtag Input */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <HashtagInput
            selectedHashtags={hashtags}
            onHashtagsChange={setHashtags}
            maxHashtags={10}
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50">
          {loading ? "Mengirim..." : "Kirim Tulisan"}
        </button>
      </form>
    </div>
  );
}
