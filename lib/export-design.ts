import {
  EXPORT_DPI,
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  PRINT_AREA,
} from "./constants";
import { embedPngDpi } from "./png-dpi";
import { sortLayersByZIndex } from "./layers";
import {
  ensureTextFontsLoaded,
  resolveFontFamily,
  serializeTextLayer,
} from "./text-layer";
import type {
  DesignConfig,
  DesignLayer,
  TextDesignLayer,
  UploadedDesignImage,
} from "./types";

const EXPORT_SCALE_X = EXPORT_WIDTH / PRINT_AREA.width;
const EXPORT_SCALE_Y = EXPORT_HEIGHT / PRINT_AREA.height;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("無法載入圖片"));
    img.src = src;
  });
}

function drawImageLayerExport(
  ctx: CanvasRenderingContext2D,
  layer: Extract<DesignLayer, { type: "image" }>,
  img: HTMLImageElement,
) {
  const centerX =
    (layer.x + (layer.width * layer.scale) / 2) * EXPORT_SCALE_X;
  const centerY =
    (layer.y + (layer.height * layer.scale) / 2) * EXPORT_SCALE_Y;
  const drawW = layer.width * EXPORT_SCALE_X;
  const drawH = layer.height * EXPORT_SCALE_Y;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.scale, layer.scale);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawTextLayerExport(
  ctx: CanvasRenderingContext2D,
  layer: TextDesignLayer,
) {
  const centerX = (layer.x + layer.width * layer.scale / 2) * EXPORT_SCALE_X;
  const centerY = (layer.y + layer.height * layer.scale / 2) * EXPORT_SCALE_Y;
  const fontSize = layer.fontSize * layer.scale * EXPORT_SCALE_Y;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.globalAlpha = layer.opacity;
  ctx.fillStyle = layer.color;
  ctx.font = `${layer.fontWeight} ${fontSize}px ${resolveFontFamily(layer.fontFamily)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(layer.text, 0, 0);
  ctx.restore();
}

/** 匯出 PNG 3600×4200 透明背景 300 DPI（僅設計圖層，不含模特） */
export async function renderCompletedDesignPng(
  _templateType: DesignConfig["templateType"],
  _side: DesignConfig["side"],
  layers: DesignLayer[],
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布");

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  ctx.clip();

  const textLayers = visibleLayers.filter(
    (l): l is TextDesignLayer => l.type === "text",
  );
  if (textLayers.length > 0) {
    await ensureTextFontsLoaded(
      textLayers.map((t) => ({
        ...t,
        type: "text" as const,
      })),
    );
  }

  const imageCache = new Map<string, HTMLImageElement>();

  for (const layer of visibleLayers) {
    if (layer.type === "image") {
      let img = imageCache.get(layer.id);
      if (!img) {
        img = await loadImage(layer.image.originalUrl);
        imageCache.set(layer.id, img);
      }
      drawImageLayerExport(ctx, layer, img);
    } else {
      drawTextLayerExport(ctx, layer);
    }
  }

  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("無法匯出設計圖"));
        else resolve(result);
      },
      "image/png",
    );
  });

  return embedPngDpi(blob, EXPORT_DPI);
}

/** 向後相容 */
export async function renderCompletedDesignPngLegacy(
  config: DesignConfig,
  designImage: UploadedDesignImage | null,
  textLayers: TextDesignLayer[],
): Promise<Blob> {
  const layers: DesignLayer[] = [];
  if (designImage) {
    layers.push({
      id: "legacy-image",
      name: "圖片",
      type: "image",
      visible: true,
      locked: false,
      zIndex: 0,
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      scale: config.scale,
      rotation: config.rotation,
      image: designImage,
    });
  }
  textLayers.forEach((t, i) => {
    layers.push({
      ...t,
      name: `Text ${i + 1}`,
      visible: true,
      locked: false,
      zIndex: layers.length + i,
    });
  });
  return renderCompletedDesignPng(config.templateType, config.side, layers);
}

export function buildDesignJson(
  templateType: DesignConfig["templateType"],
  side: DesignConfig["side"],
  layers: DesignLayer[],
  meta?: Record<string, unknown>,
): string {
  const firstImage = layers.find((l) => l.type === "image");

  return JSON.stringify(
    {
      templateType,
      side,
      export: {
        format: "png",
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        dpi: EXPORT_DPI,
        background: "transparent",
        designArea: {
          width: EXPORT_WIDTH,
          height: EXPORT_HEIGHT,
          safeMargin: 0.05,
          widthTargetRatio: 0.875,
        },
      },
      ...meta,
      layers: layers.map((layer) => {
        const base = {
          id: layer.id,
          name: layer.name,
          type: layer.type,
          visible: layer.visible,
          locked: layer.locked,
          zIndex: layer.zIndex,
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height,
          scale: layer.scale,
          rotation: layer.rotation,
        };
        if (layer.type === "image") {
          return {
            ...base,
            fileName: layer.image.fileName,
            mimeType: layer.image.mimeType,
          };
        }
        return {
          ...base,
          text: layer.text,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          color: layer.color,
          opacity: layer.opacity,
          fontWeight: layer.fontWeight,
        };
      }),
      x: firstImage?.x ?? 0,
      y: firstImage?.y ?? 0,
      width: firstImage?.width ?? 0,
      height: firstImage?.height ?? 0,
      scale: firstImage?.scale ?? 1,
      rotation: firstImage?.rotation ?? 0,
    },
    null,
    2,
  );
}

export function buildTextJson(layers: DesignLayer[]): string {
  const texts = layers
    .filter((l): l is TextDesignLayer => l.type === "text")
    .map((layer) =>
      serializeTextLayer({
        id: layer.id,
        type: "text",
        text: layer.text,
        fontSize: layer.fontSize,
        fontFamily: layer.fontFamily,
        color: layer.color,
        opacity: layer.opacity,
        fontWeight: layer.fontWeight,
        rotation: layer.rotation,
        scale: layer.scale,
        x: layer.x,
        y: layer.y,
        width: layer.width,
        height: layer.height,
      }),
    );
  return JSON.stringify(texts, null, 2);
}
