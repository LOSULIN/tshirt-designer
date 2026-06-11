/**
 * Mockup Coordinate System
 * ────────────────────────
 * 平面 mockup PNG 匯出 + 模特預覽 UI。
 * 與 Preview 分離；UI 框線同樣套用 ui-print-offset。
 */

import type { Side } from "../constants";
import { getGarmentPrintReference } from "./garment";
import {
  getProductionPrintAreaMm,
  type ProductionPrintAreaMm,
  type ProductionRectMm,
} from "./production";
import {
  type PreviewPrintPositionOptions,
  isGarmentPreviewPositionMode,
  resolvePreviewPrintPositionMode,
} from "./preview-position-mode";
import {
  buildUiPrintAreaContainerStyle,
  resolveUiPrintReference,
  UI_PRINT_REF_BASE_Y,
} from "./ui-print-offset";

export const MOCKUP_EXPORT_SCALE = 2;

export const MOCKUP_FLAT_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

export const MOCKUP_MODEL_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

/** 平面 mockup 額外 Y 微調（疊加 UI_GLOBAL；UI 若走 Preview 則改 global 即可） */
export const MOCKUP_FLAT_PRINT_AREA_CENTER_OFFSET_Y_PX = 0;

/** 模特預覽額外 Y 微調（疊加 UI_GLOBAL） */
export const MOCKUP_MODEL_PRINT_AREA_CENTER_OFFSET_Y_PX = 0;

/** 模特預覽基準錨點（0~1，不含 offset） */
export const MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE = {
  front: 0.48,
  back: 0.5,
} as const;

export const MOCKUP_SIDES = ["front", "back"] as const;
export type MockupSide = (typeof MOCKUP_SIDES)[number];

export const MOCKUP_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

export interface MockupContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MockupContainerStyle {
  left: string;
  top: string;
  transform: string;
  width: string;
  height: string;
}

function getMockupContainer(mode: "flat" | "model") {
  return mode === "model" ? MOCKUP_MODEL_CONTAINER : MOCKUP_FLAT_CONTAINER;
}

function getMockupPrintReference(
  side: MockupSide,
  mode: "flat" | "model",
): { x: number; y: number } {
  const container = getMockupContainer(mode);
  if (mode === "model") {
    return resolveUiPrintReference(
      MOCKUP_MODEL_PRINT_AREA_CENTER_OFFSET_Y_PX,
      container.height,
      MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE[side],
    );
  }
  return resolveUiPrintReference(
    MOCKUP_FLAT_PRINT_AREA_CENTER_OFFSET_Y_PX,
    container.height,
    UI_PRINT_REF_BASE_Y,
  );
}

/** @deprecated 請用 getFlatMockupPrintReference() */
export const MOCKUP_FLAT_PRINT_REFERENCE_BY_SIDE = {
  get front() {
    return getFlatMockupPrintReference("front");
  },
  get back() {
    return getFlatMockupPrintReference("back");
  },
} as const;

/** @deprecated 請用 getModelMockupPrintReference() */
export const MOCKUP_MODEL_PRINT_REFERENCE_BY_SIDE = {
  get front() {
    return getModelMockupPrintReference("front");
  },
  get back() {
    return getModelMockupPrintReference("back");
  },
} as const;

export function getFlatMockupPrintReference(side: MockupSide = "front") {
  return getMockupPrintReference(side, "flat");
}

export function getModelMockupPrintReference(side: MockupSide = "front") {
  return getMockupPrintReference(side, "model");
}

function getMockupPrintAreaContainerPct(
  containerWidth: number,
  containerHeight: number,
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): { widthPct: number; heightPct: number } {
  return {
    widthPct: printArea.width_mm / containerWidth,
    heightPct: printArea.height_mm / containerHeight,
  };
}

function resolveMockupOverlayReference(
  side: MockupSide,
  mode: "flat" | "model",
  options?: PreviewPrintPositionOptions,
) {
  const positionMode = resolvePreviewPrintPositionMode(options?.mode);
  if (isGarmentPreviewPositionMode(positionMode) && options?.size) {
    const container = getMockupContainer(mode);
    return getGarmentPrintReference({
      side,
      size: options.size,
      containerHeight: container.height,
    });
  }
  return getMockupPrintReference(side, mode);
}

function buildMockupContainerStyle(
  side: MockupSide,
  mode: "flat" | "model",
  options?: PreviewPrintPositionOptions,
): MockupContainerStyle {
  const container = getMockupContainer(mode);
  const { widthPct, heightPct } = getMockupPrintAreaContainerPct(
    container.width,
    container.height,
  );
  const ref = resolveMockupOverlayReference(side, mode, options);
  return buildUiPrintAreaContainerStyle(
    ref,
    widthPct,
    heightPct,
    MOCKUP_REFERENCE_TRANSFORM,
  );
}

/** 模特預覽 UI — Used by: ModelDesignPreview, ModelTemplatePlaceholder */
export function getModelMockupPrintAreaContainerStyle(
  side: MockupSide = "front",
  options?: PreviewPrintPositionOptions,
): MockupContainerStyle {
  return buildMockupContainerStyle(side, "model", options);
}

/** 平面 mockup 預覽／匯出 PNG */
export function getFlatMockupPrintAreaContainerStyle(
  side: MockupSide = "front",
): MockupContainerStyle {
  return buildMockupContainerStyle(side, "flat");
}

export function getFlatMockupPrintAreaRectPx(
  containerWidth: number,
  containerHeight: number,
  side: MockupSide = "front",
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): MockupContainerRect {
  const { widthPct, heightPct } = getMockupPrintAreaContainerPct(
    containerWidth,
    containerHeight,
    printArea,
  );
  const ref = getMockupPrintReference(side, "flat");
  const width = widthPct * containerWidth;
  const height = heightPct * containerHeight;
  const centerX = ref.x * containerWidth;
  const centerY = ref.y * containerHeight;

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
  };
}

export function productionRectToMockupCanvasPx(
  rect: ProductionRectMm,
  printRect: MockupContainerRect,
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
} {
  const pxPerMmX = printRect.width / printArea.width_mm;
  const pxPerMmY = printRect.height / printArea.height_mm;

  return {
    centerX:
      printRect.left + (rect.x_mm + rect.width_mm / 2) * pxPerMmX,
    centerY:
      printRect.top + (rect.y_mm + rect.height_mm / 2) * pxPerMmY,
    width: rect.width_mm * pxPerMmX,
    height: rect.height_mm * pxPerMmY,
  };
}

export type { Side };
