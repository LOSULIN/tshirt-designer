/**
 * 印刷輸出系統（Export Pipeline）
 * - 座標：Production Coordinate System（mm）
 * - 輸出：350×500 mm @ 300 DPI · PNG / PDF
 *
 * 不經 Preview / Mockup 座標。
 */

import {
  getProductionExportDimensionsPx,
  getProductionPrintAreaCm,
  legacyCmFieldToMm,
  MM_TO_EXPORT_PX,
  PRODUCTION_DPI,
} from "./coordinates/production";
import { getLayerInspectorCmRect } from "./design-inspector";
import { embedPngDpi } from "./png-dpi";
import { sortLayersByZIndex } from "./layers";
import { drawRichTextOnCanvas } from "./text-style";
import { drawShapeOnCanvas } from "./shape-layer";
import { ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, ShapeDesignLayer, TextDesignLayer } from "./types";

export const PRINT_EXPORT_DPI = PRODUCTION_DPI;

/** 1 legacy cm 欄位（=10mm）→ px @ 300 DPI */
export const CM_TO_EXPORT_PX = MM_TO_EXPORT_PX * 10;

export function cmToExportPx(cm: number): number {
  return Math.round(legacyCmFieldToMm(cm) * MM_TO_EXPORT_PX);
}

export function exportPxToCm(px: number): number {
  return px / CM_TO_EXPORT_PX;
}

export interface PrintExportDimensionsPx {
  widthPx: number;
  heightPx: number;
}

export interface PrintExportSpec {
  widthCm: number;
  heightCm: number;
  dpi: number;
  widthPx: number;
  heightPx: number;
  cmToPx: number;
  background: "transparent";
}

export function getPrintExportDimensionsPx(): PrintExportDimensionsPx {
  return getProductionExportDimensionsPx();
}

export function getPrintExportSpec(): PrintExportSpec {
  const { widthPx, heightPx } = getProductionExportDimensionsPx();
  const printCm = getProductionPrintAreaCm();
  return {
    widthCm: printCm.width,
    heightCm: printCm.height,
    dpi: PRINT_EXPORT_DPI,
    widthPx,
    heightPx,
    cmToPx: CM_TO_EXPORT_PX,
    background: "transparent",
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片"));
    img.src = src;
  });
}

function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  pxPerCm: number,
) {
  const rect = getLayerInspectorCmRect(layer);
  const centerX = (rect.x_cm + rect.width_cm / 2) * pxPerCm;
  const centerY = (rect.y_cm + rect.height_cm / 2) * pxPerCm;
  const drawW = rect.width_cm * pxPerCm;
  const drawH = rect.height_cm * pxPerCm;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/**
 * 將 cm-based design layers 渲染為可送印 PNG（透明背景）。
 */
export async function renderPrintExportPng(
  layers: DesignLayer[],
): Promise<Blob> {
  const spec = getPrintExportSpec();
  const { widthPx, heightPx } = spec;

  const canvas = document.createElement("canvas");
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立匯出畫布");

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);

  ctx.clearRect(0, 0, widthPx, heightPx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, widthPx, heightPx);
  ctx.clip();

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({ ...t, type: "text" as const })),
    );
  }

  const imageCache = new Map<string, HTMLImageElement>();
  const pxPerCm = CM_TO_EXPORT_PX;

  for (const layer of visibleLayers) {
    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayer(ctx, layer, img, pxPerCm);
    } else if (layer.type === "shape") {
      drawShapeOnCanvas(
        ctx,
        layer as ShapeDesignLayer,
        pxPerCm,
        getLayerInspectorCmRect(layer),
      );
    } else if (layer.text.trim().length > 0) {
      drawRichTextOnCanvas(
        ctx,
        layer,
        pxPerCm,
        getLayerInspectorCmRect(layer),
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

  return embedPngDpi(blob, PRINT_EXPORT_DPI);
}
