/**
 * Designer Geometry V2 — V1/V2 overlay color mapping (UA slug ↔ template slug).
 */

export const GEOMETRY_OVERLAY_COLOR_PAIRS = [
  { uaSlug: "white", templateSlug: "white" },
  { uaSlug: "black", templateSlug: "black" },
  { uaSlug: "pink", templateSlug: "pink" },
  { uaSlug: "hotpink", templateSlug: "hot-pink" },
  { uaSlug: "heathergray", templateSlug: "heather-grey" },
  { uaSlug: "yellow", templateSlug: "light-yellow" },
  { uaSlug: "mint", templateSlug: "mustard-green" },
  { uaSlug: "skyblue", templateSlug: "sky-blue" },
  { uaSlug: "lightblue", templateSlug: "royal-blue" },
  { uaSlug: "indigo", templateSlug: "navy" },
] as const;

export function resolveTemplateSlugForUa(uaSlug: string): string {
  const pair = GEOMETRY_OVERLAY_COLOR_PAIRS.find((p) => p.uaSlug === uaSlug);
  return pair?.templateSlug ?? uaSlug;
}

export function buildTemplateAssetRelativePath(
  templateSlug: string,
  side: "front" | "back",
): string {
  return `public/templates/adult-tshirt-${templateSlug}-${side}.png`;
}

export const GEOMETRY_OVERLAY_OUTPUT_DIR =
  "debug/geometry-overlay" as const;

export const GEOMETRY_OVERLAY_V1_COLOR = "#ef4444";

export const GEOMETRY_OVERLAY_V2_COLOR = "#2563eb";
