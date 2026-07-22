/**
 * Designer Geometry V2 — built geometry profile (Builder output).
 */

import type { Side } from "@/lib/constants";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export interface GeometryV2ShoulderMetrics {
  scanY: number;
  widthPx: number;
  left: number;
  right: number;
}

export interface GeometryV2NeckMetrics {
  /** Narrowest neck width on upper torso scan. */
  widthPx: number;
  narrowestY: number;
  /** Approximate neck opening curve sample points (centerline-relative). */
  curveSamplePoints: GeometryV2Point[];
}

/** Factory collar bottom — lowest collar opening point on centerline (NOT alpha bbox top). */
export interface GeometryV2CollarBottom {
  x: number;
  y: number;
  neckWidthPx: number;
}

/**
 * Factory coordinate origin — collar bottom anchor for frozen print offsets.
 * Print area top = factoryOrigin.y + offsetCm × pxPerCm.
 */
export interface GeometryV2FactoryOrigin extends GeometryV2Point {
  side: Side;
  offsetCm: number;
  pxPerCm: number;
}

export interface GeometryProfileV2 {
  version: 2;
  side: Side;
  colorSlug: string;
  sourceAsset: string;
  canvas: { width: number; height: number };

  alphaBoundingBox: GeometryV2Rect;
  garmentBounds: GeometryV2Rect;
  garmentCenter: GeometryV2Point;

  shoulder: GeometryV2ShoulderMetrics;
  neck: GeometryV2NeckMetrics;
  collarBottom: GeometryV2CollarBottom;
  factoryOrigin: GeometryV2FactoryOrigin;

  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
}

export interface BuildGeometryProfileV2Input {
  side: Side;
  colorSlug: string;
  sourceAsset: string;
  buffer: import("./measure-garment-alpha").RawAlphaBuffer;
}
