/**
 * Designer Geometry V2 — Builder QA calibration parameters (Phase 69.5).
 *
 * Tunable constants for visual UA35001 alignment.
 * Does NOT modify factory print offsets (front 7cm / back 5cm).
 */

import type { Side } from "@/lib/constants";

/** Pre-69.5 baseline — used for before/after QA comparison only. */
export const GEOMETRY_V2_CALIBRATION_BASELINE = {
  collarShoulderExpandRatio: 1.28,
  collarShoulderBlendRatio: 0.55,
  collarBottomYOffsetPx: { front: 0, back: 0 } as Record<Side, number>,
  productMasterUseMedianCollar: false,
  productMasterVisualBiasPx: { front: 0, back: 0 } as Record<Side, number>,
} as const;

/**
 * Collar bottom width expansion threshold toward shoulder breadth.
 * Lower = collar detected slightly lower on torso (closer to visible hem).
 */
export const GEOMETRY_V2_COLLAR_SHOULDER_EXPAND_RATIO = 1.2;

/**
 * Shoulder width blend for collar-bottom scan target.
 */
export const GEOMETRY_V2_COLLAR_SHOULDER_BLEND_RATIO = 0.5;

/**
 * Visual QA Y-offset applied after anatomy scan (px, positive = down).
 * Phase 70.3: Front tuned to UA35001 product photo collar hem + 7cm print (not V1 anchor).
 * Back unchanged — already matches 5cm factory offset visually.
 */
export const GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX: Record<Side, number> = {
  front: 125,
  back: 106,
};

/**
 * Use median collar Y when building Product Master (robust to lighting variance).
 */
export const GEOMETRY_V2_PRODUCT_MASTER_USE_MEDIAN_COLLAR = true;

/**
 * Optional visual bias after aggregation — disabled when factory-origin calibration
 * already encodes collar-bottom + 7cm/5cm print offsets.
 */
export const GEOMETRY_V2_PRODUCT_MASTER_VISUAL_BIAS_PX: Record<Side, number> = {
  front: 0,
  back: 0,
};

export interface CollarDerivationCalibration {
  shoulderExpandRatio: number;
  shoulderBlendRatio: number;
  collarBottomYOffsetPx: Record<Side, number>;
}

export function getActiveCollarDerivationCalibration(): CollarDerivationCalibration {
  return {
    shoulderExpandRatio: GEOMETRY_V2_COLLAR_SHOULDER_EXPAND_RATIO,
    shoulderBlendRatio: GEOMETRY_V2_COLLAR_SHOULDER_BLEND_RATIO,
    collarBottomYOffsetPx: GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX,
  };
}

export function getBaselineCollarDerivationCalibration(): CollarDerivationCalibration {
  return {
    shoulderExpandRatio: GEOMETRY_V2_CALIBRATION_BASELINE.collarShoulderExpandRatio,
    shoulderBlendRatio: GEOMETRY_V2_CALIBRATION_BASELINE.collarShoulderBlendRatio,
    collarBottomYOffsetPx: GEOMETRY_V2_CALIBRATION_BASELINE.collarBottomYOffsetPx,
  };
}

export function applyCollarBottomCalibration(y: number, side: Side): number {
  return Math.round(y + GEOMETRY_V2_COLLAR_BOTTOM_Y_OFFSET_PX[side]);
}

export function applyCollarBottomCalibrationWith(
  y: number,
  side: Side,
  calibration: CollarDerivationCalibration,
): number {
  return Math.round(y + calibration.collarBottomYOffsetPx[side]);
}

export const GEOMETRY_CALIBRATION_OUTPUT_DIR =
  "debug/geometry-calibration" as const;

export const GEOMETRY_CALIBRATION_GOAL_NOTE =
  "Phase 70.3: UA35001 product photo visual collar-bottom + frozen 7cm (front) / 5cm (back). " +
  "Not aligned to V1 template anchor (386px).";
