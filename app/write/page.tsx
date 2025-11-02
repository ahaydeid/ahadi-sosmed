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

/* ----------------- New / adjusted compression logic ----------------- */

const TARGET_MAX_PNG_KB = 550;
const NON_PNG_TARGET_KB = 500;
const COMPRESS_THRESHOLD_BYTES = 500 * 1024;

const COMPRESS_PREF: CompressOpts = {
  maxWidth: 1280,
  maxHeight: 1280,
  maxSizeKB: TARGET_MAX_PNG_KB,
  initialQuality: 0.9,
  minQuality: 0.4,
  qualityStep: 0.1,
};

function sizeKB(b: Blob): number {
  return Math.round(b.size / 1024);
}

async function compressPngTarget(file: File, opts: CompressOpts): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { width: baseW, height: baseH } = getTargetSize(srcW, srcH, opts.maxWidth, opts.maxHeight);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");

  const draw = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    c.drawImage(img, 0, 0, w, h);
  };

  draw(baseW, baseH);
  URL.revokeObjectURL(img.src);

  const initial = await blobFromCanvas(canvas, "image/png", 1);
  let smallestOverall: Blob = initial;
  let bestUnderMax: Blob | null = initial.size <= TARGET_MAX_PNG_KB * 1024 ? initial : null;

  const UPNG = window.UPNG;
  const colorSteps = [256, 128, 96, 64, 48, 32, 24, 16];

  // Try quantization at base size first (if UPNG available)
  if (typeof UPNG !== "undefined") {
    try {
      const ctx2 = canvas.getContext("2d")!;
      const imgData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
      const rgba = new Uint8Array(imgData.data.buffer);
      for (const colors of colorSteps) {
        try {
          const buf = UPNG.encode([rgba.buffer], canvas.width, canvas.height, colors);
          const pal = new Blob([buf], { type: "image/png" });
          if (pal.size < smallestOverall.size) smallestOverall = pal;
          const k = sizeKB(pal);
          if (k <= TARGET_MAX_PNG_KB) return pal;
          if (pal.size <= TARGET_MAX_PNG_KB * 1024 && (!bestUnderMax || pal.size > bestUnderMax.size)) bestUnderMax = pal;
        } catch {
          // ignore step error
        }
      }
    } catch {
      // ignore UPNG read errors
    }
  }

  // Scale down gradually (limited to avoid extreme blur), try quantize at each step
  const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.72, 0.7];
  for (const s of scales) {
    const w = Math.max(100, Math.floor(baseW * s));
    const h = Math.max(100, Math.floor(baseH * s));
    if (w <= 100 || h <= 100) break;
    draw(w, h);
    const direct = await blobFromCanvas(canvas, "image/png", 1);
    if (direct.size < smallestOverall.size) smallestOverall = direct;
    const kd = sizeKB(direct);
    if (kd <= TARGET_MAX_PNG_KB) return direct;
    if (direct.size <= TARGET_MAX_PNG_KB * 1024 && (!bestUnderMax || direct.size > bestUnderMax.size)) bestUnderMax = direct;

    if (typeof UPNG !== "undefined") {
      try {
        const ctx2 = canvas.getContext("2d")!;
        const imgData = ctx2.getImageData(0, 0, canvas.width, canvas.height);
        const rgba = new Uint8Array(imgData.data.buffer);
        for (const colors of colorSteps) {
          try {
            const buf = UPNG.encode([rgba.buffer], canvas.width, canvas.height, colors);
            const pal = new Blob([buf], { type: "image/png" });
            if (pal.size < smallestOverall.size) smallestOverall = pal;
            const k = sizeKB(pal);
            if (k <= TARGET_MAX_PNG_KB) return pal;
            if (pal.size <= TARGET_MAX_PNG_KB * 1024 && (!bestUnderMax || pal.size > bestUnderMax.size)) bestUnderMax = pal;
          } catch {
            // ignore single quant step error
          }
        }
      } catch {
        // ignore UPNG attempt errors
      }
    }
  }

  if (bestUnderMax) return bestUnderMax;
  return smallestOverall;
}

async function compressSameType(file: File, opts: CompressOpts): Promise<Blob> {
  const img = await loadImageFromFile(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const { width: baseW, height: baseH } = getTargetSize(srcW, srcH, opts.maxWidth, opts.maxHeight);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia.");

  const draw = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext("2d")!;
    c.drawImage(img, 0, 0, w, h);
  };

  draw(baseW, baseH);
  URL.revokeObjectURL(img.src);

  const mime = file.type || "image/jpeg";

  // For non-png: try quality loop then scaling + quality
  if (mime !== "image/png") {
    const tryQualityLoop = async (targetKB: number): Promise<Blob | null> => {
      let quality = opts.initialQuality;
      let best: Blob | null = null;
      let bestDiff = Infinity;
      let out = await blobFromCanvas(canvas, mime, quality);
      if (out.size / 1024 <= targetKB) return out;
      while (quality >= opts.minQuality) {
        out = await blobFromCanvas(canvas, mime, quality);
        const diff = Math.abs(out.size / 1024 - targetKB);
        if (!best || diff < bestDiff) {
          best = out;
          bestDiff = diff;
        }
        if (out.size / 1024 <= targetKB) return out;
        quality = +(quality - opts.qualityStep).toFixed(2);
      }
      return best;
    };

    const candidate = await tryQualityLoop(NON_PNG_TARGET_KB);
    if (candidate && candidate.size / 1024 <= NON_PNG_TARGET_KB) return candidate;

    const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.72, 0.7];
    let bestOverall: Blob | null = candidate;
    for (const s of scales) {
      const w = Math.max(100, Math.floor(baseW * s));
      const h = Math.max(100, Math.floor(baseH * s));
      if (w <= 100 || h <= 100) break;
      draw(w, h);
      const qCandidate = await tryQualityLoop(NON_PNG_TARGET_KB);
      if (qCandidate) {
        if (!bestOverall || qCandidate.size < bestOverall.size) bestOverall = qCandidate;
        if (qCandidate.size / 1024 <= NON_PNG_TARGET_KB) return qCandidate;
      }
    }

    if (bestOverall) return bestOverall;
    // fallback to original file as Blob
    return new Blob([file], { type: mime });
  }

  // For PNG files: use PNG-targeted routine
  return compressPngTarget(file, opts);
}

/* ----------------- Component (only handleImageChange & upload adjusted) ----------------- */

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(null);
    setCompressedBlob(null);
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      alert("Silakan pilih file bergambar (image).");
      return;
    }

    setImage(file);
    setCompressing(true);
    try {
      if (file.size > COMPRESS_THRESHOLD_BYTES) {
        if (file.type === "image/png") {
          try {
            const png = await compressPngTarget(file, COMPRESS_PREF);
            setCompressedBlob(png);
          } catch {
            try {
              const fallback = await convertToPng(file, COMPRESS_PREF);
              setCompressedBlob(fallback);
            } catch {
              setCompressedBlob(null);
            }
          }
        } else {
          try {
            const blob = await compressSameType(file, { ...COMPRESS_PREF, maxSizeKB: NON_PNG_TARGET_KB });
            setCompressedBlob(blob);
          } catch {
            try {
              const fallback = await convertToPng(file, COMPRESS_PREF);
              setCompressedBlob(fallback);
            } catch {
              setCompressedBlob(null);
            }
          }
        }
      } else {
        // keep original for upload (no compression)
        setCompressedBlob(null);
      }
    } finally {
      setCompressing(false);
    }
  };

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
      let imageUrl: string | null = null;
      if (image) {
        // determine upload blob and mime/extension based on compressedBlob (if any) or original file
        const uploadBlob: Blob = compressedBlob ?? image;
        const uploadMime = uploadBlob.type || image.type || "application/octet-stream";
        const extFromMime = uploadMime.split("/")[1]?.split("+")[0] || image.name.split(".").pop() || "png";
        const normalizedExt = extFromMime === "jpeg" ? "jpg" : extFromMime;
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${normalizedExt}`;
        const filePath = `${userId}/${fileName}`;

        const uploadFile = new File([uploadBlob], fileName, { type: uploadMime });

        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, uploadFile, {
          contentType: uploadMime,
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
      const slug = generateSlug(title);

      const { error: contentError } = await supabase.from("post_content").insert([
        {
          post_id: newPost.id,
          title,
          description: content,
          image_url: imageUrl,
          author_image: authorImage,
          slug,
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
            <strong>{image.name}</strong>
            {image.size <= 512000 && ""}
            {compressedBlob && ` ~${Math.round(compressedBlob.size / 1024)} KB (${compressedBlob.type.split("/")[1]})`}
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
