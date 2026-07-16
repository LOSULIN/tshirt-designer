/**
 * Mockup Visual Calibration — anatomy-based offset guidance (Phase 27.1).
 * Does not modify Factory Coordinate or Product Reference.
 */

import { ADULT_TSHIRT_TEMPLATE_PX_PER_CM } from "../template-metrics";
import { resolveFinalArtworkPlacement } from "./fine-calibration";
import type { ProductCalibration, ProductSide } from "./render-types";

/** Measured collar lowest Y @ 1024×1536 (Garment Anatomy Validation). */
export const MOCKUP_ANATOMY_COLLAR_Y = {
  designer: 494,
  productUA35001: 534,
} as const;

export const MOCKUP_VISUAL_OFFSET_PRESETS = [0, 10, 20, 30, 40, 50, 60] as const;

export const MOCKUP_VISUAL_COMPARE_OFFSETS = [0, 20, 30, 40, 50] as const;

export const MOCKUP_VISUAL_OFFSET_STEP = 5;

export const UA35001_RECOMMENDED_VISUAL_OFFSET_Y =
  MOCKUP_ANATOMY_COLLAR_Y.productUA35001 - MOCKUP_ANATOMY_COLLAR_Y.designer;

export interface MockupOffsetCandidateScore {
  offsetY: number;
  printTopY: number;
  gapFromProductCollarPx: number;
  gapFromProductCollarCm: number;
  matchesDesignerVisualGap: boolean;
  deltaFromAnatomyPx: number;
  score: number;
}

export interface MockupVisualCalibrationReport {
  designerCollarY: number;
  productCollarY: number;
  anatomyDeltaPx: number;
  anatomyDeltaCm: number;
  factoryPrintTopY: number;
  designerVisualGapPx: number;
  recommendedOffsetY: number;
  candidates: MockupOffsetCandidateScore[];
  bestOffsetY: number;
}

function scoreCandidate(
  offsetY: number,
  factoryPrintTopY: number,
  productCollarY: number,
  designerVisualGapPx: number,
  anatomyDeltaPx: number,
): MockupOffsetCandidateScore {
  const printTopY = factoryPrintTopY + offsetY;
  const gapFromProductCollarPx = printTopY - productCollarY;
  const gapFromProductCollarCm = gapFromProductCollarPx / ADULT_TSHIRT_TEMPLATE_PX_PER_CM;
  const matchesDesignerVisualGap =
    Math.abs(gapFromProductCollarPx - designerVisualGapPx) <= 1;
  const deltaFromAnatomyPx = Math.abs(offsetY - anatomyDeltaPx);
  const score = deltaFromAnatomyPx + (matchesDesignerVisualGap ? 0 : 8);
  return {
    offsetY,
    printTopY,
    gapFromProductCollarPx,
    gapFromProductCollarCm,
    matchesDesignerVisualGap,
    deltaFromAnatomyPx,
    score,
  };
}

export function buildMockupVisualCalibrationReport(
  calibration: ProductCalibration,
  side: ProductSide = "front",
  compareOffsets: readonly number[] = MOCKUP_VISUAL_COMPARE_OFFSETS,
): MockupVisualCalibrationReport {
  const factoryPlacement = resolveFinalArtworkPlacement(calibration, side);
  const factoryPrintTopY = factoryPlacement?.y ?? 472;
  const designerCollarY = MOCKUP_ANATOMY_COLLAR_Y.designer;
  const productCollarY = MOCKUP_ANATOMY_COLLAR_Y.productUA35001;
  const anatomyDeltaPx = productCollarY - designerCollarY;
  const designerVisualGapPx = factoryPrintTopY - designerCollarY;

  const candidates = compareOffsets.map((offsetY) =>
    scoreCandidate(
      offsetY,
      factoryPrintTopY,
      productCollarY,
      designerVisualGapPx,
      anatomyDeltaPx,
    ),
  );

  const best = [...candidates].sort((a, b) => a.score - b.score)[0];

  return {
    designerCollarY,
    productCollarY,
    anatomyDeltaPx,
    anatomyDeltaCm: anatomyDeltaPx / ADULT_TSHIRT_TEMPLATE_PX_PER_CM,
    factoryPrintTopY,
    designerVisualGapPx,
    recommendedOffsetY: anatomyDeltaPx,
    candidates,
    bestOffsetY: best?.offsetY ?? anatomyDeltaPx,
  };
}
