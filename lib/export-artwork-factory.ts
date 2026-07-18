/**
 * Factory Ready Artwork Export — Smart DPI, canvas size, PNG pHYs metadata.
 * Export pipeline only; does not modify Designer / Coordinate / Bounds runtimes.
 */

import type { Side } from "./constants";
import type { LayerCmRect, PrintAreaCmBounds } from "./design-cm";
import {
  exportCanvasSizeToTargetRect,
  mapLayerCmRect,
} from "./coordinate-runtime";
import type { ExportLayerRectPx } from "./export-coordinates";
import { resolveExportGarmentLayerCmRect } from "./export-runtime";
import { loadCachedImage } from "./export/image-cache";
import { drawImageArtworkOnCanvas } from "./image-artwork-render";
import {
  computeDesignerDisplayDpi,
  computeDesignerRasterPrintDpiAxes,
  getArtworkDesignerPrintQuality,
} from "./image-print-quality-ui";
import { sortLayersByZIndex } from "./layers";
import { embedPngDpi } from "./png-dpi";
import { drawShapeOnCanvas } from "./shape-layer";
import { drawRichTextOnCanvas, getRichTextRenderMetrics } from "./text-style";
import { ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, ImageDesignLayer, ShapeDesignLayer, TextDesignLayer } from "./types";

export const FACTORY_READY_MIN_DPI = 300;
export const SMART_DPI_SMALL_MAX_CM = 10;
export const SMART_DPI_MEDIUM_MAX_CM = 20;
export const SMART_DPI_SMALL = 450;
export const SMART_DPI_MEDIUM = 350;
export const SMART_DPI_LARGE = 300;

/** dpi × 39.37007874 — Illustrator reads PNG pHYs as pixels per meter */
export function dpiToPngPixelsPerMeter(dpi: number): number {
  return Math.round(dpi / 0.0254);
}

/** round(designerCm ÷ 2.54 × exportDpi) */
export function cmToFactoryExportPx(cm: number, exportDpi: number): number {
  return Math.round((cm / 2.54) * exportDpi);
}

export function resolveSmartExportDpi(maxEdgeCm: number): number {
  if (maxEdgeCm <= SMART_DPI_SMALL_MAX_CM) return SMART_DPI_SMALL;
  if (maxEdgeCm <= SMART_DPI_MEDIUM_MAX_CM) return SMART_DPI_MEDIUM;
  return SMART_DPI_LARGE;
}

export interface FactoryArtworkBBox {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
}

export interface FactoryArtworkExportSpec {
  bbox: FactoryArtworkBBox;
  exportDpi: number;
  widthPx: number;
  heightPx: number;
}

function isExportableLayer(layer: DesignLayer): boolean {
  if (!layer.visible) return false;
  if (layer.type === "image" || layer.type === "shape") return true;
  return layer.text.trim().length > 0;
}

/**
 * Axis-aligned bounds of a placement rect after rotation around its center.
 * Matches drawImageLayer / drawShapeOnCanvas / drawRichTextOnCanvas pivot.
 */
export function getRotatedRectVisualBoundsCm(
  rect: LayerCmRect,
  rotationDeg: number,
): LayerCmRect {
  const normalized = ((rotationDeg % 360) + 360) % 360;
  if (normalized < 1e-6 || Math.abs(normalized - 360) < 1e-6) {
    return { ...rect };
  }

  const cx = rect.x_cm + rect.width_cm / 2;
  const cy = rect.y_cm + rect.height_cm / 2;
  const hw = rect.width_cm / 2;
  const hh = rect.height_cm / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localCorners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const corner of localCorners) {
    const x = cx + corner.x * cos - corner.y * sin;
    const y = cy + corner.x * sin + corner.y * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    x_cm: minX,
    y_cm: minY,
    width_cm: maxX - minX,
    height_cm: maxY - minY,
  };
}

/** Union of visible layer rotated visual bounds — Designer Artwork Size basis. */
export function computeFactoryArtworkBBox(
  layers: DesignLayer[],
  side: Side,
  size: string,
): FactoryArtworkBBox {
  const exportable = sortLayersByZIndex(layers).filter(isExportableLayer);
  if (exportable.length === 0) {
    throw new Error("尚無可匯出的設計內容");
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layer of exportable) {
    const garmentRect = resolveExportGarmentLayerCmRect(layer, side, size);
    const visualRect = getRotatedRectVisualBoundsCm(
      garmentRect,
      layer.rotation,
    );
    minX = Math.min(minX, visualRect.x_cm);
    minY = Math.min(minY, visualRect.y_cm);
    maxX = Math.max(maxX, visualRect.x_cm + visualRect.width_cm);
    maxY = Math.max(maxY, visualRect.y_cm + visualRect.height_cm);
  }

  return {
    x_cm: minX,
    y_cm: minY,
    width_cm: maxX - minX,
    height_cm: maxY - minY,
  };
}

function collectImageDesignerDpis(
  layers: DesignLayer[],
  side: Side,
  size: string,
): number[] {
  const dpis: number[] = [];
  for (const layer of layers) {
    if (!layer.visible || layer.type !== "image") continue;
    const garment = resolveExportGarmentLayerCmRect(layer, side, size);
    const quality = getArtworkDesignerPrintQuality(
      layer as ImageDesignLayer,
      garment.width_cm,
      garment.height_cm,
    );
    if (quality.dpi > 0) dpis.push(quality.dpi);
  }
  return dpis;
}

/**
 * Smart DPI with no downscale: exportDpi = max(smartDpi, highest image designer dpi).
 */
export function resolveFactoryExportDpi(
  maxEdgeCm: number,
  imageDesignerDpis: readonly number[],
): number {
  const smartDpi = resolveSmartExportDpi(maxEdgeCm);
  if (imageDesignerDpis.length === 0) return smartDpi;
  const highestImageDpi = Math.max(...imageDesignerDpis);
  return Math.max(smartDpi, highestImageDpi);
}

export function resolveFactoryArtworkExportSpec(
  layers: DesignLayer[],
  side: Side,
  size: string,
): FactoryArtworkExportSpec {
  const bbox = computeFactoryArtworkBBox(layers, side, size);
  const maxEdgeCm = Math.max(bbox.width_cm, bbox.height_cm);
  const imageDpis = collectImageDesignerDpis(layers, side, size);
  const exportDpi = resolveFactoryExportDpi(maxEdgeCm, imageDpis);

  return {
    bbox,
    exportDpi,
    widthPx: cmToFactoryExportPx(bbox.width_cm, exportDpi),
    heightPx: cmToFactoryExportPx(bbox.height_cm, exportDpi),
  };
}

function toRelativeLayerCmRect(
  garmentRect: LayerCmRect,
  bbox: FactoryArtworkBBox,
): LayerCmRect {
  return {
    x_cm: garmentRect.x_cm - bbox.x_cm,
    y_cm: garmentRect.y_cm - bbox.y_cm,
    width_cm: garmentRect.width_cm,
    height_cm: garmentRect.height_cm,
  };
}

function mapLayerRectToFactoryExportPx(
  cmRect: LayerCmRect,
  artworkAreaCm: PrintAreaCmBounds,
  canvasSize: { widthPx: number; heightPx: number },
): ExportLayerRectPx {
  const mapped = mapLayerCmRect({
    layerRect: cmRect,
    printArea: artworkAreaCm,
    targetRect: exportCanvasSizeToTargetRect(canvasSize),
  });

  return {
    x: mapped.x,
    y: mapped.y,
    width: mapped.width,
    height: mapped.height,
    pxPerCmX: mapped.pxPerCmX,
    pxPerCmY: mapped.pxPerCmY,
  };
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  exportRect: ExportLayerRectPx,
) {
  const centerX = exportRect.x + exportRect.width / 2;
  const centerY = exportRect.y + exportRect.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  drawImageArtworkOnCanvas(
    ctx,
    img,
    layer.image,
    img.naturalWidth,
    img.naturalHeight,
    -exportRect.width / 2,
    -exportRect.height / 2,
    exportRect.width,
    exportRect.height,
  );
  ctx.restore();
}

export interface RenderFactoryArtworkExportOptions {
  side?: Side;
  size?: string;
}

/**
 * Factory-ready Artwork PNG: Designer cm canvas, Smart DPI, pHYs metadata.
 * Reuses drawImageArtworkOnCanvas() — bounds / crop / rotation / scale unchanged.
 */
export async function renderFactoryArtworkExportPng(
  layers: DesignLayer[],
  options?: RenderFactoryArtworkExportOptions,
): Promise<Blob> {
  const side = options?.side ?? "front";
  const size = options?.size ?? "M";
  const spec = resolveFactoryArtworkExportSpec(layers, side, size);
  const { bbox, exportDpi, widthPx, heightPx } = spec;
  const artworkAreaCm: PrintAreaCmBounds = {
    width: bbox.width_cm,
    height: bbox.height_cm,
  };
  const canvasSize = { widthPx, heightPx };

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立匯出畫布");

  const visibleLayers = sortLayersByZIndex(layers).filter(isExportableLayer);

  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, widthPx, heightPx);
  ctx.clip();

  const textLayers = visibleLayers.filter(
    (layer): layer is TextDesignLayer => layer.type === "text",
  );

  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((textLayer) => ({ ...textLayer, type: "text" as const })),
      {
        getRenderFontSize_cm: (layer) => {
          const garmentRect = resolveExportGarmentLayerCmRect(layer, side, size);
          const relativeRect = toRelativeLayerCmRect(garmentRect, bbox);
          const exportRect = mapLayerRectToFactoryExportPx(
            relativeRect,
            artworkAreaCm,
            canvasSize,
          );
          return getRichTextRenderMetrics(
            layer,
            garmentRect,
            exportRect.pxPerCmX,
          ).fontSize_cm;
        },
      },
    );
  }

  for (const layer of visibleLayers) {
    const garmentRect = resolveExportGarmentLayerCmRect(layer, side, size);
    const relativeRect = toRelativeLayerCmRect(garmentRect, bbox);
    const exportRect = mapLayerRectToFactoryExportPx(
      relativeRect,
      artworkAreaCm,
      canvasSize,
    );

    if (layer.type === "image") {
      const img = await loadCachedImage(layer.image.originalUrl);
      drawImageLayer(ctx, layer, img, exportRect);
    } else if (layer.type === "shape") {
      drawShapeOnCanvas(
        ctx,
        layer as ShapeDesignLayer,
        exportRect.pxPerCmX,
        relativeRect,
      );
    } else if (layer.text.trim().length > 0) {
      drawRichTextOnCanvas(
        ctx,
        layer,
        exportRect.pxPerCmX,
        relativeRect,
        exportRect.pxPerCmY,
      );
    }
  }

  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("無法匯出 PNG"));
        else resolve(result);
      },
      "image/png",
    );
  });

  return embedPngDpi(blob, exportDpi);
}

/** Exposed for verification — effective designer DPI from artwork pixels vs cm. */
export function computeImageDesignerDpi(
  artworkPixelWidth: number,
  artworkPixelHeight: number,
  designerWidthCm: number,
  designerHeightCm: number,
): number {
  const { dpiX, dpiY } = computeDesignerRasterPrintDpiAxes(
    artworkPixelWidth,
    artworkPixelHeight,
    designerWidthCm,
    designerHeightCm,
  );
  return computeDesignerDisplayDpi(dpiX, dpiY);
}
