/**
 * Designer Template Runtime — garment asset resolver (Phase 70.0).
 *
 * Selects Designer garment PNG by Geometry Runtime version only.
 * Does not import Geometry Builder, Product Master, or Projection.
 */

import type { ShirtColor, Side } from "@/lib/constants";
import {
  buildGeometryV2AssetFileName,
  GEOMETRY_V2_PRODUCT_CODE,
} from "./constants";
import {
  DESIGNER_GEOMETRY_VERSION,
  type DesignerGeometryVersion,
} from "./geometry-version";

/** Designer shirtColor → UA35001 product asset slug (filename segment). */
const DESIGNER_SHIRT_COLOR_TO_UA35001_SLUG: Record<ShirtColor, string> = {
  white: "white",
  black: "black",
  pink: "pink",
  "hot-pink": "hotpink",
  "sky-blue": "skyblue",
  "heather-grey": "heathergray",
  "light-yellow": "yellow",
  "mustard-green": "mint",
  navy: "indigo",
  "royal-blue": "lightblue",
};

export const DESIGNER_TEMPLATE_V1_ASSET_ROOT = "/templates" as const;

export const DESIGNER_TEMPLATE_V2_ASSET_ROOT =
  `/products/${GEOMETRY_V2_PRODUCT_CODE}/assets` as const;

export interface DesignerTemplateAssetResolution {
  src: string;
  geometryVersion: DesignerGeometryVersion;
  assetRoot: typeof DESIGNER_TEMPLATE_V1_ASSET_ROOT | typeof DESIGNER_TEMPLATE_V2_ASSET_ROOT;
}

export function resolveDesignerTemplateV2AssetSrc(
  color: ShirtColor,
  side: Side,
): string {
  const slug = DESIGNER_SHIRT_COLOR_TO_UA35001_SLUG[color];
  return `${DESIGNER_TEMPLATE_V2_ASSET_ROOT}/${buildGeometryV2AssetFileName(slug, side)}`;
}

export function resolveDesignerTemplateV1AssetSrc(
  color: ShirtColor,
  side: Side,
): string {
  return `${DESIGNER_TEMPLATE_V1_ASSET_ROOT}/adult-tshirt-${color}-${side}.png`;
}

/**
 * Unified Designer garment asset resolver.
 * V1 → legacy /templates/* ; V2 → UA35001 /products/UA35001/assets/*
 */
export function resolveDesignerTemplateAsset(
  side: Side,
  color: ShirtColor,
  geometryVersion: DesignerGeometryVersion,
): string {
  if (geometryVersion === DESIGNER_GEOMETRY_VERSION.V2) {
    return resolveDesignerTemplateV2AssetSrc(color, side);
  }
  return resolveDesignerTemplateV1AssetSrc(color, side);
}

export function resolveDesignerTemplateAssetResolution(
  side: Side,
  color: ShirtColor,
  geometryVersion: DesignerGeometryVersion,
): DesignerTemplateAssetResolution {
  if (geometryVersion === DESIGNER_GEOMETRY_VERSION.V2) {
    return {
      src: resolveDesignerTemplateV2AssetSrc(color, side),
      geometryVersion,
      assetRoot: DESIGNER_TEMPLATE_V2_ASSET_ROOT,
    };
  }
  return {
    src: resolveDesignerTemplateV1AssetSrc(color, side),
    geometryVersion,
    assetRoot: DESIGNER_TEMPLATE_V1_ASSET_ROOT,
  };
}

/** Filesystem path relative to repo root (regression / asset existence checks). */
export function resolveDesignerTemplateAssetFilesystemPath(
  side: Side,
  color: ShirtColor,
  geometryVersion: DesignerGeometryVersion,
): string {
  return `public${resolveDesignerTemplateAsset(side, color, geometryVersion)}`;
}
