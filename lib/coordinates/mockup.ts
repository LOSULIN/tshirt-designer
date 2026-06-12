/**
 * Mockup Coordinate System
 * ────────────────────────
 * 平面 mockup PNG 匯出 + 模特預覽 UI。
 * 印刷區定位與 Preview 共用 print-area-offset + garment 基準。
 */

import type { Side } from "../constants";
import {
  getDesignerPrintAreaCmBounds,
  getPrintAreaCmToTemplateContainerPct,
} from "../design-cm";
import type { ApparelSize } from "../sizes";
import { getGarmentPrintReference } from "./garment";
import {
  getProductionPrintAreaMm,
  type ProductionPrintAreaMm,
  type ProductionRectMm,
} from "./production";
import {
  type PreviewPrintPositionOptions,
  resolvePreviewPrintPositionMode,
} from "./preview-position-mode";
import { buildUiPrintAreaContainerStyle } from "./ui-print-offset";

export const MOCKUP_EXPORT_SCALE = 2;

export const MOCKUP_FLAT_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

export const MOCKUP_MODEL_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

/** @deprecated 模特預覽已改為 garment 基準；保留常數供舊校準腳本參考 */
export const MOCKUP_MODEL_PRINT_REF_BASE_Y_BY_SIDE = {
  front: 0.48,
  back: 0.5,
} as const;

export const MOCKUP_SIDES = ["front", "back"] as const;
export type MockupSide = (typeof MOCKUP_SIDES)[number];

export const MOCKUP_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

const DEFAULT_MOCKUP_SIZE: ApparelSize = "M";

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

function resolveGarmentPrintReference(
  side: MockupSide,
  mode: "flat" | "model",
  options?: PreviewPrintPositionOptions,
) {
  const container = getMockupContainer(mode);
  void resolvePreviewPrintPositionMode(options?.mode);
  return getGarmentPrintReference({
    side,
    size: options?.size ?? DEFAULT_MOCKUP_SIZE,
    containerHeight: container.height,
  });
}

/** @deprecated 請用 resolveGarmentPrintReference / getGarmentPrintReference */
export function getFlatMockupPrintReference(
  side: MockupSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  return resolveGarmentPrintReference(side, "flat", options);
}

/** @deprecated 請用 resolveGarmentPrintReference / getGarmentPrintReference */
export function getModelMockupPrintReference(
  side: MockupSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  return resolveGarmentPrintReference(side, "model", options);
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

function getMockupPrintAreaContainerPct(
  containerWidth: number,
  containerHeight: number,
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): { widthPct: number; heightPct: number } {
  return getPrintAreaCmToTemplateContainerPct(
    {
      width: printArea.width_mm / 10,
      height: printArea.height_mm / 10,
    },
    containerWidth,
    containerHeight,
  );
}

function getDesignerMockupPrintAreaContainerPct(
  side: MockupSide,
  containerWidth: number,
  containerHeight: number,
): { widthPct: number; heightPct: number } {
  return getPrintAreaCmToTemplateContainerPct(
    getDesignerPrintAreaCmBounds(side),
    containerWidth,
    containerHeight,
  );
}

function buildMockupContainerStyle(
  side: MockupSide,
  mode: "flat" | "model",
  options?: PreviewPrintPositionOptions,
): MockupContainerStyle {
  const container = getMockupContainer(mode);
  const { widthPct, heightPct } = getDesignerMockupPrintAreaContainerPct(
    side,
    container.width,
    container.height,
  );
  const ref = resolveGarmentPrintReference(side, mode, options);
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
  options?: PreviewPrintPositionOptions,
): MockupContainerStyle {
  return buildMockupContainerStyle(side, "flat", options);
}

export function getFlatMockupPrintAreaRectPx(
  containerWidth: number,
  containerHeight: number,
  side: MockupSide = "front",
  size: ApparelSize | string = DEFAULT_MOCKUP_SIZE,
): MockupContainerRect {
  const { widthPct, heightPct } = getDesignerMockupPrintAreaContainerPct(
    side,
    containerWidth,
    containerHeight,
  );
  const ref = getGarmentPrintReference({
    side,
    size,
    containerHeight: MOCKUP_FLAT_CONTAINER.height,
  });
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
