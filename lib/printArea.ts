/**
 * 印刷區與 shirt container（向後相容 facade）。
 *
 * - Production 真相：`lib/coordinates/production.ts`（mm）
 * - Preview UI：`lib/coordinates/preview.ts`
 * - Mockup：`lib/coordinates/mockup.ts`
 */

import { APPAREL_SIZES, type ApparelSize } from "./sizes";
import {
  getProductionPrintAreaCm,
  getProductionSafeAreaMm,
  mmToLegacyCmField,
  PRODUCTION_LEGACY_UI_UNITS_PER_CM,
  PRODUCTION_PRINT_AREA_MM,
  PRODUCTION_SAFE_MARGIN_RATIO,
} from "./coordinates/production";
import {
  getPreviewContainerAspectRatio,
  getPreviewContainerWidthOverHeight,
  getPreviewPrintAreaContainerPct,
  getPreviewPrintAreaContainerStyle,
  getPreviewPrintReference,
  PREVIEW_CONTAINER,
  PREVIEW_REFERENCE_TRANSFORM,
  PREVIEW_SIDES,
  PREVIEW_UI_UNITS_PER_MM,
  type PreviewPrintPositionOptions,
} from "./coordinates/preview";
export type {
  PreviewPrintPositionMode,
  PreviewPrintPositionOptions,
} from "./coordinates/preview-position-mode";
export {
  DEFAULT_PRINT_MODE,
  parsePreviewPrintPositionMode,
  resolvePreviewPrintPositionMode,
} from "./coordinates/preview-position-mode";
import {
  getUiPrintAreaContainerStyle,
  type UiPrintAreaView,
} from "./coordinates/ui-print-area";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "./coordinates/ui-print-offset";

export { getUiPrintAreaContainerStyle, type UiPrintAreaView };

export { UI_GLOBAL_PRINT_OFFSET_Y_PX };

const productionCm = getProductionPrintAreaCm();

/** 固定印刷規格（物理／設計／匯出） */
export const PRINT_AREA = {
  widthCm: productionCm.width,
  heightCm: productionCm.height,
} as const;

export const PRINT_AREA_WIDTH_CM = PRINT_AREA.widthCm;
export const PRINT_AREA_HEIGHT_CM = PRINT_AREA.heightCm;

export const PRINT_AREA_CM = {
  widthCm: PRINT_AREA.widthCm,
  heightCm: PRINT_AREA.heightCm,
} as const;

export const PRINT_SAFE_AREA_SPEC = {
  mode: "ratio" as const,
  marginRatio: PRODUCTION_SAFE_MARGIN_RATIO,
} as const;

/** @deprecated 請用 PRINT_SAFE_AREA_SPEC.marginRatio */
export const DESIGN_SAFE_MARGIN = PRINT_SAFE_AREA_SPEC.marginRatio;

export interface PrintAreaCmSize {
  width: number;
  height: number;
}

export interface PrintSafeAreaCm {
  x_cm: number;
  y_cm: number;
  width_cm: number;
  height_cm: number;
}

export function getPrintSafeAreaCm(
  printArea: PrintAreaCmSize = {
    width: PRINT_AREA.widthCm,
    height: PRINT_AREA.heightCm,
  },
): PrintSafeAreaCm {
  const safe = getProductionSafeAreaMm({
    width_mm: printArea.width * 10,
    height_mm: printArea.height * 10,
  });

  return {
    x_cm: mmToLegacyCmField(safe.x_mm),
    y_cm: mmToLegacyCmField(safe.y_mm),
    width_cm: mmToLegacyCmField(safe.width_mm),
    height_cm: mmToLegacyCmField(safe.height_mm),
  };
}

export const PRINT_COLLAR_OFFSET_CM = {
  front: 10,
  back: 10,
} as const;

/** @deprecated 請用 getPreviewPrintReference */
export const PRINT_REFERENCE_BY_SIDE = {
  get front() {
    return getPreviewPrintReference("front");
  },
  get back() {
    return getPreviewPrintReference("back");
  },
};

/** @deprecated 請用 getPreviewPrintReference */
export const PRINT_REFERENCE = {
  get x() {
    return getPreviewPrintReference("front").x;
  },
  get y() {
    return getPreviewPrintReference("front").y;
  },
};

export type PrintReferenceSide = (typeof PREVIEW_SIDES)[number];

export function getPrintReference(side: PrintReferenceSide = "front") {
  return getPreviewPrintReference(side);
}

export const PRINT_REFERENCE_TRANSFORM = PREVIEW_REFERENCE_TRANSFORM;

/** @deprecated 請用 production 的 PRODUCTION_LEGACY_UI_UNITS_PER_CM */
export const UI_SCALE = PRODUCTION_LEGACY_UI_UNITS_PER_CM;

export const SHIRT_CONTAINER_WIDTH = PREVIEW_CONTAINER.width;
export const SHIRT_CONTAINER_HEIGHT = PREVIEW_CONTAINER.height;

export interface PrintAreaContainerStyle {
  left: string;
  top: string;
  transform: string;
  width: string;
  height: string;
}

export interface PrintScale {
  widthPct: number;
  heightPct: number;
}

export function cmToUiUnits(cm: number): number {
  return cm * UI_SCALE;
}

export function getFixedPrintAreaUiSize(): { width: number; height: number } {
  return {
    width: PRODUCTION_PRINT_AREA_MM.width_mm * PREVIEW_UI_UNITS_PER_MM,
    height: PRODUCTION_PRINT_AREA_MM.height_mm * PREVIEW_UI_UNITS_PER_MM,
  };
}

export function getFixedPrintAreaContainerPct(): PrintScale {
  return getPreviewPrintAreaContainerPct();
}

export function getShirtContainerAspectRatio(): string {
  return getPreviewContainerAspectRatio();
}

export function getShirtContainerWidthOverHeight(): number {
  return getPreviewContainerWidthOverHeight();
}

export function getPrintAreaContainerStyle(
  side: PrintReferenceSide = "front",
  options?: PreviewPrintPositionOptions,
): PrintAreaContainerStyle {
  return getUiPrintAreaContainerStyle("editor", side, options);
}

export function getVisualPrintScale(_size?: ApparelSize): PrintScale {
  return getFixedPrintAreaContainerPct();
}

export function getPrintScale(_size?: ApparelSize): PrintScale {
  return getFixedPrintAreaContainerPct();
}

export function getBaselineNaturalPrintScale(): PrintScale {
  return getFixedPrintAreaContainerPct();
}

export function getPrintAreaVisualAreaRatio(_size?: ApparelSize): number {
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  return widthPct * heightPct;
}

export function getPrintScaleRankOrder(): ApparelSize[] {
  return [...APPAREL_SIZES];
}

export function getUiMockupAspectRatio(): string {
  return getShirtContainerAspectRatio();
}

export function getUiMockupWidthOverHeight(): number {
  return getShirtContainerWidthOverHeight();
}

export function getPrintAreaUiContainerStyle(): PrintAreaContainerStyle {
  return getPrintAreaContainerStyle();
}
