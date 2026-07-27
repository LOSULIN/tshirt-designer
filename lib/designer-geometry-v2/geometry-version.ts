/**
 * Designer Geometry version switch — V2 active by default (Phase 78).
 *
 * V1 remains available for legacy / debug console only.
 */

export const DESIGNER_GEOMETRY_VERSION = {
  V1: "v1",
  V2: "v2",
} as const;

export type DesignerGeometryVersion =
  (typeof DESIGNER_GEOMETRY_VERSION)[keyof typeof DESIGNER_GEOMETRY_VERSION];

/**
 * Active geometry version for production runtime.
 * @default v2 — Phase 78 default cutover.
 */
export const ACTIVE_DESIGNER_GEOMETRY_VERSION: DesignerGeometryVersion =
  DESIGNER_GEOMETRY_VERSION.V2;

const ENV_KEY = "NEXT_PUBLIC_DESIGNER_GEOMETRY_VERSION";

/**
 * Runtime geometry version resolver.
 * Env override still supported for integration testing.
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
