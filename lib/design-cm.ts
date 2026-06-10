/**
 * Design layer 標準座標（cm）。
 * UI 渲染：px = cm × UI_SCALE（見 printArea.UI_SCALE）
 */

import { PRINT_AREA, UI_SCALE } from "./printArea";
import type {
  DesignLayer,
  ImageDesignLayer,
  TextDesignLayer,
  TextLayer,
} from "./types";

export interface LayerCmRect {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
}

export interface PrintAreaCmBounds {
  width: number;
  height: number;
}

export function cmToUiPx(cm: number): number {
  return cm * UI_SCALE;
}

export function uiPxToCm(px: number): number {
  return px / UI_SCALE;
}

export function getPrintAreaCmBounds(): PrintAreaCmBounds {
  return {
    width: PRINT_AREA.widthCm,
    height: PRINT_AREA.heightCm,
  };
}

/** 舊版設計座標（0.1 cm / unit）→ cm */
export function legacyDesignUnitsToCm(units: number): number {
  return units / UI_SCALE;
}

/** cm → 舊版設計座標（匯出管線過渡） */
export function cmToLegacyDesignUnits(cm: number): number {
  return cm * UI_SCALE;
}

type LegacyLayerShape = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  x_cm?: number;
  y_cm?: number;
  width_cm?: number;
  height_cm?: number;
  fontSize?: number;
  fontSize_cm?: number;
};

export function readLayerCmRect(layer: LegacyLayerShape): LayerCmRect {
  if (layer.x_cm != null) {
    return {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm ?? 0,
      width_cm: layer.width_cm ?? 0,
      height_cm: layer.height_cm ?? 0,
    };
  }
  return {
    x_cm: legacyDesignUnitsToCm(layer.x ?? 0),
    y_cm: legacyDesignUnitsToCm(layer.y ?? 0),
    width_cm: legacyDesignUnitsToCm(layer.width ?? 0),
    height_cm: legacyDesignUnitsToCm(layer.height ?? 0),
  };
}

export function readFontSizeCm(layer: LegacyLayerShape): number {
  if (layer.fontSize_cm != null) return layer.fontSize_cm;
  if (layer.fontSize != null) return legacyDesignUnitsToCm(layer.fontSize);
  return 4.8;
}

export function getLayerEffectiveCmRect(layer: DesignLayer): LayerCmRect {
  const base = readLayerCmRect(layer);
  if (layer.type === "image") {
    return {
      x_cm: base.x_cm,
      y_cm: base.y_cm,
      width_cm: base.width_cm * layer.scale,
      height_cm: base.height_cm * layer.scale,
    };
  }
  return base;
}

export function migrateDesignLayerToCm(
  layer: DesignLayer & LegacyLayerShape,
): DesignLayer {
  const rect = readLayerCmRect(layer);
  if (layer.type === "text") {
    const fontSize_cm = readFontSizeCm(layer);
    const { x, y, width, height, fontSize, ...rest } =
      layer as DesignLayer & LegacyLayerShape;
    void x;
    void y;
    void width;
    void height;
    void fontSize;
    return {
      ...rest,
      ...rect,
      fontSize_cm,
    } as TextDesignLayer;
  }
  const { x, y, width, height, ...rest } = layer as ImageDesignLayer &
    LegacyLayerShape;
  void x;
  void y;
  void width;
  void height;
  return {
    ...rest,
    ...rect,
  } as ImageDesignLayer;
}

export function migrateDesignLayersToCm(layers: readonly unknown[]): DesignLayer[] {
  return (layers as Array<DesignLayer & LegacyLayerShape>).map(
    migrateDesignLayerToCm,
  );
}

export function patchLayerCmRect<T extends DesignLayer>(
  layer: T,
  patch: Partial<LayerCmRect>,
): T {
  return { ...layer, ...patch };
}

export function offsetLayerCmRect(
  rect: LayerCmRect,
  dx_cm: number,
  dy_cm: number,
): LayerCmRect {
  return {
    ...rect,
    x_cm: rect.x_cm + dx_cm,
    y_cm: rect.y_cm + dy_cm,
  };
}

export function layerCmToPercentStyle(
  rect: LayerCmRect,
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  return {
    left: `${(rect.x_cm / printArea.width) * 100}%`,
    top: `${(rect.y_cm / printArea.height) * 100}%`,
    width: `${(rect.width_cm / printArea.width) * 100}%`,
    height: `${(rect.height_cm / printArea.height) * 100}%`,
  };
}

export function createDefaultTextLayerCm(
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
): Omit<TextLayer, "id"> & LayerCmRect & { fontSize_cm: number } {
  const fontSize_cm = 4.8;
  const text = "TEST";
  const width_cm = Math.max(fontSize_cm * 4, 2);
  const height_cm = fontSize_cm * 1.3;
  return {
    type: "text",
    text,
    fontSize_cm,
    fontFamily: "Inter",
    color: "#000000",
    opacity: 1,
    fontWeight: 400,
    rotation: 0,
    scale: 1,
    x_cm: (printArea.width - width_cm) / 2,
    y_cm: (printArea.height - height_cm) / 2,
    width_cm,
    height_cm,
  };
}
