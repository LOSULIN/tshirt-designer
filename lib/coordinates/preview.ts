/**
 * Preview Coordinate System
 * ─────────────────────────
 * 設計器主畫布 + Flat Shirt 右側預覽（`getPrintAreaContainerStyle`）。
 * 圖層 mm 不變；overlay 框線由 print-area-offset + garment 單一基準定位。
 */

import type { Side } from "../constants";
import type { ApparelSize } from "../sizes";
import {
  getProductionPrintAreaMm,
  legacyCmFieldToMm,
  type ProductionPrintAreaMm,
  type ProductionRectMm,
} from "./production";
import { getGarmentPrintReference } from "./garment";
import {
  type PreviewPrintPositionMode,
  type PreviewPrintPositionOptions,
  resolvePreviewPrintPositionMode,
} from "./preview-position-mode";
import { getShirtScale, getShirtScaleTransform } from "../shirtScale";
import {
  getDesignerPrintAreaCmBounds,
  getPrintAreaCmToTemplateContainerPct,
} from "../design-cm";
import { getTemplatePxPerCm } from "../shirt-template";
import { buildUiPrintAreaContainerStyle } from "./ui-print-offset";

export const PREVIEW_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

export const PREVIEW_SIDES = ["front", "back"] as const;
export type PreviewSide = (typeof PREVIEW_SIDES)[number];

export const PREVIEW_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

const DEFAULT_PREVIEW_SIZE: ApparelSize = "M";

/**
 * Preview overlay：1 mm（production）→ UI px。
 * templatePxPerCm / 10 → 12.24 px/cm → 1.224 px/mm。
 */
export const PREVIEW_UI_UNITS_PER_MM = getTemplatePxPerCm() / 10;

/** Preview 畫布上 1 cm（物理）對應的 px */
export function getPreviewPxPerCm(): number {
  return getTemplatePxPerCm();
}

export type { PreviewPrintPositionMode, PreviewPrintPositionOptions };

export interface PreviewContainerStyle {
  left: string;
  top: string;
  transform: string;
  width: string;
  height: string;
}

export interface PreviewPercentStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

/**
 * 印刷區錨點：領口錨點 + PRINT_AREA_OFFSET_CM（隨尺碼 scale）
 * 預設 M 尺碼；canvas / garment 模式共用同一公式。
 */
export function getPreviewPrintReference(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  void resolvePreviewPrintPositionMode(options?.mode);
  return getGarmentPrintReference({
    side,
    size: options?.size ?? DEFAULT_PREVIEW_SIZE,
    containerHeight: PREVIEW_CONTAINER.height,
  });
}

/** @deprecated 請用 getPreviewPrintReference(side, options) */
export const PREVIEW_PRINT_REFERENCE_BY_SIDE = {
  get front() {
    return getPreviewPrintReference("front");
  },
  get back() {
    return getPreviewPrintReference("back");
  },
} as const;

export function getPreviewPrintAreaContainerPct(
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): { widthPct: number; heightPct: number } {
  return getPrintAreaCmToTemplateContainerPct(
    {
      width: printArea.width_mm / 10,
      height: printArea.height_mm / 10,
    },
    PREVIEW_CONTAINER.width,
    PREVIEW_CONTAINER.height,
  );
}

/** 設計器藍框比例（依面別最大印刷區） */
export function getPreviewPrintAreaContainerPctForSide(
  side: PreviewSide = "front",
): { widthPct: number; heightPct: number } {
  return getPrintAreaCmToTemplateContainerPct(
    getDesignerPrintAreaCmBounds(side),
    PREVIEW_CONTAINER.width,
    PREVIEW_CONTAINER.height,
  );
}

export function getPreviewPrintAreaContainerStyle(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
): PreviewContainerStyle {
  const { widthPct, heightPct } = getPreviewPrintAreaContainerPctForSide(side);
  const ref = getPreviewPrintReference(side, options);
  return buildUiPrintAreaContainerStyle(
    ref,
    widthPct,
    heightPct,
    PREVIEW_REFERENCE_TRANSFORM,
  );
}

export function getPreviewContainerAspectRatio(): string {
  return `${PREVIEW_CONTAINER.width} / ${PREVIEW_CONTAINER.height}`;
}

export function getPreviewContainerWidthOverHeight(): number {
  return PREVIEW_CONTAINER.width / PREVIEW_CONTAINER.height;
}

export function productionRectToPreviewPercent(
  rect: ProductionRectMm,
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): PreviewPercentStyle {
  return {
    left: `${(rect.x_mm / printArea.width_mm) * 100}%`,
    top: `${(rect.y_mm / printArea.height_mm) * 100}%`,
    width: `${(rect.width_mm / printArea.width_mm) * 100}%`,
    height: `${(rect.height_mm / printArea.height_mm) * 100}%`,
  };
}

export function getPreviewGarmentVisualScale(size: ApparelSize | string): number {
  return getShirtScale(size);
}

export function getPreviewGarmentVisualTransform(
  size: ApparelSize | string,
): string {
  return getShirtScaleTransform(size);
}

export function previewClientPointToProductionMm(
  clientX: number,
  clientY: number,
  printAreaEl: HTMLElement,
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): { x_mm: number; y_mm: number } {
  const rect = printAreaEl.getBoundingClientRect();
  const x_mm = ((clientX - rect.left) / rect.width) * printArea.width_mm;
  const y_mm = ((clientY - rect.top) / rect.height) * printArea.height_mm;
  return { x_mm, y_mm };
}

export function previewClientPointToLegacyCm(
  clientX: number,
  clientY: number,
  printAreaEl: HTMLElement,
): { x_cm: number; y_cm: number } {
  const { x_mm, y_mm } = previewClientPointToProductionMm(
    clientX,
    clientY,
    printAreaEl,
  );
  return {
    x_cm: x_mm / legacyCmFieldToMm(1),
    y_cm: y_mm / legacyCmFieldToMm(1),
  };
}

export type { Side };
