import type { ImageArtworkBoundsPx, UploadedDesignImage } from "./types";

export type { ImageArtworkBoundsPx };

/** Alpha > 此值才視為有效圖案像素（排除極淡半透明陰影） */
export const ARTWORK_ALPHA_THRESHOLD = 10;

export function getFullImageArtworkBounds(
  naturalWidth: number,
  naturalHeight: number,
): ImageArtworkBoundsPx {
  const w = Math.max(1, Math.round(naturalWidth));
  const h = Math.max(1, Math.round(naturalHeight));
  return {
    minX: 0,
    minY: 0,
    maxX: w - 1,
    maxY: h - 1,
    visibleWidth: w,
    visibleHeight: h,
  };
}

export function computeArtworkBoundsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = ARTWORK_ALPHA_THRESHOLD,
): ImageArtworkBoundsPx {
  if (width <= 0 || height <= 0) {
    return getFullImageArtworkBounds(width, height);
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]!;
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return getFullImageArtworkBounds(width, height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    visibleWidth: maxX - minX + 1,
    visibleHeight: maxY - minY + 1,
  };
}

export function resolveImageArtworkBounds(
  image: UploadedDesignImage,
): ImageArtworkBoundsPx {
  if (image.artworkBounds) {
    return image.artworkBounds;
  }
  return getFullImageArtworkBounds(image.naturalWidth, image.naturalHeight);
}

export function getArtworkPixelSize(image: UploadedDesignImage): {
  artworkPixelWidth: number;
  artworkPixelHeight: number;
} {
  const bounds = resolveImageArtworkBounds(image);
  return {
    artworkPixelWidth: bounds.visibleWidth,
    artworkPixelHeight: bounds.visibleHeight,
  };
}

/** 實際圖案（非透明區）寬高比；用於 Artwork Size 等比例調整 */
export function getImageArtworkAspectRatio(image: UploadedDesignImage): number {
  const bounds = resolveImageArtworkBounds(image);
  if (bounds.visibleWidth <= 0 || bounds.visibleHeight <= 0) return 1;
  return bounds.visibleWidth / bounds.visibleHeight;
}

function isOpaqueRasterMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return normalized === "image/jpeg" || normalized === "image/jpg";
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片以分析圖案範圍"));
    img.src = src;
  });
}

export async function analyzeImageArtworkBoundsFromImage(
  img: HTMLImageElement,
  mimeType: string,
): Promise<ImageArtworkBoundsPx> {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (width <= 0 || height <= 0) {
    return getFullImageArtworkBounds(width, height);
  }

  if (isOpaqueRasterMimeType(mimeType)) {
    return getFullImageArtworkBounds(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return getFullImageArtworkBounds(width, height);
  }

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  return computeArtworkBoundsFromImageData(imageData.data, width, height);
}

export async function analyzeImageArtworkBoundsFromBlob(
  blob: Blob,
): Promise<ImageArtworkBoundsPx> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    return analyzeImageArtworkBoundsFromImage(img, blob.type);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function analyzeImageArtworkBoundsFromFile(
  file: File | Blob,
): Promise<ImageArtworkBoundsPx> {
  return analyzeImageArtworkBoundsFromBlob(file);
}
