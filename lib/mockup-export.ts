/**
 * Mockup Preview 輸出 — 模板 + cm-based elements overlay（非 DOM 截圖）。
 */

import type { ShirtColor, Side } from "./constants";
import { getLayerInspectorCmRect } from "./design-inspector";
import { getPrintAreaCmBounds } from "./design-cm";
import { getLayersForCanvasRender } from "./layer-system";
import {
  getFixedPrintAreaContainerPct,
  PRINT_REFERENCE,
  SHIRT_CONTAINER_HEIGHT,
  SHIRT_CONTAINER_WIDTH,
} from "./printArea";
import { getAdultTshirtTemplateSrc } from "./shirt-template";
import { buildCanvasFont, ensureTextFontsLoaded } from "./text-layer";
import type { DesignLayer, TextDesignLayer } from "./types";

export const MOCKUP_EXPORT_SCALE = 2;

export interface MockupContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getPrintAreaRectInContainerPx(
  containerWidth: number,
  containerHeight: number,
): MockupContainerRect {
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  const width = widthPct * containerWidth;
  const height = heightPct * containerHeight;
  const centerX = PRINT_REFERENCE.x * containerWidth;
  const centerY = PRINT_REFERENCE.y * containerHeight;

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入模板圖片"));
    img.src = src;
  });
}

function drawImageLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
  printRect: MockupContainerRect,
  printAreaCm: { width: number; height: number },
) {
  const rect = getLayerInspectorCmRect(layer);
  const pxPerCmX = printRect.width / printAreaCm.width;
  const pxPerCmY = printRect.height / printAreaCm.height;
  const centerX = printRect.left + (rect.x_cm + rect.width_cm / 2) * pxPerCmX;
  const centerY = printRect.top + (rect.y_cm + rect.height_cm / 2) * pxPerCmY;
  const drawW = rect.width_cm * pxPerCmX;
  const drawH = rect.height_cm * pxPerCmY;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawTextLayerOnMockup(
  ctx: CanvasRenderingContext2D,
  layer: TextDesignLayer,
  printRect: MockupContainerRect,
  printAreaCm: { width: number; height: number },
) {
  const rect = getLayerInspectorCmRect(layer);
  const pxPerCmX = printRect.width / printAreaCm.width;
  const pxPerCmY = printRect.height / printAreaCm.height;
  const fontSize_cm = layer.fontSize_cm * layer.scale;
  const centerX = printRect.left + (rect.x_cm + rect.width_cm / 2) * pxPerCmX;
  const centerY = printRect.top + (rect.y_cm + rect.height_cm / 2) * pxPerCmY;
  const fontSizePx = fontSize_cm * pxPerCmY;

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

export function buildMockupExportFileName(side: Side): string {
  return `mockup-${side}-preview.png`;
}

/**
 * 渲染 Mockup Preview PNG：T-shirt 模板 + 設計元素（依 cm 比例疊加）。
 */
export async function renderMockupPreviewPng(params: {
  shirtColor: ShirtColor;
  side: Side;
  layers: DesignLayer[];
  scale?: number;
}): Promise<Blob> {
  const { shirtColor, side, layers, scale = MOCKUP_EXPORT_SCALE } = params;
  const canvasWidth = SHIRT_CONTAINER_WIDTH * scale;
  const canvasHeight = SHIRT_CONTAINER_HEIGHT * scale;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立 mockup 畫布");

  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  try {
    const template = await loadImage(templateSrc);
    ctx.drawImage(template, 0, 0, canvasWidth, canvasHeight);
  } catch {
    ctx.fillStyle = "#e4e4e7";
    ctx.fillRect(canvasWidth * 0.15, canvasHeight * 0.1, canvasWidth * 0.7, canvasHeight * 0.8);
  }

  const printAreaCm = getPrintAreaCmBounds();
  const printRect = getPrintAreaRectInContainerPx(canvasWidth, canvasHeight);
  const visibleLayers = getLayersForCanvasRender(layers).filter((l) => l.visible);

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({ ...t, type: "text" as const })),
    );
  }

  const imageCache = new Map<string, HTMLImageElement>();
  for (const layer of visibleLayers) {
    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.previewUrl || layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayerOnMockup(ctx, layer, img, printRect, printAreaCm);
    } else if (layer.text.trim().length > 0) {
      drawTextLayerOnMockup(ctx, layer, printRect, printAreaCm);
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("無法匯出 mockup PNG"));
        else resolve(blob);
      },
      "image/png",
    );
  });
}
