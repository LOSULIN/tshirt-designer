/**
 * Design layer 座標橋接層。
 * Production 真相為 mm；圖層 `_cm` 欄位 = mm ÷ 10。
 */

import {
  getProductionPrintAreaCm,
  getProductionPrintAreaMm,
  legacyCmFieldToMm,
  mmToLegacyCmField,
  PRODUCTION_LEGACY_UI_UNITS_PER_CM,
  type ProductionRectMm,
} from "./coordinates/production";
import type { Side } from "./constants";
import {
  getRuntimeTemplateCanvas,
  getRuntimeTemplatePrintArea,
  getRuntimeTemplatePxPerCm,
} from "./template-profile/runtime";
import { ADULT_TSHIRT_SIZE_MEASUREMENTS } from "./sizes";

const UI_SCALE = PRODUCTION_LEGACY_UI_UNITS_PER_CM;

/** M 號胸寬基準（與模板視覺校準一致） */
export const GARMENT_CHEST_CM_M = ADULT_TSHIRT_SIZE_MEASUREMENTS.find(
  (r) => r.size === "M",
)!.chestCm;
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

/** 匯出／inspector 用（固定 35×50 cm） */
export function getPrintAreaCmBounds(): PrintAreaCmBounds {
  return getProductionPrintAreaCm();
}

/** 設計器預覽藍框（正面 35×50、背面 38×45） */
export function getDesignerPrintAreaCmBounds(side: Side): PrintAreaCmBounds {
  const { widthCm, heightCm } = getRuntimeTemplatePrintArea(side);
  return { width: widthCm, height: heightCm };
}

/**
 * 模板 overlay：1 cm（物理）→ px @ 1024×1536 畫布。
 * Designer / Preview / Mockup 圖層渲染共用。
 */
export function getOverlayPxPerCm(): number {
  return getRuntimeTemplatePxPerCm();
}

/** 印刷區（cm）→ 模板畫布上的寬高比例 */
export function getPrintAreaCmToTemplateContainerPct(
  printArea: PrintAreaCmBounds = getPrintAreaCmBounds(),
  containerWidth: number = getRuntimeTemplateCanvas().widthPx,
  containerHeight: number = getRuntimeTemplateCanvas().heightPx,
): { widthPct: number; heightPct: number } {
  const pxPerCm = getOverlayPxPerCm();
  return {
    widthPct: (printArea.width * pxPerCm) / containerWidth,
    heightPct: (printArea.height * pxPerCm) / containerHeight,
  };
}

/** 圖層 cm → overlay px（依實際 print rect 寬度換算） */
export function cmToOverlayPx(
  cm: number,
  options: {
    printRectWidthPx: number;
    printAreaWidthCm?: number;
  },
): number {
  const printAreaWidthCm =
    options.printAreaWidthCm ?? getPrintAreaCmBounds().width;
  return cm * (options.printRectWidthPx / printAreaWidthCm);
}

/** overlay 上 1 cm 對應多少 px（由 print rect 寬度推導） */
export function getOverlayPxPerCmFromPrintRect(printRectWidthPx: number): number {
  return printRectWidthPx / getPrintAreaCmBounds().width;
}

export interface LayerRenderScaleDebugReport {
  garmentWidthCm: number;
  printAreaWidthCm: number;
  textLayerWidthCm: number;
  templatePxPerCm: number;
  printAreaWidthPx: number;
  layerWidthPx: number;
  layerToPrintAreaRatio: number;
  layerToGarmentChestRatio: number;
}

/** 開發用：追蹤 cm → overlay px 換算是否一致 */
export function debugLayerRenderScale(
  layerWidthCm: number,
  garmentChestCm: number = GARMENT_CHEST_CM_M,
): LayerRenderScaleDebugReport {
  const printArea = getPrintAreaCmBounds();
  const templatePxPerCm = getOverlayPxPerCm();
  const { widthPct } = getPrintAreaCmToTemplateContainerPct(printArea);
  const canvas = getRuntimeTemplateCanvas();
  const printAreaWidthPx =
    canvas.widthPx * widthPct;
  const layerWidthPx = cmToOverlayPx(layerWidthCm, {
    printRectWidthPx: printAreaWidthPx,
  });
  const report: LayerRenderScaleDebugReport = {
    garmentWidthCm: garmentChestCm,
    printAreaWidthCm: printArea.width,
    textLayerWidthCm: layerWidthCm,
    templatePxPerCm,
    printAreaWidthPx: Math.round(printAreaWidthPx * 100) / 100,
    layerWidthPx: Math.round(layerWidthPx * 100) / 100,
    layerToPrintAreaRatio: layerWidthCm / printArea.width,
    layerToGarmentChestRatio: layerWidthCm / garmentChestCm,
  };
  if (process.env.NODE_ENV === "development") {
    console.log("[LayerRenderScale]", report);
  }
  return report;
}

export function readLayerProductionRectMm(layer: DesignLayer): ProductionRectMm {
  const rect = getLayerEffectiveCmRect(layer);
  return {
    x_mm: legacyCmFieldToMm(rect.x_cm),
    y_mm: legacyCmFieldToMm(rect.y_cm),
    width_mm: legacyCmFieldToMm(rect.width_cm),
    height_mm: legacyCmFieldToMm(rect.height_cm),
  };
}

export function patchLayerFromProductionMm<T extends DesignLayer>(
  layer: T,
  patch: Partial<ProductionRectMm>,
): T {
  const next = { ...layer } as T & Partial<ProductionRectMm>;
  if (patch.x_mm != null) next.x_cm = mmToLegacyCmField(patch.x_mm);
  if (patch.y_mm != null) next.y_cm = mmToLegacyCmField(patch.y_mm);
  if (patch.width_mm != null) next.width_cm = mmToLegacyCmField(patch.width_mm);
  if (patch.height_mm != null) next.height_cm = mmToLegacyCmField(patch.height_mm);
  return next as T;
}

export { getProductionPrintAreaMm };

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
  if (layer.type === "image" || layer.type === "shape") {
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

/** Production mm → Preview overlay %（設計器用） */
export function layerProductionRectToPercentStyle(
  rect: ProductionRectMm,
  printArea = getProductionPrintAreaMm(),
) {
  return {
    left: `${(rect.x_mm / printArea.width_mm) * 100}%`,
    top: `${(rect.y_mm / printArea.height_mm) * 100}%`,
    width: `${(rect.width_mm / printArea.width_mm) * 100}%`,
    height: `${(rect.height_mm / printArea.height_mm) * 100}%`,
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
