/**
 * Designer Geometry V2 — Geometry Debug Overlay types.
 *
 * Debug-only visual verification. Never wired into render paths.
 */

import type { Side } from "@/lib/constants";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export const GEOMETRY_DEBUG_V1_COLOR = "#ef4444";

export const GEOMETRY_DEBUG_V2_COLOR = "#2563eb";

export const GEOMETRY_DEBUG_OUTPUT_DIR =
  "debug/geometry-debug-overlay" as const;

/** Per-layer visibility toggles for GeometryDebugLayer. */
export interface GeometryDebugLayerToggles {
  v1: boolean;
  v2: boolean;
  artworkStage: boolean;
  safeArea: boolean;
  collar: boolean;
  factoryOrigin: boolean;
  alphaBoundingBox: boolean;
  center: boolean;
  shoulder: boolean;
  hem: boolean;
}

export const DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES: GeometryDebugLayerToggles =
  {
    v1: true,
    v2: true,
    artworkStage: true,
    safeArea: true,
    collar: true,
    factoryOrigin: true,
    alphaBoundingBox: true,
    center: true,
    shoulder: true,
    hem: true,
  };

export interface GeometryDebugShoulderLine {
  scanY: number;
  left: number;
  right: number;
  widthPx: number;
}

/** Single-version debug overlay shapes. */
export interface GeometryDebugOverlayShapes {
  version: "v1" | "v2";
  side: Side;
  alphaBoundingBox: GeometryV2Rect;
  collar: GeometryV2Point;
  factoryOrigin: GeometryV2Point;
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
  center: GeometryV2Point;
  hem: GeometryV2Point;
  shoulder: GeometryDebugShoulderLine;
}

export interface GeometryDebugOverlayBundle {
  side: Side;
  colorSlug: string;
  label: string;
  v1: GeometryDebugOverlayShapes;
  v2: GeometryDebugOverlayShapes;
}

export interface GeometryDebugOverlayDescription {
  side: Side;
  colorSlug: string;
  v1: {
    collar: string;
    factoryOrigin: string;
    artworkStage: string;
    safeArea: string;
  };
  v2: {
    collar: string;
    factoryOrigin: string;
    artworkStage: string;
    safeArea: string;
  };
  compareNote: string;
}

export interface GeometryDebugRenderResult {
  svg: string;
  outputPath?: string;
  bundle: GeometryDebugOverlayBundle;
}
