/**
 * Server-side Product Registry garment asset loader (filesystem).
 * Used where fetch/loadAsset is unavailable (e.g. Factory Proof PDF).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ShirtColor, Side } from "@/lib/constants";
import {
  buildGeometryV2AssetFileName,
  GEOMETRY_V2_PRODUCT_CODE,
} from "@/lib/designer-geometry-v2/constants";

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

export function resolveRegistryGarmentAssetPublicPath(
  shirtColor: ShirtColor,
  side: Side,
  productCode: string = GEOMETRY_V2_PRODUCT_CODE,
): string {
  const slug = DESIGNER_SHIRT_COLOR_TO_UA35001_SLUG[shirtColor];
  return `/products/${productCode}/assets/${buildGeometryV2AssetFileName(slug, side)}`;
}

export function loadRegistryGarmentAssetBytes(
  shirtColor: ShirtColor,
  side: Side,
  productCode: string = GEOMETRY_V2_PRODUCT_CODE,
): Buffer | null {
  try {
    const src = resolveRegistryGarmentAssetPublicPath(
      shirtColor,
      side,
      productCode,
    );
    const filePath = join(process.cwd(), "public", src.replace(/^\//, ""));
    return readFileSync(filePath);
  } catch {
    return null;
  }
}
