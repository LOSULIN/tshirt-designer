/**
 * Designer Geometry version switch — V1 active by default.
 *
 * V2 is foundation-only; no runtime consumer may enable V2 without explicit future wiring.
 * Default compile-time version: v1 (Garment Metrics / template baseline).
 */

export const DESIGNER_GEOMETRY_VERSION = {
  V1: "v1",
  V2: "v2",
} as const;

export type DesignerGeometryVersion =
  (typeof DESIGNER_GEOMETRY_VERSION)[keyof typeof DESIGNER_GEOMETRY_VERSION];

/**
 * Active geometry version for production runtime.
 * @default v1 — frozen; V2 not enabled.
 */
export const ACTIVE_DESIGNER_GEOMETRY_VERSION: DesignerGeometryVersion =
  DESIGNER_GEOMETRY_VERSION.V1;

const ENV_KEY = "NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION";

/**
 * Runtime geometry version resolver.
 * V2 returns only when env explicitly set to `v2` (integration testing).
 * Production default remains v1.
 */
export function getActiveDesignerGeometryVersion(): DesignerGeometryVersion {
  const envMode =
    typeof process !== "undefined" ? process.env[ENV_KEY] : undefined;
  if (envMode === DESIGNER_GEOMETRY_VERSION.V2) {
    return DESIGNER_GEOMETRY_VERSION.V2;
  }
  if (envMode === DESIGNER_GEOMETRY_VERSION.V1) {
    return DESIGNER_GEOMETRY_VERSION.V1;
  }
  return ACTIVE_DESIGNER_GEOMETRY_VERSION;
}

export function isDesignerGeometryV1(
  version: DesignerGeometryVersion = ACTIVE_DESIGNER_GEOMETRY_VERSION,
): boolean {
  return version === DESIGNER_GEOMETRY_VERSION.V1;
}

export function isDesignerGeometryV2(
  version: DesignerGeometryVersion = getActiveDesignerGeometryVersion(),
): boolean {
  return version === DESIGNER_GEOMETRY_VERSION.V2;
}

/** True when V2 is the compile-time default (always false in Phase 69.1). */
export function isDesignerGeometryV2EnabledByDefault(): boolean {
  return ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V2;
}
