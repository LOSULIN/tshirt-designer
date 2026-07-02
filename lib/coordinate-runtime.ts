/**
 * Unified Coordinate Runtime — Step 12.4A Foundation
 * ────────────────────────────────────────────────────
 * 唯一座標換算 API 入口（本步僅建立；既有 Runtime 尚未切換）。
 * 包裝現有邏輯，不改數學、不改回傳。
 */

import type { Side } from "./constants";
import {
  mmToLegacyCmField,
  PRODUCTION_PRINT_AREA_MM,
} from "./coordinates/production-constants";
import {
  getLayerEffectiveCmRect,
  getPrintAreaCmBounds,
  type LayerCmRect,
  type PrintAreaCmBounds,
} from "./design-cm";
import { resolveGarmentPrintAreaCm } from "./garment-anchor-runtime";
import {
  getLayerExportCmRect,
  type MockupContainerRectPx,
} from "./export-coordinates";
import { getTextLayerCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

/** Layer cm rect 解析用途（對應各 Runtime 現行讀取路徑） */
export type LayerCmRectPurpose =
  | "designer"
  | "preview"
  | "mockup"
  | "export"
  | "production";

/** Print area cm 解析用途（對應各 Runtime 現行分母） */
export type CoordinateRuntime =
  | "designer"
  | "preview"
  | "mockup"
  | "export"
  | "production";

/** mapLayerCmRect 目標矩形（export canvas 或 mockup print rect） */
export interface CoordinateTargetRectPx {
  width: number;
  height: number;
  left?: number;
  top?: number;
}

export interface CssPercentStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

export interface MappedLayerRectPx {
  /** 左上角 x（export 路徑） */
  x: number;
  /** 左上角 y（export 路徑） */
  y: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  pxPerCmX: number;
  pxPerCmY: number;
}

/**
 * 統一取得 layer 真正使用的 cm rect。
 * 目前邏輯與各 Runtime 既有函式完全一致。
 */
export function resolveLayerCmRect(
  layer: DesignLayer,
  options: { purpose: LayerCmRectPurpose },
): LayerCmRect {
  const { purpose } = options;

  if (purpose === "designer") {
    if (layer.type === "text") {
      return getTextLayerCmRect(layer);
    }
    return getLayerEffectiveCmRect(layer);
  }

  if (purpose === "preview") {
    return getLayerEffectiveCmRect(layer);
  }

  // mockup / export / production — 沿用 export 讀取路徑
  return getLayerExportCmRect(layer);
}

/**
 * 統一取得 print area cm bounds（% 分母 / 線性映射分母）。
 * 目前回傳與各 Runtime 既有來源完全一致。
 */
export function resolvePrintAreaCm(params: {
  runtime: CoordinateRuntime;
  side?: Side;
  /** Garment 尺碼；designer / mockup / export / preview 有 size 時使用 Blue 印刷區 */
  size?: string;
}): PrintAreaCmBounds {
  const { runtime, side, size = "M" } = params;

  switch (runtime) {
    case "designer":
    case "mockup":
    case "export": {
      if (side == null) {
        throw new Error(
          `resolvePrintAreaCm: side is required for runtime "${runtime}"`,
        );
      }
      return resolveGarmentPrintAreaCm(size, side);
    }
    case "preview":
      if (side != null) {
        return resolveGarmentPrintAreaCm(size, side);
      }
      return getPrintAreaCmBounds();
    case "production":
      return {
        width: mmToLegacyCmField(PRODUCTION_PRINT_AREA_MM.width_mm),
        height: mmToLegacyCmField(PRODUCTION_PRINT_AREA_MM.height_mm),
      };
    default: {
      const _exhaustive: never = runtime;
      return _exhaustive;
    }
  }
}

/**
 * cm rect → 目標像素矩形（線性映射）。
 * 合併 mapLayerCmRectToExportPx / mapLayerCmRectToMockupPx 共同公式，數學不變。
 */
export function mapLayerCmRect(params: {
  layerRect: LayerCmRect;
  printArea: PrintAreaCmBounds;
  targetRect: CoordinateTargetRectPx;
}): MappedLayerRectPx {
  const { layerRect, printArea, targetRect } = params;
  const originX = targetRect.left ?? 0;
  const originY = targetRect.top ?? 0;

  const pxPerCmX = targetRect.width / printArea.width;
  const pxPerCmY = targetRect.height / printArea.height;
  const width = layerRect.width_cm * pxPerCmX;
  const height = layerRect.height_cm * pxPerCmY;

  return {
    x: layerRect.x_cm * pxPerCmX,
    y: layerRect.y_cm * pxPerCmY,
    centerX:
      originX + (layerRect.x_cm + layerRect.width_cm / 2) * pxPerCmX,
    centerY:
      originY + (layerRect.y_cm + layerRect.height_cm / 2) * pxPerCmY,
    width,
    height,
    pxPerCmX,
    pxPerCmY,
  };
}

/** 將 mockup print rect 轉為 CoordinateTargetRectPx */
export function mockupPrintRectToTargetRect(
  printRect: MockupContainerRectPx,
): CoordinateTargetRectPx {
  return {
    left: printRect.left,
    top: printRect.top,
    width: printRect.width,
    height: printRect.height,
  };
}

/** 將 export canvas 尺寸轉為 CoordinateTargetRectPx（原點 0,0） */
export function exportCanvasSizeToTargetRect(canvasSizePx: {
  widthPx: number;
  heightPx: number;
}): CoordinateTargetRectPx {
  return {
    width: canvasSizePx.widthPx,
    height: canvasSizePx.heightPx,
  };
}

/**
 * Layer cm rect → CSS %（與 PrintAreaElement / layerCmToPercentStyle 相同公式）。
 */
export function toCssPercent(params: {
  layerRect: LayerCmRect;
  printArea: PrintAreaCmBounds;
}): CssPercentStyle {
  const { layerRect, printArea } = params;
  return {
    left: `${(layerRect.x_cm / printArea.width) * 100}%`,
    top: `${(layerRect.y_cm / printArea.height) * 100}%`,
    width: `${(layerRect.width_cm / printArea.width) * 100}%`,
    height: `${(layerRect.height_cm / printArea.height) * 100}%`,
  };
}
