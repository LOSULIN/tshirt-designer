/**
 * Garment Constraint UX Labels — Step 13.1C（純呈現層）
 */

import type { Side } from "./constants";
import type { PrintAreaCmBounds } from "./design-cm";
import {
  getDesignerBackRecommendedPrintArea,
  getDesignerRecommendedPrintArea,
} from "./designer-print-area-config";
import { formatGarmentPrintAreaCmPair } from "./garment-constraint-ux";

export interface ConstraintOverlayUxLabels {
  currentPrintAreaTitle: string;
  currentPrintAreaDimension: string;
  recommendedAreaTitle: string;
  recommendedAreaDimension: string;
  printableRegionTooltip: string;
  exclusionRegionTooltip: string;
  compactHeader: string;
}

export function resolveRecommendedPrintAreaBounds(
  side: Side,
  size: string,
): PrintAreaCmBounds {
  const row =
    side === "back"
      ? getDesignerBackRecommendedPrintArea(size)
      : getDesignerRecommendedPrintArea(size);
  return { width: row.widthCm, height: row.heightCm };
}

export function formatConstraintDimensionCm(bounds: PrintAreaCmBounds): string {
  return `${formatGarmentPrintAreaCmPair(bounds)} cm`;
}

export function buildConstraintOverlayUxLabels(params: {
  side: Side;
  size: string;
  workspacePrintArea: PrintAreaCmBounds;
  garmentPrintArea: PrintAreaCmBounds;
  recommendedPrintArea?: PrintAreaCmBounds;
}): ConstraintOverlayUxLabels {
  const {
    side,
    size,
    garmentPrintArea,
    recommendedPrintArea = resolveRecommendedPrintAreaBounds(side, size),
  } = params;

  const currentPrintAreaDimension = formatConstraintDimensionCm(garmentPrintArea);
  const recommendedAreaDimension =
    formatConstraintDimensionCm(recommendedPrintArea);

  return {
    currentPrintAreaTitle: "Current Print Area",
    currentPrintAreaDimension,
    recommendedAreaTitle: "Recommended Area",
    recommendedAreaDimension,
    compactHeader: `${currentPrintAreaDimension} · ${size}`,
    printableRegionTooltip: [
      `尺碼 ${size}（${side === "front" ? "正面" : "背面"}）`,
      `藍框視覺固定；100% = ${currentPrintAreaDimension}`,
      `Current Print Area：${currentPrintAreaDimension}`,
      `Recommended Area：${recommendedAreaDimension}`,
    ].join("\n"),
    exclusionRegionTooltip: `不可印區域：超出尺碼 ${size} 可印範圍（${currentPrintAreaDimension}）`,
  };
}
