/**
 * 印刷輸出系統（Export Pipeline）
 * - 座標：Designer 儲存之 width_cm / height_cm / x_cm / y_cm
 * - 換算：與 Preview 相同之 print area 比例 → 實際印刷尺寸 px
 * - 輸出：面別印刷區 @ 300 DPI · PNG / PDF
 */

import type { Side } from "./constants";
import {
  legacyCmFieldToMm,
  MM_TO_EXPORT_PX,
  PRODUCTION_DPI,
} from "./coordinates/production";
import {
  getExportCanvasSpec,
  getLayerExportCmRect,
  mapLayerCmRectToExportPx,
  type ExportLayerRectPx,
} from "./export-coordinates";
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

export function getPrintExportDimensionsPx(
  side: Side = "front",
): PrintExportDimensionsPx {
  const spec = getExportCanvasSpec(side);
  return { widthPx: spec.widthPx, heightPx: spec.heightPx };
}

export function getPrintExportSpec(side: Side = "front"): PrintExportSpec {
  const canvasSpec = getExportCanvasSpec(side);
  return {
    widthCm: canvasSpec.printAreaCm.width,
    heightCm: canvasSpec.printAreaCm.height,
    dpi: canvasSpec.dpi,
    widthPx: canvasSpec.widthPx,
    heightPx: canvasSpec.heightPx,
    cmToPx: canvasSpec.widthPx / canvasSpec.printAreaCm.width,
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
  exportRect: ExportLayerRectPx,
) {
  const centerX = exportRect.x + exportRect.width / 2;
  const centerY = exportRect.y + exportRect.height / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.drawImage(
    img,
    -exportRect.width / 2,
    -exportRect.height / 2,
    exportRect.width,
    exportRect.height,
  );
  ctx.restore();
}

export interface RenderPrintExportOptions {
  /** 與 Designer / Preview 一致之印刷區（正面 35×50、背面 38×45） */
  side?: Side;
}

/**
 * 將 cm-based design layers 渲染為可送印 PNG（透明背景）。
 */
export async function renderPrintExportPng(
  layers: DesignLayer[],
  options?: RenderPrintExportOptions,
): Promise<Blob> {
  const side = options?.side ?? "front";
  const canvasSpec = getExportCanvasSpec(side);
  const { widthPx, heightPx } = canvasSpec;
  const printAreaCm = canvasSpec.printAreaCm;

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
  const canvasSize = { widthPx, heightPx };

  for (const layer of visibleLayers) {
    const cmRect = getLayerExportCmRect(layer);
    const exportRect = mapLayerCmRectToExportPx(cmRect, printAreaCm, canvasSize);

    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayer(ctx, layer, img, exportRect);
    } else if (layer.type === "shape") {
      drawShapeOnCanvas(
        ctx,
        layer as ShapeDesignLayer,
        exportRect.pxPerCmX,
        cmRect,
      );
    } else if (layer.text.trim().length > 0) {
      drawRichTextOnCanvas(ctx, layer, exportRect.pxPerCmX, cmRect);
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
