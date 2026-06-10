/**
 * 印刷輸出系統（Export Pipeline）
 * - 資料：design layer cm
 * - 輸出：35×50 cm @ 300 DPI · PNG / PDF
 * - 轉換：1 cm = (300 / 2.54) px
 *
 * 不影響 UI render 或 design editor。
 */

import { EXPORT_DPI } from "./constants";
import { getLayerInspectorCmRect } from "./design-inspector";
import { embedPngDpi } from "./png-dpi";
import { PRINT_AREA } from "./printArea";
import { sortLayersByZIndex } from "./layers";
import { buildCanvasFont, ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, TextDesignLayer } from "./types";

export const PRINT_EXPORT_DPI = EXPORT_DPI;

/** 1 cm → px @ 300 DPI */
export const CM_TO_EXPORT_PX = PRINT_EXPORT_DPI / 2.54;

export function cmToExportPx(cm: number): number {
  return Math.round(cm * CM_TO_EXPORT_PX);
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
  return {
    widthPx: cmToExportPx(PRINT_AREA.widthCm),
    heightPx: cmToExportPx(PRINT_AREA.heightCm),
  };
}

export function getPrintExportSpec(): PrintExportSpec {
  const { widthPx, heightPx } = getPrintExportDimensionsPx();
  return {
    widthCm: PRINT_AREA.widthCm,
    heightCm: PRINT_AREA.heightCm,
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

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextDesignLayer,
  pxPerCm: number,
) {
  const rect = getLayerInspectorCmRect(layer);
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const centerX = (rect.x_cm + rect.width_cm / 2) * pxPerCm;
  const centerY = (rect.y_cm + rect.height_cm / 2) * pxPerCm;
  const fontSizePx = fontSize_cm * pxPerCm;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.fillStyle = layer.color;
  ctx.font = buildCanvasFont(layer.fontWeight, fontSizePx, layer.fontFamily);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(layer.text, 0, 0);
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
    } else if (layer.text.trim().length > 0) {
      drawTextLayer(ctx, layer, pxPerCm);
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
