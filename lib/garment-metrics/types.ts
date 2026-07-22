/**
 * Garment Metrics Layer — read-only physical garment metrics types.
 */

import type { Side } from "@/lib/constants";

export interface GarmentMetricsPoint {
  x: number;
  y: number;
}

export interface GarmentMetricsLine {
  /** Vertical line: x constant. Horizontal line: y constant. */
  x?: number;
  y?: number;
}

export interface GarmentMetricsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GarmentMetricsRatios {
  printWidthToBodyWidth: number;
  printHeightToBodyHeight: number;
}

/**
 * Canonical garment physical metrics @ designer template space (1024×1536).
 * Single read-only output for Designer / Mockup / Factory validation alignment.
 */
export interface GarmentMetrics {
  sizeCode: string;
  side: Side;
  bodyWidthCm: number;
  bodyHeightCm: number;
  bodyWidthPx: number;
  bodyHeightPx: number;
  printWidthCm: number;
  printHeightCm: number;
  printWidthPx: number;
  printHeightPx: number;
  garmentBounds: GarmentMetricsRect;
  printBounds: GarmentMetricsRect;
  collarAnchor: GarmentMetricsPoint;
  centerLine: GarmentMetricsLine;
  hemLine: GarmentMetricsLine;
  ratios: GarmentMetricsRatios;
}

export interface ResolveGarmentMetricsInput {
  size: string;
  side?: Side;
}
