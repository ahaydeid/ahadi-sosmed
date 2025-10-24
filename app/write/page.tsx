"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState } from "react";

export default function WritePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setImage(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      title,
      content,
      imageName: image?.name || "no image",
    });
    // nanti di sini bisa ditambah logic upload ke Supabase
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-20">
      <h1 className="text-2xl font-bold mb-4">Buat Tulisan</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Judul */}
        <input type="text" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-white border rounded px-3 py-3 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500" />

        {/* Konten */}
        <textarea
          placeholder="Tulis opini kamu di sini..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          className="w-full bg-white border rounded-md px-3 py-3 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-600"
        />

        {/* Tambah Gambar */}
        <label htmlFor="image" className="flex bg-gray-200 w-full md:w-[20%] items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100 transition">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">tambahkan gambar</span>
          <input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        {image && <p className="text-sm text-gray-600">Gambar dipilih: {image.name}</p>}

        {/* Tombol Submit */}
        <button type="submit" className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition">
          Kirim Tulisan
        </button>
      </form>
    </div>
  );
}
