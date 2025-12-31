declare global {
  interface Window {
    UPNG: any;
  }
}

export type CompressOpts = {
  maxWidth: number;
  maxHeight: number;
  maxSizeKB: number;
  initialQuality: number;
  minQuality: number;
  qualityStep: number;
};

export const COMPRESS_PREF: CompressOpts = {
  maxWidth: 1280,
  maxHeight: 1280,
  maxSizeKB: 550, // 550KB max
  initialQuality: 0.9,
  minQuality: 0.4,
  qualityStep: 0.1,
};

const NON_PNG_TARGET_KB = 500;
const COMPRESS_THRESHOLD_BYTES = 500 * 1024; // 500KB

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
  let bestUnderMax: Blob | null = initial.size <= opts.maxSizeKB * 1024 ? initial : null;

  const UPNG = typeof window !== "undefined" ? window.UPNG : undefined;
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
          if (k <= opts.maxSizeKB) return pal;
          if (pal.size <= opts.maxSizeKB * 1024 && (!bestUnderMax || pal.size > bestUnderMax.size)) bestUnderMax = pal;
        } catch {
          // ignore step error
        }
      }
    } catch {
      // ignore UPNG read errors
    }
  }

  // Scale down gradually
  const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.72, 0.7];
  for (const s of scales) {
    const w = Math.max(100, Math.floor(baseW * s));
    const h = Math.max(100, Math.floor(baseH * s));
    if (w <= 100 || h <= 100) break;
    draw(w, h);
    const direct = await blobFromCanvas(canvas, "image/png", 1);
    if (direct.size < smallestOverall.size) smallestOverall = direct;
    const kd = sizeKB(direct);
    if (kd <= opts.maxSizeKB) return direct;
    if (direct.size <= opts.maxSizeKB * 1024 && (!bestUnderMax || direct.size > bestUnderMax.size)) bestUnderMax = direct;

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
            if (k <= opts.maxSizeKB) return pal;
            if (pal.size <= opts.maxSizeKB * 1024 && (!bestUnderMax || pal.size > bestUnderMax.size)) bestUnderMax = pal;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (bestUnderMax) return bestUnderMax;
  return smallestOverall;
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

  // For non-png: try quality loop
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

    const candidate = await tryQualityLoop(opts.maxSizeKB);
    if (candidate && candidate.size / 1024 <= opts.maxSizeKB) return candidate;

    const scales = [0.95, 0.9, 0.85, 0.8, 0.75, 0.72, 0.7];
    let bestOverall: Blob | null = candidate;
    for (const s of scales) {
      const w = Math.max(100, Math.floor(baseW * s));
      const h = Math.max(100, Math.floor(baseH * s));
      if (w <= 100 || h <= 100) break;
      draw(w, h);
      const qCandidate = await tryQualityLoop(opts.maxSizeKB);
      if (qCandidate) {
        if (!bestOverall || qCandidate.size < bestOverall.size) bestOverall = qCandidate;
        if (qCandidate.size / 1024 <= opts.maxSizeKB) return qCandidate;
      }
    }

    if (bestOverall) return bestOverall;
    return new Blob([file], { type: mime });
}

export async function compressImage(file: File): Promise<Blob> {
    if (file.size <= COMPRESS_THRESHOLD_BYTES) {
        return file;
    }

    if (file.type === "image/png") {
        try {
            return await compressPngTarget(file, COMPRESS_PREF);
        } catch {
            return await convertToPng(file, COMPRESS_PREF);
        }
    } else {
        try {
            return await compressSameType(file, { ...COMPRESS_PREF, maxSizeKB: NON_PNG_TARGET_KB });
        } catch {
            return await convertToPng(file, COMPRESS_PREF);
        }
    }
}
