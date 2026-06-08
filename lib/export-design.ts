import {
  EXPORT_DPI,
  type Gender,
  type Side,
} from "./constants";
import {
  DESIGN_GENDERS,
  DESIGN_SIDES,
  getLayersForSlot,
} from "./design-state";
import { embedPngDpi } from "./png-dpi";
import {
  getExportDimensionsForGender,
  getExportMetaForGender,
  getPrintAreaForGender,
} from "./print-area";
import { sortLayersByZIndex } from "./layers";
import {
  ensureTextFontsLoaded,
  resolveFontFamily,
  serializeTextLayer,
} from "./text-layer";
import type {
  DesignConfig,
  DesignLayer,
  DesignLayersByTemplate,
  TextDesignLayer,
  UploadedDesignImage,
} from "./types";

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
  scaleX: number,
  scaleY: number,
) {
  const centerX =
    (layer.x + (layer.width * layer.scale) / 2) * scaleX;
  const centerY =
    (layer.y + (layer.height * layer.scale) / 2) * scaleY;
  const drawW = layer.width * scaleX;
  const drawH = layer.height * scaleY;

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
  scaleX: number,
  scaleY: number,
) {
  const centerX = (layer.x + layer.width * layer.scale / 2) * scaleX;
  const centerY = (layer.y + layer.height * layer.scale / 2) * scaleY;
  const fontSize = layer.fontSize * layer.scale * scaleY;

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

/** 匯出 PNG（依模板規格透明背景 300 DPI，僅設計圖層，不含模特） */
export async function renderCompletedDesignPng(
  templateType: DesignConfig["templateType"],
  _side: DesignConfig["side"],
  layers: DesignLayer[],
): Promise<Blob> {
  const gender = templateType as Gender;
  const printArea = getPrintAreaForGender(gender);
  const { width: exportWidth, height: exportHeight } =
    getExportDimensionsForGender(gender);
  const scaleX = exportWidth / printArea.width;
  const scaleY = exportHeight / printArea.height;

  const canvas = document.createElement("canvas");
  canvas.width = exportWidth;
  canvas.height = exportHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("無法建立畫布");

  const visibleLayers = sortLayersByZIndex(layers).filter((l) => l.visible);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, exportWidth, exportHeight);
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
      drawImageLayerExport(ctx, layer, img, scaleX, scaleY);
    } else {
      drawTextLayerExport(ctx, layer, scaleX, scaleY);
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

function serializeLayerForJson(layer: DesignLayer) {
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
}

function serializeLayersByTemplate(layersByTemplate: DesignLayersByTemplate) {
  const result: Record<string, Record<string, ReturnType<typeof serializeLayerForJson>[]>> =
    {};
  for (const gender of DESIGN_GENDERS) {
    result[gender] = {};
    for (const side of DESIGN_SIDES) {
      result[gender][side] = getLayersForSlot(layersByTemplate, gender, side).map(
        serializeLayerForJson,
      );
    }
  }
  return result;
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
      export: getExportMetaForGender(templateType),
      ...meta,
      layers: layers.map(serializeLayerForJson),
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

/** 儲存／送出：包含所有模板與正反面圖層（v2） */
export function buildFullDesignJson(
  layersByTemplate: DesignLayersByTemplate,
  activeGender: Gender,
  activeSide: Side,
  meta?: Record<string, unknown>,
): string {
  const activeLayers = getLayersForSlot(layersByTemplate, activeGender, activeSide);
  const firstImage = activeLayers.find((l) => l.type === "image");

  const exportByGender = Object.fromEntries(
    DESIGN_GENDERS.map((g) => [g, getExportMetaForGender(g)]),
  );

  return JSON.stringify(
    {
      version: 2,
      templateType: activeGender,
      side: activeSide,
      activeGender,
      activeSide,
      export: getExportMetaForGender(activeGender),
      exportByGender,
      ...meta,
      layersByTemplate: serializeLayersByTemplate(layersByTemplate),
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

function serializeTextDesignLayer(
  layer: TextDesignLayer,
  gender: Gender,
  side: Side,
) {
  return {
    ...serializeTextLayer({
      ...layer,
      type: "text",
    }),
    templateType: gender,
    side,
    layerId: layer.id,
    layerName: layer.name,
  };
}

export function buildAllTextsJson(layersByTemplate: DesignLayersByTemplate): string {
  const texts: ReturnType<typeof serializeTextDesignLayer>[] = [];

  for (const gender of DESIGN_GENDERS) {
    for (const side of DESIGN_SIDES) {
      for (const layer of getLayersForSlot(layersByTemplate, gender, side)) {
        if (layer.type === "text") {
          texts.push(serializeTextDesignLayer(layer, gender, side));
        }
      }
    }
  }

  return JSON.stringify({ texts }, null, 2);
}
