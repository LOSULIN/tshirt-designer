/**
 * Designer Geometry V2 — types (UA35001 product asset baseline).
 * Standalone; does not replace Garment Metrics V1.
 */

import type { Side } from "@/lib/constants";

export interface GeometryV2Point {
  x: number;
  y: number;
}

export interface GeometryV2Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GeometryV2AlphaMeasurement {
  canvas: { width: number; height: number };
  alphaBoundingBox: GeometryV2Rect;
  collarAnchor: GeometryV2Point;
  shoulderWidthPx: number;
  shoulderScanY: number;
  garmentWidthPx: number;
  garmentHeightPx: number;
  centerPoint: GeometryV2Point;
  hem: GeometryV2Point;
}

export interface GeometryV2PrintAreaRects {
  /** Factory print offset applied on V2 collar (frozen cm values, V2 px/cm). */
  printArea: GeometryV2Rect;
  /** M factory overlay stage — mirrors designer artwork stage on V2 canvas. */
  artworkStage: GeometryV2Rect;
}

/**
 * Full Designer Geometry V2 profile for one UA product asset @ 1024×1536.
 */
export interface DesignerGeometryV2Profile extends GeometryV2AlphaMeasurement {
  version: 2;
  side: Side;
  colorSlug: string;
  sourceAsset: string;
  pxPerCm: number;
  silhouettePxPerCm: number;
  printAreaRects: GeometryV2PrintAreaRects;
}

export interface ResolveDesignerGeometryV2Input {
  side: Side;
  colorSlug?: string;
  assetPath?: string;
}

export interface GeometryV1V2Diff {
  metric: string;
  v1: number;
  v2: number;
  deltaPx: number;
  deltaPercent: number | null;
}
