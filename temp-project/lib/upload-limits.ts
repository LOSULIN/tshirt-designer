import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "./constants";

export function getMaxFileSizeError(): string {
  return `檔案大小超過 ${MAX_FILE_SIZE_MB}MB`;
}

export function isWithinMaxUploadSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_SIZE_BYTES;
}

export function validateOptionalUploadBlobSize(
  blob: Blob | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!(blob instanceof Blob) || blob.size <= 0) {
    return { ok: true };
  }
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: getMaxFileSizeError() };
  }
  return { ok: true };
}

export function validateRequiredUploadFileSize(
  file: File | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "缺少或無效的設計檔案" };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: getMaxFileSizeError() };
  }
  return { ok: true };
}
