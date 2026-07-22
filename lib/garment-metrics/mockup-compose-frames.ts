/**
 * Mockup compose frame bridge — delegates to Garment Frame Calibration.
 */

import type { CalibrationRect } from "@/lib/render/render-types";
import { resolveGarmentComposeFrames } from "@/lib/garment-calibration";
import type { GarmentMetrics } from "./types";
import { METRICS_BASELINE_SIZE } from "./constants";

export interface MockupComposeFrames {
  garmentFrame: CalibrationRect;
  artworkFrame: CalibrationRect | null;
  metrics: GarmentMetrics;
}

export interface ResolveMockupComposeFramesInput {
  metrics: GarmentMetrics;
  baselineMetrics: GarmentMetrics;
  placementRect: CalibrationRect | null;
  assetWidth: number;
  assetHeight: number;
}

/**
 * Map Garment Metrics + frozen M placement → photo-space draw frames.
 */
export function resolveMockupComposeFrames(
  input: ResolveMockupComposeFramesInput,
): MockupComposeFrames {
  const frames = resolveGarmentComposeFrames({
    metrics: input.metrics,
    baselineMetrics: input.baselineMetrics,
    placementRect: input.placementRect,
    assetWidth: input.assetWidth,
    assetHeight: input.assetHeight,
  });

  return {
    garmentFrame: frames.garmentFrame,
    artworkFrame: frames.artworkFrame,
    metrics: input.metrics,
  };
}

export function isMetricsBaselineSize(sizeCode: string): boolean {
  return sizeCode === METRICS_BASELINE_SIZE;
}
