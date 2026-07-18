/**
 * 印刷品質 — UI 顯示專用（Designer / Garment cm）。
 * 不修改 analyzeImagePrintQuality() 與任何 Export / Runtime 路徑。
 */
import { getArtworkPixelSize } from "./image-bounds";
import { getLayerEffectiveCmRect } from "./design-cm";
import {
  workspaceRectToDesignerRect,
  type DesignerCoordinateContext,
} from "./designer-coordinate-facade";
import { PRINT_QUALITY_TARGET_DPI } from "./image-print-quality";
import { getTextLayerPlacementCmRect } from "./text-layer";
import type { DesignLayer, ImageDesignLayer } from "./types";

export interface DesignerPrintQualityView {
  artworkPixelWidth: number;
  artworkPixelHeight: number;
  designerWidthCm: number;
  designerHeightCm: number;
  dpiX: number;
  dpiY: number;
  /** UI 顯示用：floor(min(dpiX, dpiY)) */
  dpi: number;
  meetsStandard: boolean;
}

export function computeDesignerRasterPrintDpiAxes(
  artworkPixelWidth: number,
  artworkPixelHeight: number,
  designerWidthCm: number,
  designerHeightCm: number,
): { dpiX: number; dpiY: number } {
  const dpiX =
    artworkPixelWidth > 0 && designerWidthCm > 0
      ? artworkPixelWidth / (designerWidthCm / 2.54)
      : 0;
  const dpiY =
    artworkPixelHeight > 0 && designerHeightCm > 0
      ? artworkPixelHeight / (designerHeightCm / 2.54)
      : 0;
  return { dpiX, dpiY };
}

export function computeDesignerDisplayDpi(dpiX: number, dpiY: number): number {
  if (dpiX <= 0 && dpiY <= 0) return 0;
  if (dpiX <= 0) return Math.floor(dpiY);
  if (dpiY <= 0) return Math.floor(dpiX);
  return Math.floor(Math.min(dpiX, dpiY));
}

function getDesignerSizeRect(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
) {
  const workspaceRect =
    layer.type === "text"
      ? getTextLayerPlacementCmRect(layer)
      : getLayerEffectiveCmRect(layer);
  return workspaceRectToDesignerRect(workspaceRect, ctx);
}

/** 已知 Designer cm 時的 UI 印刷品質 */
export function getArtworkDesignerPrintQuality(
  layer: ImageDesignLayer,
  designerWidthCm: number,
  designerHeightCm: number,
  targetDpi: number = PRINT_QUALITY_TARGET_DPI,
): DesignerPrintQualityView {
  const { artworkPixelWidth, artworkPixelHeight } = getArtworkPixelSize(
    layer.image,
  );
  const { dpiX, dpiY } = computeDesignerRasterPrintDpiAxes(
    artworkPixelWidth,
    artworkPixelHeight,
    designerWidthCm,
    designerHeightCm,
  );
  const dpi = computeDesignerDisplayDpi(dpiX, dpiY);
  return {
    artworkPixelWidth,
    artworkPixelHeight,
    designerWidthCm,
    designerHeightCm,
    dpiX,
    dpiY,
    dpi,
    meetsStandard: dpi >= targetDpi,
  };
}

/** Image Layer + Coordinate Context → UI 印刷品質 */
export function getImageLayerDesignerPrintQuality(
  layer: ImageDesignLayer,
  ctx: DesignerCoordinateContext,
  targetDpi: number = PRINT_QUALITY_TARGET_DPI,
): DesignerPrintQualityView {
  const designerRect = getDesignerSizeRect(layer, ctx);
  return getArtworkDesignerPrintQuality(
    layer,
    designerRect.width_cm,
    designerRect.height_cm,
    targetDpi,
  );
}
