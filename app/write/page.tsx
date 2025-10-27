"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";

// SimpleMDE hanya dirender di client
const SimpleMdeEditor = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => <div className="text-gray-500 p-3">Memuat editor...</div>,
});

/* ========= UTIL KOMPRESI (native, tanpa lib) ========= */
type CompressOpts = {
  maxWidth: number;
  maxHeight: number;
  maxSizeKB: number;
  initialQuality: number;
  minQuality: number;
  qualityStep: number;
};

function getTargetSize(srcW: number, srcH: number, maxW: number, maxH: number) {
  let w = srcW;
  let h = srcH;
  if (w > maxW || h > maxH) {
    const ratio = Math.min(maxW / w, maxH / h);
    w = Math.floor(w * ratio);
    h = Math.floor(h * ratio);
  }
  return { width: w, height: h };
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob menghasilkan null"))), type, quality);
  });
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode().catch(() => {});
  return img;
}

async function compressToWebP(file: File, opts: CompressOpts): Promise<Blob> {
  const { maxWidth, maxHeight, maxSizeKB, initialQuality, minQuality, qualityStep } = opts;
  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { width, height } = getTargetSize(srcW, srcH, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  let q = initialQuality;
  let out = await blobFromCanvas(canvas, "image/webp", q);
  while (out.size / 1024 > maxSizeKB && q > minQuality) {
    q = Math.max(minQuality, q - qualityStep);
    out = await blobFromCanvas(canvas, "image/webp", q);
  }
  return out;
}

/* ================== KOMPONEN ================== */
export default function WritePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null); // file asli
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null); // hasil kompres (jika >500KB)
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Opsi Editor (kembalikan seperti awal)
  const mdeOptions = useMemo(() => {
    return {
      spellChecker: false,
      autofocus: true,
      toolbar: true,
      placeholder: "Tulis opini kamu di sini...",
      minHeight: "300px",
    };
  }, []);

  // Preferensi kompresi
  const COMPRESS_PREF: CompressOpts = {
    maxWidth: 1280,
    maxHeight: 1280,
    maxSizeKB: 800, // target setelah kompres
    initialQuality: 0.8,
    minQuality: 0.4,
    qualityStep: 0.1,
  };
  const COMPRESS_THRESHOLD_BYTES = 500 * 1024; // hanya kompres jika > 500KB

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(null);
    setCompressedBlob(null);
    if (!file) return;

    setImage(file);

    // Kompres hanya jika file > 500KB
    if (file.size > COMPRESS_THRESHOLD_BYTES) {
      setCompressing(true);
      try {
        const webpBlob = await compressToWebP(file, COMPRESS_PREF);
        setCompressedBlob(webpBlob);
      } catch (err) {
        console.error("Gagal kompres gambar:", err);
        setCompressedBlob(null); // fallback ke file asli saat upload
      } finally {
        setCompressing(false);
      }
    }
  };

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

      // Upload gambar (jika ada)
      let imageUrl: string | null = null;
      if (image) {
        const blobToUpload = compressedBlob ?? image; // pakai kompres kalau ada
        const ext = compressedBlob ? "webp" : image.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, blobToUpload, {
          contentType: compressedBlob ? "image/webp" : image.type || "application/octet-stream",
          upsert: false,
        });

        if (uploadError) {
          console.error("Gagal upload gambar:", uploadError.message);
          alert("Gagal mengunggah gambar.");
          return;
        }

        const { data: publicUrlData } = supabase.storage.from("post-images").getPublicUrl(filePath);
        imageUrl = publicUrlData.publicUrl;
      }

      // Buat post
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

      // Simpan konten
      const { error: contentError } = await supabase.from("post_content").insert([
        {
          post_id: newPost.id,
          title,
          description: content,
          image_url: imageUrl,
          author_image: authorImage,
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
      setCompressedBlob(null);
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

        {/* Editor (tak diubah selain perbaikan CSS global) */}
        <div className="border rounded-md focus:ring-1 focus:ring-gray-600">
          <SimpleMdeEditor value={content} onChange={setContent} options={mdeOptions} />
        </div>

        {/* Upload Gambar */}
        <label htmlFor="image" className="flex bg-gray-200 w-full md:w-[20%] items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100 transition">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">Tambahkan gambar</span>
          <input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        {image && (
          <p className="text-sm text-gray-600">
            Gambar dipilih: <strong>{image.name}</strong>
            {image.size <= 512000 && " • (≤ 500 KB, tidak dikompresi)"}
            {compressedBlob && ` • Setelah kompres: ~${Math.round(compressedBlob.size / 1024)} KB (WebP)`}
            {compressing && " • Mengompres..."}
          </p>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || compressing} className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50">
          {loading ? "Mengirim..." : compressing ? "Menunggu kompresi..." : "Kirim Tulisan"}
        </button>
      </form>
    </div>
  );
}
