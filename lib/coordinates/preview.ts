/**
 * Preview Coordinate System
 * ─────────────────────────
 * 設計器主畫布 + Flat Shirt 右側預覽（`getPrintAreaContainerStyle`）。
 * 圖層 mm 不變；overlay 框線支援 canvas / garment 兩種定位模式。
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
  isGarmentPreviewPositionMode,
  resolvePreviewPrintPositionMode,
} from "./preview-position-mode";
import { getShirtScale, getShirtScaleTransform } from "../shirtScale";
import { getTemplatePxPerCm } from "../shirt-template";
import {
  buildUiPrintAreaContainerStyle,
  resolveUiPrintReference,
  UI_PRINT_REF_BASE_Y,
} from "./ui-print-offset";

export const PREVIEW_CONTAINER = {
  width: 1024,
  height: 1536,
} as const;

/** Preview 專用 Y 微調（canvas 模式；疊加 UI_GLOBAL） */
export const PREVIEW_PRINT_AREA_CENTER_OFFSET_Y_PX = 0;

export const PREVIEW_SIDES = ["front", "back"] as const;
export type PreviewSide = (typeof PREVIEW_SIDES)[number];

export const PREVIEW_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

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

function getCanvasPreviewPrintReference(side: PreviewSide = "front") {
  void side;
  return resolveUiPrintReference(
    PREVIEW_PRINT_AREA_CENTER_OFFSET_Y_PX,
    PREVIEW_CONTAINER.height,
    UI_PRINT_REF_BASE_Y,
  );
}

/**
 * 依模式解析印刷區錨點
 * - canvas：固定 ref.y + UI_GLOBAL（預設，與 size 無關）
 * - garment：領口 + 8cm（隨 size scale），需傳入 size
 */
export function getPreviewPrintReference(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
) {
  const mode = resolvePreviewPrintPositionMode(options?.mode);
  if (isGarmentPreviewPositionMode(mode)) {
    if (!options?.size) {
      return getCanvasPreviewPrintReference(side);
    }
    return getGarmentPrintReference({
      side,
      size: options.size,
      containerHeight: PREVIEW_CONTAINER.height,
    });
  }
  return getCanvasPreviewPrintReference(side);
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
  const widthUnits = printArea.width_mm * PREVIEW_UI_UNITS_PER_MM;
  const heightUnits = printArea.height_mm * PREVIEW_UI_UNITS_PER_MM;
  return {
    widthPct: widthUnits / PREVIEW_CONTAINER.width,
    heightPct: heightUnits / PREVIEW_CONTAINER.height,
  };
}

export function getPreviewPrintAreaContainerStyle(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
): PreviewContainerStyle {
  const { widthPct, heightPct } = getPreviewPrintAreaContainerPct();
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
