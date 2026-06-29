import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_IMAGE_HEIGHT,
  MAX_IMAGE_WIDTH,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
} from "./constants";

export type ImageFileValidationResult =
  | { ok: true; width: number; height: number; isPng: boolean }
  | { ok: false; error: string };

const UPLOAD_ACCEPTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
]);
const UPLOAD_ACCEPTED_EXTENSIONS = [".png", ".jpg", ".jpeg"];

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

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return UPLOAD_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function isAcceptedMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  if (normalized === "") return false;
  return UPLOAD_ACCEPTED_MIME_TYPES.has(normalized);
}

/** 設計器圖片上傳驗證：格式、檔案大小、實際像素尺寸 */
export async function validateImageFile(
  file: File,
): Promise<ImageFileValidationResult> {
  const normalizedType = file.type.toLowerCase();
  const mimeOk = isAcceptedMimeType(normalizedType);

  if (!mimeOk && !hasAcceptedExtension(file.name)) {
    return { ok: false, error: "僅支援 PNG、JPG、JPEG 格式" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `檔案大小超過 ${MAX_FILE_SIZE_MB}MB` };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImageFromFile(file);
  } catch {
    return { ok: false, error: "無法讀取圖片" };
  }

  const width = img.naturalWidth;
  const height = img.naturalHeight;

  if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
    return { ok: false, error: "圖片尺寸不可超過 6000×6000 px" };
  }

  if (width < MIN_IMAGE_WIDTH || height < MIN_IMAGE_HEIGHT) {
    return { ok: false, error: "圖片尺寸至少需要 500×500 px" };
  }

  return {
    ok: true,
    width,
    height,
    isPng: normalizedType === "image/png" || file.name.toLowerCase().endsWith(".png"),
  };
}
