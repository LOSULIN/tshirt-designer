import { getArtworkPixelSize } from "./image-bounds";
import { ACCEPTED_IMAGE_TYPES } from "./constants";
import { getLayerEffectiveCmRect } from "./design-cm";
import type { ImageDesignLayer, UploadedDesignImage } from "./types";

/** 印刷品質標準（僅 UI 分析，不修改 production 匯出 DPI 流程） */
export const PRINT_QUALITY_TARGET_DPI = 300;

export const RASTER_PRINT_SIZE_A4_CM = {
  width_cm: 21,
  height_cm: 29.7,
} as const;

export const RASTER_PRINT_SIZE_A3_CM = {
  width_cm: 29.7,
  height_cm: 42,
} as const;

export type RasterPrintQualityStatus = "ok" | "low";

export interface RasterPrintSizeCm {
  width_cm: number;
  height_cm: number;
}

export interface ImagePrintQualityReport {
  imagePixelWidth: number;
  imagePixelHeight: number;
  artworkPixelWidth: number;
  artworkPixelHeight: number;
  printWidth_cm: number;
  printHeight_cm: number;
  dpi: number;
  status: RasterPrintQualityStatus;
  meetsStandard: boolean;
}

export interface FitRasterImageOptions {
  maxPrintWidth_cm: number;
  maxPrintHeight_cm: number;
}

export function isRasterImageMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return ACCEPTED_IMAGE_TYPES.includes(
    normalized as (typeof ACCEPTED_IMAGE_TYPES)[number],
  );
}

export function isRasterImageLayer(layer: {
  type: string;
  image?: UploadedDesignImage;
}): layer is ImageDesignLayer {
  return (
    layer.type === "image" &&
    Boolean(layer.image) &&
    isRasterImageMimeType(layer.image!.mimeType)
  );
}

export function getImagePixelSize(image: UploadedDesignImage): {
  imagePixelWidth: number;
  imagePixelHeight: number;
} {
  return {
    imagePixelWidth: image.imagePixelWidth ?? image.naturalWidth,
    imagePixelHeight: image.imagePixelHeight ?? image.naturalHeight,
  };
}

export function getRasterMaxPrintSizeCm(
  largePrintMode: boolean,
): RasterPrintSizeCm {
  return largePrintMode ? RASTER_PRINT_SIZE_A3_CM : RASTER_PRINT_SIZE_A4_CM;
}

export function getImageFitOptions(
  largePrintMode: boolean,
): FitRasterImageOptions {
  const max = getRasterMaxPrintSizeCm(largePrintMode);
  return {
    maxPrintWidth_cm: max.width_cm,
    maxPrintHeight_cm: max.height_cm,
  };
}

/** dpi = imagePixelWidth / (printWidthCm / 2.54) */
export function computeRasterPrintDpi(
  imagePixelWidth: number,
  printWidthCm: number,
): number {
  if (imagePixelWidth <= 0 || printWidthCm <= 0) return 0;
  return imagePixelWidth / (printWidthCm / 2.54);
}

export function analyzeImagePrintQuality(
  layer: ImageDesignLayer,
): ImagePrintQualityReport {
  const { imagePixelWidth, imagePixelHeight } = getImagePixelSize(layer.image);
  const { artworkPixelWidth, artworkPixelHeight } = getArtworkPixelSize(
    layer.image,
  );
  const rect = getLayerEffectiveCmRect(layer);
  const dpi = computeRasterPrintDpi(artworkPixelWidth, rect.width_cm);
  const meetsStandard = dpi >= PRINT_QUALITY_TARGET_DPI;

  return {
    imagePixelWidth,
    imagePixelHeight,
    artworkPixelWidth,
    artworkPixelHeight,
    printWidth_cm: rect.width_cm,
    printHeight_cm: rect.height_cm,
    dpi: Math.round(dpi),
    status: meetsStandard ? "ok" : "low",
    meetsStandard,
  };
}

/**
 * 將目標印刷尺寸限制在 max 框內（contain、保持比例）。
 */
export function clampRasterPrintDimensions(
  widthCm: number,
  heightCm: number,
  maxWidthCm: number,
  maxHeightCm: number,
): { width_cm: number; height_cm: number; wasClamped: boolean } {
  if (widthCm <= 0 || heightCm <= 0) {
    return { width_cm: widthCm, height_cm: heightCm, wasClamped: false };
  }

  if (widthCm <= maxWidthCm && heightCm <= maxHeightCm) {
    return { width_cm: widthCm, height_cm: heightCm, wasClamped: false };
  }

  const factor = Math.min(maxWidthCm / widthCm, maxHeightCm / heightCm);
  return {
    width_cm: widthCm * factor,
    height_cm: heightCm * factor,
    wasClamped: true,
  };
}

/** 基礎 width_cm / height_cm 在 scale 下不超過印刷上限的最大 scale */
export function getMaxImageScaleForPrintLimit(
  width_cm: number,
  height_cm: number,
  maxPrintWidth_cm: number,
  maxPrintHeight_cm: number,
  cap = Number.POSITIVE_INFINITY,
): number {
  if (width_cm <= 0 || height_cm <= 0) return cap;
  return Math.min(
    cap,
    maxPrintWidth_cm / width_cm,
    maxPrintHeight_cm / height_cm,
  );
}

export function isAtRasterPrintMaxSize(
  layer: ImageDesignLayer,
  largePrintMode: boolean,
): boolean {
  const rect = getLayerEffectiveCmRect(layer);
  const max = getRasterMaxPrintSizeCm(largePrintMode);
  return clampRasterPrintDimensions(
    rect.width_cm * 1.001,
    rect.height_cm * 1.001,
    max.width_cm,
    max.height_cm,
  ).wasClamped;
}

/** Resize 結果：保持中心，限制在 max 框內 */
export function clampRasterResizeRect(
  rect: { x: number; y: number; width: number; height: number },
  maxWidthCm: number,
  maxHeightCm: number,
): { x: number; y: number; width: number; height: number; wasClamped: boolean } {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const clamped = clampRasterPrintDimensions(
    rect.width,
    rect.height,
    maxWidthCm,
    maxHeightCm,
  );

  return {
    x: centerX - clamped.width_cm / 2,
    y: centerY - clamped.height_cm / 2,
    width: clamped.width_cm,
    height: clamped.height_cm,
    wasClamped: clamped.wasClamped,
  };
}
