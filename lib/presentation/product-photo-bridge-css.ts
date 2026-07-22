/**
 * Photo Bridge — CSS adapter for UA photo artwork stage (presentation only).
 */

import type { CSSProperties } from "react";
import {
  METRICS_TEMPLATE_HEIGHT_PX,
  METRICS_TEMPLATE_WIDTH_PX,
} from "@/lib/garment-metrics/constants";
import type { PhotoBridgeRect } from "./product-photo-bridge";

/** Dedicated Photo Bridge hero — no Legacy VGP camera padding or viewport crop. */
export function designerProjectionPhotoHeroStyle(): CSSProperties {
  return {
    display: "flex",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  };
}

/** Template-aspect frame matching UA product photo canvas (1024×1536). */
export function designerProjectionPhotoFrameStyle(
  canvasWidth: number = METRICS_TEMPLATE_WIDTH_PX,
  canvasHeight: number = METRICS_TEMPLATE_HEIGHT_PX,
): CSSProperties {
  return {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    aspectRatio: `${canvasWidth} / ${canvasHeight}`,
  };
}

export function photoBridgeRectToStageStyle(rect: PhotoBridgeRect): CSSProperties {
  return {
    position: "absolute",
    left: `${rect.leftPercent}%`,
    top: `${rect.topPercent}%`,
    width: `${rect.widthPercent}%`,
    height: `${rect.heightPercent}%`,
    overflow: "visible",
  };
}

export function photoGarmentImageStyle(): CSSProperties {
  return {
    display: "block",
    width: "100%",
    height: "auto",
    maxWidth: "none",
  };
}
