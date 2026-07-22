/**
 * Designer Geometry V2 — Product Master Geometry types (UA35001 single source).
 *
 * Audit only — one geometry definition shared by all colors.
 */

import type { Side } from "@/lib/constants";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export const PRODUCT_MASTER_PRODUCT_CODE = "UA35001" as const;

export interface ProductMasterCollarBottom {
  x: number;
  y: number;
  neckWidthPx: number;
}

export interface ProductMasterFactoryOrigin extends GeometryV2Point {
  side: Side;
  offsetCm: number;
  pxPerCm: number;
}

/** Single-side UA35001 master geometry — shared by all color assets. */
export interface ProductMasterGeometrySide {
  productCode: typeof PRODUCT_MASTER_PRODUCT_CODE;
  side: Side;
  canvas: { width: number; height: number };

  collarBottom: ProductMasterCollarBottom;
  factoryOrigin: ProductMasterFactoryOrigin;
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;

  garmentWidthPx: number;
  garmentHeightPx: number;
  shoulderWidthPx: number;
  centerPoint: GeometryV2Point;
  hem: GeometryV2Point;
  alphaBoundingBox: GeometryV2Rect;
}

export interface ProductMasterGeometry {
  productCode: typeof PRODUCT_MASTER_PRODUCT_CODE;
  version: 1;
  /** Derived from official anchor or cross-color builder audit. */
  derivation:
    | "averaged-factory-cross-validation"
    | "averaged-factory-cross-validation-calibrated"
    | "product-factory-anchor";
  front: ProductMasterGeometrySide;
  back: ProductMasterGeometrySide;
}

export interface GeometryMetricStats {
  average: number;
  min: number;
  max: number;
  maxError: number;
  minError: number;
  stdDev: number;
  samples: number;
}

export interface ProductMasterStabilityMetric {
  metric: string;
  stats: GeometryMetricStats;
  /** ±stdDev formatted for report */
  varianceLabel: string;
}

export interface ProductMasterColorVariance {
  colorSlug: string;
  displayName: string;
  side: Side;
  deltaCollarY: number;
  deltaShoulderWidth: number;
  deltaHemY: number;
  pass: boolean;
  issues: string[];
}

export interface ProductMasterStabilityReport {
  side: Side;
  metrics: ProductMasterStabilityMetric[];
  recommendation: string;
  verdict: "PASS" | "WARNING";
}
