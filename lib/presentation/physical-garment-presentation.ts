/**
 * Physical Garment Silhouette Presentation — UI-only Garment Stage framing.
 *
 * Single source of truth: lib/product-size-config.ts → findProductSizeRow(size)
 *
 * Changes garment FRAME / VIEWPORT silhouette in Hero — not Camera transform,
 * not Mockup Engine, not Artwork pixels in export.
 */

import type { Size } from "@/lib/constants";
import {
  findProductSizeRow,
  type ProductSizeRow,
} from "@/lib/product-size-config";

export const PRESENTATION_BASELINE_SIZE = "M" as const;

/** Silhouette strength — frame follows physical chart (not camera compensation). */
export const SILHOUETTE_HEIGHT_FACTOR = 0.62;
export const SILHOUETTE_WIDTH_FACTOR = 0.5;
export const SILHOUETTE_SHOULDER_BLEND = 0.4;
export const SILHOUETTE_SLEEVE_ANCHOR_BLEND = 0.18;

const BASELINE_STAGE = {
  stagePaddingBottomPercent: 40,
  frameMaxHeightVh: 76.32,
  frameMaxHeightRem: 38.16,
  frameMaxWidthPercent: 106,
  topAnchorPercent: 14,
  sideMarginPercent: 2,
} as const;

export interface PhysicalGarmentRatios {
  height: number;
  width: number;
  shoulder: number;
  sleeve: number;
}

/**
 * Garment Stage profile — frame + viewport crop (Hero only).
 * Artwork inside mockup PNG is never independently scaled in production.
 */
export interface GarmentSilhouetteProfile {
  garmentWidth: number;
  garmentHeight: number;
  frameAspectRatio: number;
  topAnchorPercent: number;
  bottomCropBias: number;
  sideMarginPercent: number;
  visualCenterPercent: number;
  stagePaddingBottomPercent: number;
  frameMaxWidthPercent: number;
  frameMaxHeightVh: number;
  frameMaxHeightRem: number;
  objectPosition: string;
  physicalRatios: PhysicalGarmentRatios;
  silhouetteRatios: PhysicalGarmentRatios;
}

/** @deprecated Use GarmentSilhouetteProfile */
export type GarmentPresentationProfile = GarmentSilhouetteProfile;

export const PRESENTATION_COMPENSATION_FACTOR = SILHOUETTE_HEIGHT_FACTOR;

function lerp(from: number, to: number, factor: number): number {
  return from + (to - from) * factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computePhysicalRatios(
  baseline: ProductSizeRow,
  current: ProductSizeRow,
): PhysicalGarmentRatios {
  return {
    height: current.length / baseline.length,
    width: current.chest / baseline.chest,
    shoulder: current.shoulder / baseline.shoulder,
    sleeve: current.sleeve / baseline.sleeve,
  };
}

function silhouetteRatio(physicalRatio: number, factor: number): number {
  return lerp(1, physicalRatio, factor);
}

function silhouetteRatiosFromPhysical(
  physical: PhysicalGarmentRatios,
): PhysicalGarmentRatios {
  return {
    height: silhouetteRatio(physical.height, SILHOUETTE_HEIGHT_FACTOR),
    width: silhouetteRatio(physical.width, SILHOUETTE_WIDTH_FACTOR),
    shoulder: silhouetteRatio(physical.shoulder, SILHOUETTE_WIDTH_FACTOR),
    sleeve: silhouetteRatio(physical.sleeve, SILHOUETTE_SLEEVE_ANCHOR_BLEND),
  };
}

function buildDefaultProfile(): GarmentSilhouetteProfile {
  const unity = { height: 1, width: 1, shoulder: 1, sleeve: 1 };
  return {
    garmentWidth: 1,
    garmentHeight: 1,
    frameAspectRatio: 1,
    topAnchorPercent: BASELINE_STAGE.topAnchorPercent,
    bottomCropBias: 0,
    sideMarginPercent: BASELINE_STAGE.sideMarginPercent,
    visualCenterPercent: 42,
    stagePaddingBottomPercent: BASELINE_STAGE.stagePaddingBottomPercent,
    frameMaxWidthPercent: BASELINE_STAGE.frameMaxWidthPercent,
    frameMaxHeightVh: BASELINE_STAGE.frameMaxHeightVh,
    frameMaxHeightRem: BASELINE_STAGE.frameMaxHeightRem,
    objectPosition: `center ${BASELINE_STAGE.topAnchorPercent}%`,
    physicalRatios: { ...unity },
    silhouetteRatios: { ...unity },
  };
}

function resolveTopAnchorPercent(
  silhouetteHeight: number,
  silhouetteSleeve: number,
): number {
  const heightAnchor = lerp(8, 46, clamp(silhouetteHeight, 0.72, 1.18));
  const sleeveAnchor = (silhouetteSleeve - 1) * 4;
  return clamp(heightAnchor + sleeveAnchor, 6, 50);
}

function resolveBottomCropBias(silhouetteHeight: number): number {
  return clamp(1 - silhouetteHeight, 0, 0.42);
}

function resolveSideMarginPercent(silhouetteWidth: number): number {
  return clamp(lerp(7, 1.5, silhouetteWidth), 1.5, 8);
}

function resolveVisualCenterPercent(
  silhouetteHeight: number,
  topAnchorPercent: number,
): number {
  return clamp(lerp(topAnchorPercent + 28, 50, silhouetteHeight), 32, 54);
}

function resolveStagePaddingBottom(silhouetteHeight: number): number {
  if (silhouetteHeight <= 1) {
    return lerp(
      BASELINE_STAGE.stagePaddingBottomPercent,
      30,
      clamp((1 - silhouetteHeight) / 0.35, 0, 1),
    );
  }
  return lerp(
    BASELINE_STAGE.stagePaddingBottomPercent,
    46,
    clamp((silhouetteHeight - 1) / 0.2, 0, 1),
  );
}

/**
 * Garment frame scales with silhouette height — shorter sizes get a visibly
 * shorter viewport (hem cropped), taller sizes get a taller frame.
 */
export function resolveGarmentSilhouetteProfile(
  size: Size | string,
): GarmentSilhouetteProfile {
  const baseline = findProductSizeRow(PRESENTATION_BASELINE_SIZE);
  const current = findProductSizeRow(size);

  if (!baseline || !current) {
    return buildDefaultProfile();
  }

  const physicalRatios = computePhysicalRatios(baseline, current);
  const silhouetteRatios = silhouetteRatiosFromPhysical(physicalRatios);

  const garmentHeight = clamp(silhouetteRatios.height, 0.68, 1.22);
  const garmentWidth = clamp(
    lerp(silhouetteRatios.width, silhouetteRatios.shoulder, SILHOUETTE_SHOULDER_BLEND),
    0.72,
    1.2,
  );

  const frameAspectRatio = clamp(garmentWidth / garmentHeight, 0.62, 1.08);
  const topAnchorPercent = resolveTopAnchorPercent(
    garmentHeight,
    silhouetteRatios.sleeve,
  );
  const bottomCropBias = resolveBottomCropBias(garmentHeight);
  const sideMarginPercent = resolveSideMarginPercent(garmentWidth);
  const visualCenterPercent = resolveVisualCenterPercent(
    garmentHeight,
    topAnchorPercent,
  );

  return {
    garmentWidth,
    garmentHeight,
    frameAspectRatio,
    topAnchorPercent,
    bottomCropBias,
    sideMarginPercent,
    visualCenterPercent,
    stagePaddingBottomPercent: resolveStagePaddingBottom(garmentHeight),
    frameMaxWidthPercent: clamp(
      BASELINE_STAGE.frameMaxWidthPercent * garmentWidth,
      94,
      110,
    ),
    frameMaxHeightVh: BASELINE_STAGE.frameMaxHeightVh * garmentHeight,
    frameMaxHeightRem: BASELINE_STAGE.frameMaxHeightRem * garmentHeight,
    objectPosition: `center ${topAnchorPercent}%`,
    physicalRatios,
    silhouetteRatios,
  };
}

/** @deprecated Use resolveGarmentSilhouetteProfile */
export const resolveGarmentPresentationProfile = resolveGarmentSilhouetteProfile;
