import { PREVIEW_MAX_EDGE, MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH } from "./constants";
import {
  analyzeImageArtworkBoundsFromBlob,
  getArtworkPixelSize,
} from "./image-bounds";
import { getLayerEffectiveCmRect } from "./design-cm";
import {
  analyzeImagePrintQuality,
  PRINT_QUALITY_TARGET_DPI,
  type ImagePrintQualityReport,
} from "./image-print-quality";
import { getArtworkDesignerPrintQuality } from "./image-print-quality-ui";
import type { ImageDesignLayer, UploadedDesignImage } from "./types";

export const MAX_SAFE_SCALE = 3;
export const TARGET_DPI = PRINT_QUALITY_TARGET_DPI;

export interface RequiredPixelSize {
  widthPx: number;
  heightPx: number;
}

export interface ResolutionBoostPlan {
  currentDpi: number;
  targetDpi: number;
  requiredPixelSize: RequiredPixelSize;
  currentArtworkPixelWidth: number;
  currentArtworkPixelHeight: number;
  upscaleFactor: number;
  canBoost: boolean;
  meetsTarget: boolean;
  exceedsMaxDimensions: boolean;
}

/** 依印刷尺寸（cm）計算達標所需 artwork 像素 */
export function calculateRequiredPixelSize(
  printWidthCm: number,
  printHeightCm: number,
  targetDpi: number = TARGET_DPI,
): RequiredPixelSize {
  return {
    widthPx: Math.round((printWidthCm / 2.54) * targetDpi),
    heightPx: Math.round((printHeightCm / 2.54) * targetDpi),
  };
}

/** 等比例放大倍率（取寬高較大者，確保雙邊皆達標） */
export function calculateUpscaleFactor(
  currentArtworkWidth: number,
  currentArtworkHeight: number,
  required: RequiredPixelSize,
): number {
  if (currentArtworkWidth <= 0 || currentArtworkHeight <= 0) return 1;
  return Math.max(
    required.widthPx / currentArtworkWidth,
    required.heightPx / currentArtworkHeight,
  );
}

export function refreshPrintQuality(
  layer: ImageDesignLayer,
): ImagePrintQualityReport {
  return analyzeImagePrintQuality(layer);
}

export async function refreshArtworkBounds(blob: Blob) {
  return analyzeImageArtworkBoundsFromBlob(blob);
}

export function getResolutionBoostPlan(
  layer: ImageDesignLayer,
  targetDpi: number = TARGET_DPI,
): ResolutionBoostPlan {
  const report = refreshPrintQuality(layer);
  const { artworkPixelWidth, artworkPixelHeight } = getArtworkPixelSize(
    layer.image,
  );
  const rect = getLayerEffectiveCmRect(layer);
  const requiredPixelSize = calculateRequiredPixelSize(
    rect.width_cm,
    rect.height_cm,
    targetDpi,
  );
  const upscaleFactor = calculateUpscaleFactor(
    artworkPixelWidth,
    artworkPixelHeight,
    requiredPixelSize,
  );
  const newNaturalWidth = Math.round(layer.image.naturalWidth * upscaleFactor);
  const newNaturalHeight = Math.round(layer.image.naturalHeight * upscaleFactor);
  const exceedsMaxDimensions =
    newNaturalWidth > MAX_IMAGE_WIDTH || newNaturalHeight > MAX_IMAGE_HEIGHT;
  const meetsTarget = report.dpi >= targetDpi;
  const canBoost =
    !meetsTarget &&
    upscaleFactor > 1.001 &&
    upscaleFactor <= MAX_SAFE_SCALE &&
    !exceedsMaxDimensions;

  return {
    currentDpi: report.dpi,
    targetDpi,
    requiredPixelSize,
    currentArtworkPixelWidth: artworkPixelWidth,
    currentArtworkPixelHeight: artworkPixelHeight,
    upscaleFactor,
    canBoost,
    meetsTarget,
    exceedsMaxDimensions,
  };
}

/** UI / 提升解析度：依 Designer（Garment）cm 計算計畫 */
export function getDesignerResolutionBoostPlan(
  layer: ImageDesignLayer,
  designerWidthCm: number,
  designerHeightCm: number,
  targetDpi: number = TARGET_DPI,
): ResolutionBoostPlan {
  const quality = getArtworkDesignerPrintQuality(
    layer,
    designerWidthCm,
    designerHeightCm,
    targetDpi,
  );
  const { artworkPixelWidth, artworkPixelHeight } = quality;
  const requiredPixelSize = calculateRequiredPixelSize(
    designerWidthCm,
    designerHeightCm,
    targetDpi,
  );
  const upscaleFactor = calculateUpscaleFactor(
    artworkPixelWidth,
    artworkPixelHeight,
    requiredPixelSize,
  );
  const newNaturalWidth = Math.round(layer.image.naturalWidth * upscaleFactor);
  const newNaturalHeight = Math.round(layer.image.naturalHeight * upscaleFactor);
  const exceedsMaxDimensions =
    newNaturalWidth > MAX_IMAGE_WIDTH || newNaturalHeight > MAX_IMAGE_HEIGHT;
  const meetsTarget = quality.meetsStandard;
  const canBoost =
    !meetsTarget &&
    upscaleFactor > 1.001 &&
    upscaleFactor <= MAX_SAFE_SCALE &&
    !exceedsMaxDimensions;

  return {
    currentDpi: quality.dpi,
    targetDpi,
    requiredPixelSize,
    currentArtworkPixelWidth: artworkPixelWidth,
    currentArtworkPixelHeight: artworkPixelHeight,
    upscaleFactor,
    canBoost,
    meetsTarget,
    exceedsMaxDimensions,
  };
}

export interface ResizedImageArtifacts {
  originalBlob: Blob;
  originalUrl: string;
  previewUrl: string;
  previewWidth: number;
  previewHeight: number;
  naturalWidth: number;
  naturalHeight: number;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片以提升解析度"));
    img.src = src;
  });
}

/** Canvas 等比例重採樣至目標 natural 像素（輸出 PNG） */
export async function resizeImageToPixelSize(
  source: CanvasImageSource,
  targetNaturalWidth: number,
  targetNaturalHeight: number,
): Promise<ResizedImageArtifacts> {
  const naturalWidth = Math.max(1, Math.round(targetNaturalWidth));
  const naturalHeight = Math.max(1, Math.round(targetNaturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = naturalWidth;
  canvas.height = naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布以提升解析度");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, naturalWidth, naturalHeight);

  const originalBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法產生提升後的圖片"));
        else resolve(blob);
      },
      "image/png",
    );
  });

  const maxEdge = Math.max(naturalWidth, naturalHeight);
  const ratio = maxEdge > PREVIEW_MAX_EDGE ? PREVIEW_MAX_EDGE / maxEdge : 1;
  const previewWidth = Math.round(naturalWidth * ratio);
  const previewHeight = Math.round(naturalHeight * ratio);

  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = previewWidth;
  previewCanvas.height = previewHeight;
  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) throw new Error("無法建立預覽圖");
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";
  previewCtx.drawImage(canvas, 0, 0, previewWidth, previewHeight);

  const previewBlob = await new Promise<Blob>((resolve, reject) => {
    previewCanvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法建立預覽圖"));
        else resolve(blob);
      },
      "image/png",
    );
  });

  return {
    originalBlob,
    originalUrl: URL.createObjectURL(originalBlob),
    previewUrl: URL.createObjectURL(previewBlob),
    previewWidth,
    previewHeight,
    naturalWidth,
    naturalHeight,
  };
}

/** 僅替換圖層來源圖，保留所有座標與版面欄位 */
export function replaceLayerImage(
  layer: ImageDesignLayer,
  image: UploadedDesignImage,
): ImageDesignLayer {
  return {
    ...layer,
    image,
  };
}

export async function boostImageLayerResolution(
  layer: ImageDesignLayer,
  targetDpi: number = TARGET_DPI,
  designerPrintCm?: { width_cm: number; height_cm: number },
): Promise<ImageDesignLayer> {
  const plan = designerPrintCm
    ? getDesignerResolutionBoostPlan(
        layer,
        designerPrintCm.width_cm,
        designerPrintCm.height_cm,
        targetDpi,
      )
    : getResolutionBoostPlan(layer, targetDpi);
  if (plan.meetsTarget) {
    return layer;
  }
  if (!plan.canBoost) {
    if (plan.exceedsMaxDimensions) {
      throw new Error("提升後圖片將超過系統允許的最大像素尺寸（6000×6000）");
    }
    throw new Error(
      `此圖片需放大 ${plan.upscaleFactor.toFixed(2)} 倍，超過安全上限（${MAX_SAFE_SCALE} 倍）`,
    );
  }

  const img = await loadImageElement(layer.image.originalUrl);
  const naturalWidth = Math.round(img.naturalWidth * plan.upscaleFactor);
  const naturalHeight = Math.round(img.naturalHeight * plan.upscaleFactor);
  const resized = await resizeImageToPixelSize(img, naturalWidth, naturalHeight);
  const artworkBounds = await refreshArtworkBounds(resized.originalBlob);

  const baseName = layer.image.fileName.replace(/\.[^.]+$/, "") || "image";
  const newImage: UploadedDesignImage = {
    originalBlob: resized.originalBlob,
    originalUrl: resized.originalUrl,
    previewUrl: resized.previewUrl,
    previewWidth: resized.previewWidth,
    previewHeight: resized.previewHeight,
    naturalWidth: resized.naturalWidth,
    naturalHeight: resized.naturalHeight,
    imagePixelWidth: resized.naturalWidth,
    imagePixelHeight: resized.naturalHeight,
    artworkBounds,
    mimeType: "image/png",
    fileName: `${baseName}-boosted.png`,
  };

  return replaceLayerImage(layer, newImage);
}
