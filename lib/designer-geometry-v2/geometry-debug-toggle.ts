/**
 * Designer Geometry V2 — Geometry Debug toggle (dev-only).
 */

import {
  DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES,
  type GeometryDebugLayerToggles,
} from "./geometry-debug-types";

const DEBUG_ENV_KEY = "NEXT_PUBLIC_GEOMETRY_DEBUG_ENABLED";

/** Debug overlay enabled in development by default; never in production. */
export function isGeometryDebugEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  const flag =
    typeof process !== "undefined" ? process.env[DEBUG_ENV_KEY] : undefined;
  if (flag === "false" || flag === "0") return false;
  return true;
}

export function assertGeometryDebugSafeForProduction(): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    isGeometryDebugEnabled()
  ) {
    throw new Error("Geometry Debug Overlay must not be enabled in production");
  }
}

/**
 * GeometryDebugLayer — resolves effective toggles respecting dev/prod gate.
 * Returns all-off when debug is disabled (production).
 */
export function resolveGeometryDebugLayerToggles(
  partial?: Partial<GeometryDebugLayerToggles>,
): GeometryDebugLayerToggles {
  if (!isGeometryDebugEnabled()) {
    return {
      v1: false,
      v2: false,
      artworkStage: false,
      safeArea: false,
      collar: false,
      factoryOrigin: false,
      alphaBoundingBox: false,
      center: false,
      shoulder: false,
      hem: false,
    };
  }

  return { ...DEFAULT_GEOMETRY_DEBUG_LAYER_TOGGLES, ...partial };
}
