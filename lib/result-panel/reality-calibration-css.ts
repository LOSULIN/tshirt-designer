/**
 * ResultPanel Reality Calibration — CSS for split garment + artwork display.
 */

import type { CSSProperties } from "react";
import type { CalibrationRect } from "@/lib/render/render-types";
import type { RealityCalibrationMetrics } from "./reality-calibration";
import { REALITY_MOCKUP_CANVAS } from "./reality-calibration";

export interface RealityCalibrationPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RealityCalibrationDisplayStyles {
  viewportStyle: CSSProperties;
  garmentImageStyle: CSSProperties;
  artworkImageStyle: CSSProperties;
  reality: RealityCalibrationMetrics;
}

export function realityPlacementToPercent(
  placement: RealityCalibrationPlacement,
): RealityCalibrationPlacement {
  const { width: cw, height: ch } = REALITY_MOCKUP_CANVAS;
  return {
    x: (placement.x / cw) * 100,
    y: (placement.y / ch) * 100,
    width: (placement.width / cw) * 100,
    height: (placement.height / ch) * 100,
  };
}

export function realityCalibrationToCss(
  placement: CalibrationRect,
  reality: RealityCalibrationMetrics,
): RealityCalibrationDisplayStyles {
  const pct = realityPlacementToPercent(placement);
  const centerX = pct.x + pct.width / 2;
  const centerY = pct.y + pct.height / 2;

  return {
    reality,
    viewportStyle: {
      overflow: "hidden",
      width: "100%",
      height: "100%",
      position: "relative",
    },
    garmentImageStyle: {
      display: "block",
      width: "100%",
      height: "auto",
      maxWidth: "none",
    },
    artworkImageStyle: {
      position: "absolute",
      left: `${pct.x}%`,
      top: `${pct.y}%`,
      width: `${pct.width}%`,
      height: `${pct.height}%`,
      objectFit: "fill",
      transform: `scale(${reality.widthCompensation}, ${reality.heightCompensation})`,
      transformOrigin: `${centerX}% ${centerY}%`,
      pointerEvents: "none",
    },
  };
}
