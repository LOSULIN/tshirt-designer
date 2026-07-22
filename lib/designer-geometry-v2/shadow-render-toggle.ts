/**
 * Designer Geometry V2 — Shadow Render toggle (dev-only).
 */

const SHADOW_RENDER_ENV_KEY = "NEXT_PUBLIC_GEOMETRY_SHADOW_RENDER";

/**
 * Shadow render enabled in development when env is true or unset (default on).
 * Always disabled in production.
 */
export function isGeometryShadowRenderEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return false;
  }
  const flag =
    typeof process !== "undefined" ? process.env[SHADOW_RENDER_ENV_KEY] : undefined;
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return true;
}

export function assertGeometryShadowRenderSafeForProduction(): void {
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "production" &&
    isGeometryShadowRenderEnabled()
  ) {
    throw new Error(
      "Geometry Shadow Render must not be enabled in production",
    );
  }
}
