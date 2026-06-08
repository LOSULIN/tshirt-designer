export const PRO_UPLOAD_FORMATS = [
  { label: "PDF（推薦）", value: "pdf" },
  { label: "AI", value: "ai" },
  { label: "PSD", value: "psd" },
] as const;

export const PRO_UPLOAD_ACCEPT = ".pdf,.ai,.psd";

const ALLOWED_EXTENSIONS = new Set(["pdf", "psd", "ai"]);
const RASTER_EXTENSIONS = new Set(["png", "jpg", "jpeg"]);

export const PRO_UPLOAD_RASTER_HINT_LINES = [
  "此區域僅接受正式設計檔案：",
  "PDF、AI、PSD",
  "",
  "若您只有圖片檔案，",
  "請改使用「自由設計」模式。",
] as const;

export const PRO_UPLOAD_PDF_NOTE =
  "PDF 為最推薦的交稿格式，可保留完整尺寸與印刷資訊。";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExtension(file: File): string {
  return file.name.split(".").pop()?.toUpperCase() ?? "未知";
}

export function getFileFormat(file: File): string {
  return getFileExtension(file);
}

export function isRasterImageFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return RASTER_EXTENSIONS.has(ext);
}

export function isAllowedProUploadFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXTENSIONS.has(ext);
}
