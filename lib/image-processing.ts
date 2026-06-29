import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  PREVIEW_MAX_EDGE,
  RECOMMENDED_IMAGE_HEIGHT,
  RECOMMENDED_IMAGE_WIDTH,
} from "./constants";

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("無法讀取圖片"));
    };
    img.src = url;
  });
}

export function assessImageUploadQuality(
  width: number,
  height: number,
  isPng: boolean,
): { isPng: boolean; belowRecommended: boolean } {
  return {
    isPng,
    belowRecommended:
      width < RECOMMENDED_IMAGE_WIDTH || height < RECOMMENDED_IMAGE_HEIGHT,
  };
}

export async function createPreviewFromFile(file: File): Promise<{
  previewBlob: Blob;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}> {
  const img = await loadImageFromFile(file);
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  const maxEdge = Math.max(naturalWidth, naturalHeight);
  const ratio =
    maxEdge > PREVIEW_MAX_EDGE ? PREVIEW_MAX_EDGE / maxEdge : 1;
  const previewWidth = Math.round(naturalWidth * ratio);
  const previewHeight = Math.round(naturalHeight * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = previewWidth;
  canvas.height = previewHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立預覽圖");

  ctx.drawImage(img, 0, 0, previewWidth, previewHeight);

  const previewBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法建立預覽圖"));
        else resolve(blob);
      },
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.92,
    );
  });

  return {
    previewBlob,
    previewUrl: URL.createObjectURL(previewBlob),
    previewWidth,
    previewHeight,
    naturalWidth,
    naturalHeight,
  };
}

export function isUpscaledBeyondOriginal(
  displayWidth: number,
  displayHeight: number,
  scale: number,
  naturalWidth: number,
  naturalHeight: number,
): boolean {
  const scaledW = displayWidth * scale;
  const scaledH = displayHeight * scale;
  return scaledW > naturalWidth || scaledH > naturalHeight;
}

/** @deprecated 根目錄 components 相容；新程式請用 image-validation */
export type ImageValidationResult =
  | { ok: true; isPng: boolean; lowResolution: boolean; belowRecommended: boolean }
  | { ok: false; error: string };

const LEGACY_ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function hasLegacyAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return LEGACY_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** @deprecated 根目錄 components 相容；新程式請用 image-validation */
export function validateImageFile(file: File): ImageValidationResult {
  const normalizedType = file.type.toLowerCase();
  const typeOk =
    normalizedType === "" ||
    ACCEPTED_IMAGE_TYPES.includes(
      normalizedType as (typeof ACCEPTED_IMAGE_TYPES)[number],
    );

  if (!typeOk && !hasLegacyAcceptedExtension(file.name)) {
    return {
      ok: false,
      error: "僅支援 PNG、JPG、JPEG、WEBP 格式",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "檔案大小超過 10MB" };
  }

  return { ok: true, isPng: false, lowResolution: false, belowRecommended: false };
}

export async function inspectImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const img = await loadImageFromFile(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}

/** @deprecated 根目錄 components 相容；新程式請用 image-validation */
export async function validateImageFileFull(
  file: File,
): Promise<ImageValidationResult> {
  const basic = validateImageFile(file);
  if (!basic.ok) return basic;

  const { width, height } = await inspectImageDimensions(file);

  if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
    return {
      ok: false,
      error: `圖片尺寸不可小於 ${MIN_IMAGE_WIDTH}×${MIN_IMAGE_HEIGHT}`,
    };
  }

  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
    return {
      ok: false,
      error: `圖片尺寸不可超過 ${MAX_IMAGE_WIDTH}×${MAX_IMAGE_HEIGHT}`,
    };
  }

  return {
    ok: true,
    isPng: file.type === "image/png",
    lowResolution: false,
    belowRecommended:
      width < RECOMMENDED_IMAGE_WIDTH || height < RECOMMENDED_IMAGE_HEIGHT,
  };
}
