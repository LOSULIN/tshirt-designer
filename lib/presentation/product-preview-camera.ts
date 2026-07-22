/**
 * Garment Silhouette — CSS adapter for Hero Garment Stage layout.
 * No Camera transform. Frame + viewport crop only.
 */

import type { CSSProperties } from "react";

import type { Size } from "@/lib/constants";
import {
  resolveGarmentSilhouetteProfile,
  type GarmentSilhouetteProfile,
} from "./physical-garment-presentation";

export interface GarmentStageStyles {
  stageStyle: CSSProperties;
  frameStyle: CSSProperties;
  viewportStyle: CSSProperties;
  imageStyle: CSSProperties;
}

export function garmentSilhouetteToCss(
  profile: GarmentSilhouetteProfile,
): GarmentStageStyles {
  return {
    stageStyle: {
      paddingBottom: `${profile.stagePaddingBottomPercent}%`,
      paddingLeft: `${profile.sideMarginPercent}%`,
      paddingRight: `${profile.sideMarginPercent}%`,
    },
    frameStyle: {
      aspectRatio: profile.frameAspectRatio,
      maxHeight: `min(${profile.frameMaxHeightVh}vh, ${profile.frameMaxHeightRem}rem)`,
      maxWidth: `${profile.frameMaxWidthPercent}%`,
      width: "100%",
    },
    viewportStyle: {
      overflow: "hidden",
      width: "100%",
      height: "100%",
    },
    imageStyle: {
      display: "block",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: profile.objectPosition,
    },
  };
}

export function resolveGarmentStageStyles(size: Size): GarmentStageStyles {
  return garmentSilhouetteToCss(resolveGarmentSilhouetteProfile(size));
}

/** @deprecated Hero stage adapter — use resolveGarmentStageStyles */
export function resolveProductPreviewCamera(size: Size) {
  const profile = resolveGarmentSilhouetteProfile(size);
  return {
    stagePaddingBottomPercent: profile.stagePaddingBottomPercent,
    frameMaxHeightVh: profile.frameMaxHeightVh,
    frameMaxHeightRem: profile.frameMaxHeightRem,
    frameMaxWidthPercent: profile.frameMaxWidthPercent,
  };
}

/** @deprecated Use garmentSilhouetteToCss */
export function productPreviewCameraToCss(size: Size): {
  stageStyle: CSSProperties;
  frameStyle: CSSProperties;
  viewportStyle: CSSProperties;
  imageStyle: CSSProperties;
} {
  return resolveGarmentStageStyles(size);
}

export {
  PRESENTATION_BASELINE_SIZE,
  PRESENTATION_COMPENSATION_FACTOR,
  resolveGarmentSilhouetteProfile,
  resolveGarmentPresentationProfile,
  type GarmentSilhouetteProfile,
  type GarmentPresentationProfile,
  type PhysicalGarmentRatios,
} from "./physical-garment-presentation";
