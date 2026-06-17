import { offsetLayerCmRect, readLayerCmRect } from "./design-cm";
import {
  MAX_IMAGES_PER_SIDE,
  MAX_SHAPE_LAYERS,
  MAX_TEXT_LAYERS,
} from "./constants";
import type {
  DesignConfig,
  DesignLayer,
  ImageDesignLayer,
  LayerMeta,
  ShapeDesignLayer,
  TextDesignLayer,
  TextLayer,
  UploadedDesignImage,
} from "./types";
import { nanoid } from "nanoid";

export function sortLayersByZIndex(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

export function sortLayersForPanel(layers: DesignLayer[]): DesignLayer[] {
  return [...layers].sort((a, b) => b.zIndex - a.zIndex);
}

export function getNextZIndex(layers: DesignLayer[]): number {
  if (layers.length === 0) return 0;
  return Math.max(...layers.map((l) => l.zIndex)) + 1;
}

export function countLayersByType(
  layers: DesignLayer[],
  type: "image" | "text" | "shape",
) {
  return layers.filter((l) => l.type === type).length;
}

export function canAddImageLayer(layers: DesignLayer[]): boolean {
  return countLayersByType(layers, "image") < MAX_IMAGES_PER_SIDE;
}

export function canAddTextLayer(layers: DesignLayer[]): boolean {
  return countLayersByType(layers, "text") < MAX_TEXT_LAYERS;
}

export function canAddShapeLayer(layers: DesignLayer[]): boolean {
  return countLayersByType(layers, "shape") < MAX_SHAPE_LAYERS;
}

export function imageLayerLimitMessage(): string {
  return `單面最多上傳 ${MAX_IMAGES_PER_SIDE} 張圖片`;
}

export function textLayerLimitMessage(): string {
  return `最多新增 ${MAX_TEXT_LAYERS} 個文字圖層`;
}

export function shapeLayerLimitMessage(): string {
  return `最多新增 ${MAX_SHAPE_LAYERS} 個圖形圖層`;
}

export function defaultLayerName(
  layers: DesignLayer[],
  type: "image" | "text" | "shape",
) {
  const n = countLayersByType(layers, type) + 1;
  if (type === "image") return `圖片 ${n}`;
  if (type === "shape") return `圖形 ${n}`;
  return `文字 ${n}`;
}

export function reindexLayers(ordered: DesignLayer[]): DesignLayer[] {
  return ordered.map((layer, index) => ({ ...layer, zIndex: index }));
}

export function moveLayerZIndex(
  layers: DesignLayer[],
  layerId: string,
  action: "top" | "up" | "down" | "bottom",
): DesignLayer[] {
  const sorted = sortLayersByZIndex(layers);
  const index = sorted.findIndex((l) => l.id === layerId);
  if (index < 0) return layers;

  const next = [...sorted];
  const [item] = next.splice(index, 1);

  let insertAt = index;
  switch (action) {
    case "top":
      insertAt = next.length;
      break;
    case "up":
      insertAt = Math.min(index + 1, next.length);
      break;
    case "down":
      insertAt = Math.max(index - 1, 0);
      break;
    case "bottom":
      insertAt = 0;
      break;
  }

  next.splice(insertAt, 0, item);
  return reindexLayers(next);
}

export function duplicateShapeLayer(
  layers: DesignLayer[],
  layerId: string,
): ShapeDesignLayer | null {
  const source = layers.find(
    (l): l is ShapeDesignLayer => l.id === layerId && l.type === "shape",
  );
  if (!source) return null;

  const rect = offsetLayerCmRect(readLayerCmRect(source), 1.2, 1.2);

  return {
    ...source,
    id: nanoid(),
    name: `${source.name} 複本`,
    zIndex: getNextZIndex(layers),
    ...rect,
  };
}

export function duplicateTextLayer(
  layers: DesignLayer[],
  layerId: string,
): TextDesignLayer | null {
  const source = layers.find(
    (l): l is TextDesignLayer => l.id === layerId && l.type === "text",
  );
  if (!source) return null;

  const rect = offsetLayerCmRect(readLayerCmRect(source), 1.2, 1.2);

  return {
    ...source,
    id: nanoid(),
    name: `${source.name} 複本`,
    zIndex: getNextZIndex(layers),
    ...rect,
  };
}

export async function duplicateImageLayerAsync(
  layers: DesignLayer[],
  layerId: string,
): Promise<DesignLayer | null> {
  const source = layers.find((l) => l.id === layerId && l.type === "image");
  if (!source || source.type !== "image") return null;

  const previewBlob = await fetch(source.image.previewUrl).then((r) => r.blob());
  const id = nanoid();
  const image: UploadedDesignImage = {
    ...source.image,
    originalUrl: URL.createObjectURL(source.image.originalBlob),
    previewUrl: URL.createObjectURL(previewBlob),
  };

  const rect = offsetLayerCmRect(readLayerCmRect(source), 1.2, 1.2);

  return {
    ...source,
    id,
    name: `${source.name} 複本`,
    zIndex: getNextZIndex(layers),
    ...rect,
    image,
  };
}

export function createImageLayer(
  layers: DesignLayer[],
  image: UploadedDesignImage,
  placement: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
): ImageDesignLayer {
  return {
    id: nanoid(),
    name: defaultLayerName(layers, "image"),
    type: "image",
    visible: true,
    locked: false,
    zIndex: getNextZIndex(layers),
    x_cm: placement.x_cm,
    y_cm: placement.y_cm,
    width_cm: placement.width_cm,
    height_cm: placement.height_cm,
    scale: 1,
    rotation: 0,
    keepRatio: true,
    image,
  };
}

export function textLayerToDesignLayer(
  layer: TextLayer,
  meta?: Partial<LayerMeta>,
): TextDesignLayer {
  return {
    id: layer.id,
    name: meta?.name ?? "Text",
    type: "text",
    visible: meta?.visible ?? true,
    locked: meta?.locked ?? false,
    zIndex: meta?.zIndex ?? 0,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
    text: layer.text,
    fontSize_cm: layer.fontSize_cm,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
    fontStyle: "normal",
    letterSpacing_cm: 0,
    lineHeight: 1.3,
    textAlign: "center",
    stroke: null,
    shadow: null,
  };
}

export function migrateLegacyToLayers(
  config: DesignConfig,
  image: UploadedDesignImage | null,
  textLayers: TextLayer[],
): DesignLayer[] {
  const layers: DesignLayer[] = [];
  let z = 0;

  if (image) {
    layers.push({
      id: nanoid(),
      name: "圖片 1",
      type: "image",
      visible: true,
      locked: false,
      zIndex: z++,
      x_cm: config.x_cm,
      y_cm: config.y_cm,
      width_cm: config.width_cm,
      height_cm: config.height_cm,
      scale: config.scale,
      rotation: config.rotation,
      image,
    });
  }

  for (const t of textLayers) {
    layers.push(
      textLayerToDesignLayer(t, {
        zIndex: z++,
        name: defaultLayerName(layers, "text"),
      }),
    );
  }

  return layers;
}

export function getTextLayersFromDesign(layers: DesignLayer[]): TextDesignLayer[] {
  return layers.filter((l): l is TextDesignLayer => l.type === "text");
}

export function reorderLayersByDrag(
  layers: DesignLayer[],
  dragId: string,
  targetId: string,
): DesignLayer[] {
  if (dragId === targetId) return layers;
  const sorted = sortLayersForPanel(layers);
  const from = sorted.findIndex((l) => l.id === dragId);
  const to = sorted.findIndex((l) => l.id === targetId);
  if (from < 0 || to < 0) return layers;

  const next = [...sorted];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return reindexLayers([...next].reverse());
}

export function revokeLayerAssets(layer: DesignLayer) {
  if (layer.type === "image") {
    URL.revokeObjectURL(layer.image.originalUrl);
    URL.revokeObjectURL(layer.image.previewUrl);
  }
}

/** 寫入 localStorage 用（不含 blob / object URL） */
export function layersToDraftSnapshot(layers: DesignLayer[]): DesignLayer[] {
  return layers.map((layer) => {
    if (layer.type !== "image") return layer;
    return {
      ...layer,
      image: {
        originalBlob: new Blob(),
        originalUrl: "",
        previewUrl: "",
        fileName: layer.image.fileName,
        mimeType: layer.image.mimeType,
        previewWidth: layer.image.previewWidth,
        previewHeight: layer.image.previewHeight,
        naturalWidth: layer.image.naturalWidth,
        naturalHeight: layer.image.naturalHeight,
        imagePixelWidth: layer.image.imagePixelWidth,
        imagePixelHeight: layer.image.imagePixelHeight,
        artworkBounds: layer.image.artworkBounds,
      },
    };
  });
}

export function serializeLayerMeta(layer: DesignLayer) {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    zIndex: layer.zIndex,
  };
}
