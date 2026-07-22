/**
 * Designer Geometry V2 — constants (UA35001 preview assets @ 1024×1536).
 * Does not modify or replace Garment Metrics V1 constants.
 */

import type { Side } from "@/lib/constants";

export const GEOMETRY_V2_PRODUCT_CODE = "UA35001" as const;

export const GEOMETRY_V2_CANVAS_WIDTH_PX = 1024;

export const GEOMETRY_V2_CANVAS_HEIGHT_PX = 1536;

export const GEOMETRY_V2_BASELINE_COLOR_SLUG = "white" as const;

export const GEOMETRY_V2_BASELINE_SIZE = "M" as const;

/** Alpha channel threshold for garment silhouette scan. */
export const GEOMETRY_V2_ALPHA_THRESHOLD = 8;

/** Shoulder scanline offset from collar as fraction of garment height. */
export const GEOMETRY_V2_SHOULDER_SCAN_RATIO = 0.08;

/**
 * Frozen factory print offsets (cm) — read-only mirror for V2 derivation.
 * Source: factory-overlay-runtime / print-area-offset (not imported).
 */
export const GEOMETRY_V2_FACTORY_PRINT_TOP_OFFSET_CM: Record<Side, number> = {
  front: 7,
  back: 5,
};

/**
 * Frozen M print area (cm) — read-only mirror for V2 derivation.
 * Source: designer-print-area-config M blue rows (not imported).
 */
export const GEOMETRY_V2_FACTORY_PRINT_AREA_CM: Record<
  Side,
  { widthCm: number; heightCm: number }
> = {
  front: { widthCm: 35, heightCm: 50 },
  back: { widthCm: 38, heightCm: 45 },
};

/**
 * Frozen M safe area (orange zone cm) — read-only mirror.
 * Back: Orange 32×42; Front: proportional safe inset.
 */
export const GEOMETRY_V2_FACTORY_SAFE_AREA_CM: Record<
  Side,
  { widthCm: number; heightCm: number }
> = {
  front: { widthCm: 32, heightCm: 46 },
  back: { widthCm: 32, heightCm: 42 },
};

/** Official M chest for silhouette px/cm metric (informational). */
export const GEOMETRY_V2_BASELINE_CHEST_CM = 52;

/**
 * Frozen template px/cm for print area + artwork stage derivation.
 * Mirrors V1 METRICS_TEMPLATE_PX_PER_CM (not garment-derived).
 */
export const GEOMETRY_V2_PRINT_PX_PER_CM = 12.24;

export const GEOMETRY_V2_ASSET_ROOT = `public/products/${GEOMETRY_V2_PRODUCT_CODE}/assets`;

export function buildGeometryV2AssetFileName(
  colorSlug: string,
  side: Side,
): string {
  return `adult-tshirt-${colorSlug}-${side}.png`;
}

export function buildGeometryV2AssetRelativePath(
  colorSlug: string,
  side: Side,
): string {
  return `${GEOMETRY_V2_ASSET_ROOT}/${buildGeometryV2AssetFileName(colorSlug, side)}`;
}

/** All UA35001 preview color slugs measured in regression. */
export const GEOMETRY_V2_COLOR_SLUGS = [
  "white",
  "black",
  "pink",
  "hotpink",
  "heathergray",
  "yellow",
  "mint",
  "skyblue",
  "lightblue",
  "indigo",
] as const;

export type GeometryV2ColorSlug = (typeof GEOMETRY_V2_COLOR_SLUGS)[number];
