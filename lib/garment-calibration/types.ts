/**
 * Garment Frame Calibration — product photo space types.
 */

import type { GarmentMetrics } from "@/lib/garment-metrics";
import type { CalibrationRect } from "@/lib/render/render-types";

export interface GarmentPhotoPoint {
  x: number;
  y: number;
}

export interface GarmentPhotoLine {
  x?: number;
  y?: number;
}

export interface GarmentPhotoFrame {
  sizeCode: string;
  assetWidth: number;
  assetHeight: number;
  garmentPhotoBounds: CalibrationRect;
  printPhotoBounds: CalibrationRect;
  photoCenter: GarmentPhotoPoint;
  photoCollar: GarmentPhotoPoint;
  photoHem: GarmentPhotoLine;
  photoWidth: number;
  photoHeight: number;
  printWidth: number;
  printHeight: number;
  printToBodyWidthRatio: number;
  printToBodyHeightRatio: number;
  metrics: GarmentMetrics;
}

export interface ResolveGarmentPhotoFrameInput {
  metrics: GarmentMetrics;
  baselineMetrics: GarmentMetrics;
  assetWidth: number;
  assetHeight: number;
  /** Frozen placement output (after visual compensation) for M identity. */
  baselinePlacementRect: CalibrationRect | null;
}

export interface GarmentComposeFrames {
  garmentFrame: CalibrationRect;
  artworkFrame: CalibrationRect | null;
  photoFrame: GarmentPhotoFrame;
}

export interface ResolveGarmentComposeFramesInput {
  metrics: GarmentMetrics;
  baselineMetrics: GarmentMetrics;
  placementRect: CalibrationRect | null;
  assetWidth: number;
  assetHeight: number;
}
