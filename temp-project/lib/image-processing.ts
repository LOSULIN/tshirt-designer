import {
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
