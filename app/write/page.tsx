"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function WritePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("Judul dan isi tidak boleh kosong.");
      return;
    }

    setLoading(true);

    try {
      // 🔹 Ambil user login
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id;
      if (!userId) {
        alert("Kamu belum login!");
        return;
      }

      // 🔹 Ambil foto profil bawaan OAuth
      const authorImage = session?.user?.user_metadata?.avatar_url || null;

      // 🔹 1. Upload gambar post ke storage Supabase
      let imageUrl: string | null = null;
      if (image) {
        const fileExt = image.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, image);

        if (uploadError) {
          console.error("Gagal upload gambar:", uploadError.message);
          alert("Gagal mengunggah gambar.");
          return;
        }

        const { data: publicUrlData } = supabase.storage.from("post-images").getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      // 🔹 2. Buat data utama post
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

      // 🔹 3. Simpan ke tabel post_content (termasuk image dan foto author)
      const { error: contentError } = await supabase.from("post_content").insert([
        {
          post_id: newPost.id,
          title,
          description: content,
          image_url: imageUrl,
          author_image: authorImage, // ✅ foto profil user dari OAuth
        },
      ]);

      if (contentError) {
        console.error("Gagal menyimpan konten:", contentError.message);
        alert("Gagal menyimpan konten post.");
        return;
      }

      alert("Tulisan berhasil dikirim!");
      setTitle("");
      setContent("");
      setImage(null);
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
        {/* Judul */}
        <input
          type="text"
          placeholder="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border rounded px-3 py-3 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />

        {/* Konten */}
        <textarea
          placeholder="Tulis opini kamu di sini..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full bg-white border rounded-md px-3 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />

        {/* Upload Gambar */}
        <label htmlFor="image" className="flex bg-gray-200 w-full md:w-[20%] items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100 transition">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">Tambahkan gambar</span>
          <input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        {image && <p className="text-sm text-gray-600">Gambar dipilih: {image.name}</p>}

        {/* Tombol Submit */}
        <button type="submit" disabled={loading} className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50">
          {loading ? "Mengirim..." : "Kirim Tulisan"}
        </button>
      </form>
    </div>
  );
}
