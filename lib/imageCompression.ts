declare global {
  interface Window {
    UPNG: {
      encode: (buffers: ArrayBuffer[], width: number, height: number, colors: number) => ArrayBuffer;
    };
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
  maxSizeKB: 300, // 300KB max for WhatsApp
  initialQuality: 0.85,
  minQuality: 0.4,
  qualityStep: 0.1,
};

const COMPRESS_THRESHOLD_BYTES = 250 * 1024; // 250KB

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

function blobFromCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas.toBlob failed"))), "image/jpeg", quality);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image file"));
    };
    img.src = url;
  });
}

export async function compressImage(file: File): Promise<Blob> {
  const startSize = Math.round(file.size / 1024);
  console.log(`[Compression] Starting for ${file.name}, size: ${startSize}KB, type: ${file.type}`);

  // If already a small JPG, return original
  if (file.size <= COMPRESS_THRESHOLD_BYTES && file.type === "image/jpeg") {
    console.log("[Compression] File already meets requirements, skipping.");
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const { width, height } = getTargetSize(img.naturalWidth || img.width, img.naturalHeight || img.height, COMPRESS_PREF.maxWidth, COMPRESS_PREF.maxHeight);

    console.log(`[Compression] Resizing to ${width}x${height}`);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.fillStyle = "white"; // Handle transparency if PNG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = COMPRESS_PREF.initialQuality;
    let result = await blobFromCanvas(canvas, quality);
    let currentKB = Math.round(result.size / 1024);

    console.log(`[Compression] Initial JPG quality ${quality} gave ${currentKB}KB`);

    while (currentKB > COMPRESS_PREF.maxSizeKB && quality > COMPRESS_PREF.minQuality) {
      quality -= COMPRESS_PREF.qualityStep;
      result = await blobFromCanvas(canvas, quality);
      currentKB = Math.round(result.size / 1024);
      console.log(`[Compression] Quality ${quality.toFixed(2)} gave ${currentKB}KB`);
    }

    console.log(`[Compression] Finished. Final size: ${currentKB}KB, type: ${result.type}`);
    return result;
  } catch (err) {
    console.error("[Compression] Error during compression:", err);
    return file; // Fallback to original
  }
}
