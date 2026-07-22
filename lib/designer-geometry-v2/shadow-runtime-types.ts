/**
 * Designer Geometry V2 — Shadow Runtime types.
 *
 * Audit + integration foundation only. Shadow compare never feeds render.
 */

import type { Side } from "@/lib/constants";
import type { GeometryV2Point, GeometryV2Rect } from "./types";

export type GeometryShadowVersion = "v1" | "v2";

/** Unified runtime geometry snapshot for V1/V2 shadow compare. */
export interface GeometryRuntimeSnapshot {
  version: GeometryShadowVersion;
  side: Side;
  collar: GeometryV2Point;
  factoryOrigin: GeometryV2Point;
  artworkStage: GeometryV2Rect;
  safeArea: GeometryV2Rect;
  garmentWidth: number;
  garmentHeight: number;
  center: GeometryV2Point;
  hem: GeometryV2Point;
}

export interface GeometryShadowMetricDelta {
  label: string;
  v1: number | string;
  v2: number | string;
  deltaX: number;
  deltaY: number;
  deltaWidth: number;
  deltaHeight: number;
  /** Primary percent delta (Y for points, height for rects). */
  percentDelta: number | null;
}

export interface GeometryShadowComparison {
  side: Side;
  colorSlug?: string;
  activeVersion: "v1";
  shadowVersion: "v2";
  v1: GeometryRuntimeSnapshot;
  v2: GeometryRuntimeSnapshot;
  metrics: GeometryShadowMetricDelta[];
  maxAbsDeltaY: number;
  averageAbsDeltaY: number;
  verdict: "PASS" | "WARNING";
}

export interface GeometryShadowRuntimeState {
  enabled: boolean;
  activeGeometryVersion: "v1";
  shadowGeometryVersion: "v2";
  productMasterLoaded: boolean;
}

export interface GeometryShadowOverallSummary {
  assetCount: number;
  passCount: number;
  warningCount: number;
  averageDeltaY: number;
  maximumDeltaY: number;
  verdict: "PASS" | "WARNING";
}

export interface GeometryShadowDebugReport {
  runtime: GeometryShadowRuntimeState;
  flow: string[];
  whiteFront?: GeometryShadowComparison;
  whiteBack?: GeometryShadowComparison;
  overall: GeometryShadowOverallSummary;
  compareVerdict: "PASS" | "WARNING";
}
