/**
 * Visible Garment Proportion — layout math for ResultPanel presentation only.
 * Maps profile → viewport crop + top anchor (no artwork / compose changes).
 */

import type { VisibleGarmentProportionProfile } from "./visible-garment-proportion";

/** Mockup preview source dimensions (UA35001 preview PNG). */
export const VISIBLE_GARMENT_SOURCE_WIDTH = 1024;
export const VISIBLE_GARMENT_SOURCE_HEIGHT = 1536;
export const VISIBLE_GARMENT_SOURCE_HEIGHT_RATIO =
  VISIBLE_GARMENT_SOURCE_HEIGHT / VISIBLE_GARMENT_SOURCE_WIDTH;

/** CSS aspect-ratio for frame — width / height of the composed mockup PNG. */
export const VISIBLE_GARMENT_FRAME_ASPECT_RATIO =
  VISIBLE_GARMENT_SOURCE_WIDTH / VISIBLE_GARMENT_SOURCE_HEIGHT;

/**
 * Frame outer box follows the full mockup bitmap (1024×1536), not the
 * chest-blended profile.frameAspectRatio used for perceived proportion framing.
 */
export function resolveVisibleGarmentFrameAspectRatio(
  _profile: VisibleGarmentProportionProfile,
): number {
  return VISIBLE_GARMENT_FRAME_ASPECT_RATIO;
}

export interface VisibleGarmentLayoutMetrics {
  frameAspectRatio: number;
  visibleHeightRatio: number;
  topAnchorPercent: number;
  /** Viewport height as % of frame height (always 100% — full garment preview). */
  viewportHeightPercent: number;
  /** Whether top anchor translate is applied (disabled — no upward crop). */
  applyTopAnchor: boolean;
  /** Fraction of source image height visible after layout (measured). */
  visibleSourceHeightFraction: number;
  /** Source Y (px) where visible window starts. */
  visibleSourceTopPx: number;
  /** Source Y (px) where visible window ends. */
  visibleSourceBottomPx: number;
  imageTransform: string | undefined;
  objectPosition: string;
}

/**
 * Compute presentation layout from profile.
 * Units are relative to frame width = 1.
 *
 * Frame height matches the full mockup PNG; viewport fills the frame (100%).
 * topAnchorPercent is retained in metrics but not applied via transform.
 */
export function computeVisibleGarmentLayout(
  profile: VisibleGarmentProportionProfile,
): VisibleGarmentLayoutMetrics {
  const frameAspect = resolveVisibleGarmentFrameAspectRatio(profile);
  const tap = profile.topAnchorPercent;

  const imageHeight = VISIBLE_GARMENT_SOURCE_HEIGHT_RATIO;

  const viewportHeightPercent = 100;
  const visibleSourceHeightFraction = 1;
  const applyTopAnchor = false;

  const visibleSourceTopPx = 0;
  const visibleSourceHeightPx =
    visibleSourceHeightFraction * VISIBLE_GARMENT_SOURCE_HEIGHT;
  const visibleSourceBottomPx = Math.min(
    VISIBLE_GARMENT_SOURCE_HEIGHT,
    visibleSourceTopPx + visibleSourceHeightPx,
  );

  return {
    frameAspectRatio: frameAspect,
    visibleHeightRatio: profile.visibleHeightRatio,
    topAnchorPercent: tap,
    viewportHeightPercent,
    applyTopAnchor,
    visibleSourceHeightFraction,
    visibleSourceTopPx,
    visibleSourceBottomPx,
    imageTransform: undefined,
    objectPosition: "50% 50%",
  };
}

/** Measure visible garment anchors within the layout window (fixed M photo). */
export function measureVisibleGarmentInLayout(
  layout: VisibleGarmentLayoutMetrics,
  anchors: {
    collarY: number;
    shoulderY: number;
    hemY: number;
    sleeveEndY: number;
    bodyHalfWidth: number;
    shoulderHalfWidth: number;
  },
  frameWidthPx: number,
): {
  visibleChestPx: number;
  visibleLengthPx: number;
  visibleShoulderPx: number;
  visibleSleevePx: number;
  screenChestPx: number;
  screenLengthPx: number;
  screenScale: number;
} {
  const scale = frameWidthPx / VISIBLE_GARMENT_SOURCE_WIDTH;
  const srcTop = layout.visibleSourceTopPx;
  const srcBottom =
    srcTop +
    layout.visibleSourceHeightFraction * VISIBLE_GARMENT_SOURCE_HEIGHT;

  const chestW = anchors.bodyHalfWidth * 2;
  const lengthPx = Math.max(
    0,
    Math.min(anchors.hemY, srcBottom) - Math.max(anchors.collarY, srcTop),
  );
  const shoulderW = anchors.shoulderHalfWidth * 2;
  const sleeveLen = Math.max(
    0,
    Math.min(anchors.sleeveEndY, srcBottom) - Math.max(anchors.shoulderY, srcTop),
  );

  return {
    visibleChestPx: chestW,
    visibleLengthPx: lengthPx,
    visibleShoulderPx: shoulderW,
    visibleSleevePx: sleeveLen,
    screenChestPx: chestW * scale,
    screenLengthPx: lengthPx * scale,
    screenScale: scale,
  };
}
