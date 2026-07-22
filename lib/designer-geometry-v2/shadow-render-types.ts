/**
 * Designer Geometry V2 — Shadow Render types (audit-only V2 render pipeline).
 */

import type { Side } from "@/lib/constants";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export const SHADOW_RENDER_OUTPUT_DIR = "debug/shadow-render" as const;

export const SHADOW_RENDER_CANVAS_WIDTH = 1024;

export const SHADOW_RENDER_CANVAS_HEIGHT = 1536;

/**
 * Designer layer spec for shadow render audit.
 * Positions are normalized within the artwork stage (0–1).
 */
export interface ShadowDesignerLayer {
  id: string;
  normalizedX: number;
  normalizedY: number;
  scale: number;
  rotationDeg: number;
  widthPx: number;
  heightPx: number;
  fill: string;
}

export interface ShadowLayerPlacement {
  layerId: string;
  position: GeometryV2Point;
  scale: number;
  rotationDeg: number;
  widthPx: number;
  heightPx: number;
  boundingBox: GeometryV2Rect;
}

export interface ShadowRenderGeometryContext {
  version: "v1" | "v2";
  side: Side;
  snapshot: GeometryRuntimeSnapshot;
  placements: ShadowLayerPlacement[];
}

export interface ShadowRenderLayerCompare {
  layerId: string;
  v1Position: GeometryV2Point;
  v2Position: GeometryV2Point;
  positionDeltaX: number;
  positionDeltaY: number;
  v1Scale: number;
  v2Scale: number;
  scaleDelta: number;
  v1RotationDeg: number;
  v2RotationDeg: number;
  rotationDeltaDeg: number;
}

export interface ShadowRenderGeometryCompare {
  side: Side;
  colorSlug: string;
  artworkStage: { v1: GeometryV2Rect; v2: GeometryV2Rect; deltaY: number };
  safeArea: { v1: GeometryV2Rect; v2: GeometryV2Rect; deltaY: number };
  factoryOrigin: {
    v1: GeometryV2Point;
    v2: GeometryV2Point;
    deltaY: number;
  };
  layers: ShadowRenderLayerCompare[];
  verdict: "PASS" | "WARNING";
}

export interface ShadowPixelDifferenceReport {
  differingPixels: number;
  totalPixels: number;
  diffPercent: number;
  boundingDifference: GeometryV2Rect | null;
  centerDifference: GeometryV2Point | null;
  topDifference: number | null;
  bottomDifference: number | null;
  maxChannelDelta: number;
}

export interface ShadowRenderResult {
  side: Side;
  colorSlug: string;
  v1OutputPath: string;
  v2OutputPath: string;
  heatmapPath?: string;
  geometryCompare: ShadowRenderGeometryCompare;
  pixelDiff: ShadowPixelDifferenceReport;
}

/** Canonical audit layers — same design intent, different geometry placement. */
export const SHADOW_RENDER_AUDIT_LAYERS: ShadowDesignerLayer[] = [
  {
    id: "logo",
    normalizedX: 0.5,
    normalizedY: 0.32,
    scale: 0.55,
    rotationDeg: 0,
    widthPx: 220,
    heightPx: 140,
    fill: "#2563eb",
  },
  {
    id: "title",
    normalizedX: 0.5,
    normalizedY: 0.52,
    scale: 1,
    rotationDeg: -4,
    widthPx: 300,
    heightPx: 72,
    fill: "#111827",
  },
  {
    id: "badge",
    normalizedX: 0.72,
    normalizedY: 0.68,
    scale: 0.45,
    rotationDeg: 12,
    widthPx: 120,
    heightPx: 120,
    fill: "#ef4444",
  },
];
