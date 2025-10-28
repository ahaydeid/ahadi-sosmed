"use client";

import { Image as ImageIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import dynamic from "next/dynamic";

declare global {
  interface Window {
    UPNG?: {
      encode(frames: ArrayBuffer[], width: number, height: number, colors?: number): ArrayBuffer;
    };
  }
}

const SimpleMdeEditor = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => <div className="text-gray-500 p-3">Memuat editor...</div>,
});

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

async function convertToPng(file: File, opts: CompressOpts): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { width, height } = getTargetSize(srcW, srcH, opts.maxWidth, opts.maxHeight);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  const out = await blobFromCanvas(canvas, "image/png", 1);
  return out;
}

async function compressToPng(file: File, opts: CompressOpts): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  let { width, height } = getTargetSize(srcW, srcH, opts.maxWidth, opts.maxHeight);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);
  let out = await blobFromCanvas(canvas, "image/png", 1);
  if (out.size / 1024 <= opts.maxSizeKB) return out;
  const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4];
  for (const s of scales) {
    if (width <= 100 || height <= 100) break;
    width = Math.max(100, Math.floor(width * s));
    height = Math.max(100, Math.floor(height * s));
    canvas.width = width;
    canvas.height = height;
    const c = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D tidak tersedia.");
    c.drawImage(img, 0, 0, width, height);
    out = await blobFromCanvas(canvas, "image/png", 1);
    if (out.size / 1024 <= opts.maxSizeKB) return out;
  }
  try {
    const UPNG = window.UPNG;
    if (typeof UPNG !== "undefined") {
      const ctx2 = canvas.getContext("2d")!;
      const imgData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
      const rgba = new Uint8Array(imgData.data.buffer);
      const pngBuf = UPNG.encode([rgba.buffer], canvas.width, canvas.height, 256);
      const paletted = new Blob([pngBuf], { type: "image/png" });
      if (paletted.size / 1024 <= opts.maxSizeKB) return paletted;
      out = paletted;
    }
  } catch (err) {
    console.error("UPNG failed:", err);
  }
  return out;
}

export default function WritePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [loading, setLoading] = useState(false);

  const mdeOptions = useMemo(() => {
    return {
      spellChecker: false,
      autofocus: true,
      toolbar: true,
      placeholder: "Tulis opini kamu di sini...",
      minHeight: "300px",
    };
  }, []);

  const COMPRESS_PREF: CompressOpts = {
    maxWidth: 1280,
    maxHeight: 1280,
    maxSizeKB: 200,
    initialQuality: 0.8,
    minQuality: 0.4,
    qualityStep: 0.1,
  };
  const COMPRESS_THRESHOLD_BYTES = 200 * 1024;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(null);
    setCompressedBlob(null);
    if (!file) return;
    setImage(file);
    setCompressing(true);
    try {
      if (file.size >= COMPRESS_THRESHOLD_BYTES) {
        try {
          const pngBlob = await compressToPng(file, COMPRESS_PREF);
          setCompressedBlob(pngBlob);
        } catch (err) {
          console.error("Gagal kompres, fallback convert:", err);
          const fallback = await convertToPng(file, COMPRESS_PREF);
          setCompressedBlob(fallback);
        }
      } else {
        try {
          const pngBlob = await convertToPng(file, COMPRESS_PREF);
          setCompressedBlob(pngBlob);
        } catch (err) {
          console.error("Gagal convert ke PNG:", err);
          setCompressedBlob(null);
        }
      }
    } finally {
      setCompressing(false);
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
      let imageUrl: string | null = null;
      if (image) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.png`;
        const filePath = `${userId}/${fileName}`;
        let uploadFile: File;
        if (compressedBlob) {
          uploadFile = new File([compressedBlob], fileName, { type: "image/png" });
        } else {
          uploadFile = new File([image], fileName, { type: "image/png" });
        }
        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, uploadFile, {
          contentType: "image/png",
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
        <input
          type="text"
          placeholder="Judul"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-white border rounded px-3 py-3 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />

        <div className="border rounded-md focus:ring-1 focus:ring-gray-600">
          <SimpleMdeEditor value={content} onChange={setContent} options={mdeOptions} />
        </div>

        <label htmlFor="image" className="flex bg-gray-200 w-full md:w-[20%] items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-100 transition">
          <ImageIcon className="w-5 h-5" />
          <span className="text-sm">Tambahkan gambar</span>
          <input id="image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        {image && (
          <p className="text-sm text-gray-600">
            Gambar dipilih: <strong>{image.name}</strong>
            {image.size <= 512000 && " • (≤ 500 KB, tidak dikompresi)"}
            {compressedBlob && ` • Setelah kompres: ~${Math.round(compressedBlob.size / 1024)} KB (PNG)`}
            {compressing && " • Mengompres..."}
          </p>
        )}

        <button type="submit" disabled={loading || compressing} className="w-full bg-black text-white font-bold py-4 rounded-md hover:bg-gray-900 transition disabled:opacity-50">
          {loading ? "Mengirim..." : compressing ? "Menunggu kompresi..." : "Kirim Tulisan"}
        </button>
      </form>
    </div>
  );
}
