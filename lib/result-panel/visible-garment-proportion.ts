/**
 * ResultPanel — Visible Garment Proportion (composition only).
 *
 * Adjusts which region of the composed mockup is visible in the panel.
 * Does NOT warp, scale, or modify UA PNG / placement / calibration.
 *
 * Pilot sizes: 90, 160, M, XXXL
 */

import type { Size } from "@/lib/constants";
import { findProductSizeRow } from "@/lib/product-size-config";

export const VISIBLE_PROPORTION_BASELINE_SIZE = "M" as const;

/** Blend official length ratio into visible height (composition, not body warp). */
const LENGTH_BLEND = 0.48;
/** Blend official chest ratio into frame width feel. */
const CHEST_BLEND = 0.32;

const PILOT_SIZES = new Set<Size>(["90", "160", "M", "XXXL"]);

export interface VisibleGarmentProportionProfile {
  sizeCode: string;
  /** 0.72–1.0 — fraction of source image height shown (viewport crop). */
  visibleHeightRatio: number;
  /** Collar anchor in source image space (% from top). */
  topAnchorPercent: number;
  /** Frame width / height — affects how much lateral garment is in view. */
  frameAspectRatio: number;
  /** Stage padding below frame (% of frame width) — breathing room for large sizes. */
  stagePaddingBottomPercent: number;
  /** Stage side inset (% each side). */
  sideMarginPercent: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function resolveLengthChestRatios(size: string): { length: number; chest: number } {
  const baseline = findProductSizeRow(VISIBLE_PROPORTION_BASELINE_SIZE);
  const current = findProductSizeRow(size);
  if (!baseline || !current) {
    return { length: 1, chest: 1 };
  }
  return {
    length: current.length / baseline.length,
    chest: current.chest / baseline.chest,
  };
}

/**
 * Visible proportion profile for ResultPanel pilot sizes.
 * Non-pilot sizes fall back to M composition.
 */
export function resolveVisibleGarmentProportion(
  size: Size | string,
): VisibleGarmentProportionProfile {
  const normalized = PILOT_SIZES.has(size as Size) ? size : VISIBLE_PROPORTION_BASELINE_SIZE;
  const { length, chest } = resolveLengthChestRatios(normalized);

  const visibleHeightRatio = clamp(
    lerp(1, length, LENGTH_BLEND),
    0.72,
    1,
  );

  const frameAspectRatio = clamp(
    lerp(0.667, 0.667 * chest, CHEST_BLEND),
    0.58,
    0.78,
  );

  const topAnchorPercent = clamp(
    lerp(16, 10, clamp((1 - length) / 0.5, 0, 1)),
    8,
    20,
  );

  const stagePaddingBottomPercent =
    length >= 1
      ? clamp(lerp(28, 42, (length - 1) / 0.22), 28, 44)
      : clamp(lerp(28, 18, clamp((1 - length) / 0.35, 0, 1)), 16, 32);

  const sideMarginPercent =
    length >= 1
      ? clamp(lerp(2, 8, (length - 1) / 0.22), 2, 10)
      : clamp(lerp(2, 6, clamp((1 - length) / 0.35, 0, 1)), 2, 8);

  return {
    sizeCode: findProductSizeRow(normalized)?.size ?? normalized,
    visibleHeightRatio,
    topAnchorPercent,
    frameAspectRatio,
    stagePaddingBottomPercent,
    sideMarginPercent,
  };
}
