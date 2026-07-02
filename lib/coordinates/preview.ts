/**
 * Preview Coordinate System
 * ─────────────────────────
 * 設計器主畫布 + Flat Shirt 右側預覽（`getPrintAreaContainerStyle`）。
 * 圖層 mm 不變；overlay 框線由 print-area-offset + garment 單一基準定位。
 */

import type { Side } from "../constants";
import type { ApparelSize } from "../sizes";
import { getDesignerBlueVisualContainerPct } from "../garment-visual-profile";
import {
  getRuntimeTemplateCanvas,
  getRuntimeTemplatePlacement,
  getRuntimeTemplatePxPerCm,
} from "../template-profile/runtime";
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
import { getGarmentVisualRenderScale } from "../garment-visual-profile";
import { getPrintAreaCmToTemplateContainerPct } from "../design-cm";
import { buildUiPrintAreaContainerStyle } from "./ui-print-offset";

export const PREVIEW_CONTAINER = {
  get width(): number {
    return getRuntimeTemplateCanvas().widthPx;
  },
  get height(): number {
    return getRuntimeTemplateCanvas().heightPx;
  },
};

export const PREVIEW_SIDES = ["front", "back"] as const;
export type PreviewSide = (typeof PREVIEW_SIDES)[number];

export const PREVIEW_REFERENCE_TRANSFORM = "translate(-50%, -50%)" as const;

const DEFAULT_PREVIEW_SIZE: ApparelSize = "M";

/**
 * Preview 藍框 DOM 縮放：與 ShirtVisualScale 同源 Garment Visual Render scale。
 * 不影響 layer cm、export、production。
 */
export function getPreviewPrintAreaScale(size: ApparelSize | string): number {
  return getGarmentVisualRenderScale(size);
}

/**
 * Preview overlay：1 mm（production）→ UI px。
 * templatePxPerCm / 10 → 12.24 px/cm → 1.224 px/mm。
 */
export const PREVIEW_UI_UNITS_PER_MM: number = 12.24 / 10;

/** Preview 畫布上 1 cm（物理）對應的 px */
export function getPreviewPxPerCm(): number {
  return getRuntimeTemplatePxPerCm();
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
  const placement = getRuntimeTemplatePlacement();
  const size = options?.size ?? DEFAULT_PREVIEW_SIZE;
  if (side === "front" && size === DEFAULT_PREVIEW_SIZE) {
    return placement.reference;
  }
  return getGarmentPrintReference({
    side,
    size,
    containerHeight: placement.containerCenter.y * 2,
  });
}

export function getPreviewPrintAreaContainerPct(
  printArea: ProductionPrintAreaMm = getProductionPrintAreaMm(),
): { widthPct: number; heightPct: number } {
  const canvas = getRuntimeTemplateCanvas();
  return getPrintAreaCmToTemplateContainerPct(
    {
      width: printArea.width_mm / 10,
      height: printArea.height_mm / 10,
    },
    canvas.widthPx,
    canvas.heightPx,
  );
}

/** 設計器藍框比例（Garment Visual Profile × Designer Print Area Config cm） */
export function getPreviewPrintAreaContainerPctForSide(
  side: PreviewSide = "front",
  size: ApparelSize | string = DEFAULT_PREVIEW_SIZE,
): { widthPct: number; heightPct: number } {
  void side;
  const canvas = getRuntimeTemplateCanvas();
  return getDesignerBlueVisualContainerPct(
    size,
    canvas.widthPx,
    canvas.heightPx,
  );
}

export function getPreviewPrintAreaContainerStyle(
  side: PreviewSide = "front",
  options?: PreviewPrintPositionOptions,
): PreviewContainerStyle {
  const size = options?.size ?? DEFAULT_PREVIEW_SIZE;
  const { widthPct, heightPct } = getPreviewPrintAreaContainerPctForSide(
    side,
    size,
  );
  const ref = getPreviewPrintReference(side, options);
  return buildUiPrintAreaContainerStyle(
    ref,
    widthPct,
    heightPct,
    PREVIEW_REFERENCE_TRANSFORM,
  );
}

export function getPreviewContainerAspectRatio(): string {
  const canvas = getRuntimeTemplateCanvas();
  return `${canvas.widthPx} / ${canvas.heightPx}`;
}

export function getPreviewContainerWidthOverHeight(): number {
  return getRuntimeTemplateCanvas().aspectRatio;
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
