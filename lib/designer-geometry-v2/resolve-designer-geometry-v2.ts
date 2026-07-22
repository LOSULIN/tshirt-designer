/**
 * Designer Geometry V2 — resolver (UA35001 product preview assets).
 */

import { join } from "node:path";
import sharp from "sharp";
import type { Side } from "@/lib/constants";
import {
  GEOMETRY_V2_BASELINE_COLOR_SLUG,
  buildGeometryV2AssetRelativePath,
} from "./constants";
import {
  assertGeometryV2Canvas,
  deriveGeometryV2SilhouettePxPerCm,
  resolveGeometryV2PrintPxPerCm,
  measureAlphaSilhouetteFromBuffer,
  resolveGeometryV2PrintAreaRects,
} from "./measure-garment-alpha";
import type {
  DesignerGeometryV2Profile,
  ResolveDesignerGeometryV2Input,
} from "./types";

async function loadPngRaw(filePath: string) {
  const absolutePath = join(process.cwd(), filePath);
  const { data, info } = await sharp(absolutePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assertGeometryV2Canvas(info.width, info.height);
  return { data, width: info.width, height: info.height };
}

export async function measureDesignerGeometryV2FromAsset(
  assetRelativePath: string,
  side: Side,
  colorSlug: string,
): Promise<DesignerGeometryV2Profile> {
  const raw = await loadPngRaw(assetRelativePath);
  const measurement = measureAlphaSilhouetteFromBuffer(raw);
  const silhouettePxPerCm = deriveGeometryV2SilhouettePxPerCm(
    measurement.garmentWidthPx,
  );
  const printPxPerCm = resolveGeometryV2PrintPxPerCm();
  const printAreaRects = resolveGeometryV2PrintAreaRects(
    side,
    measurement.collarAnchor,
    printPxPerCm,
  );

  return {
    version: 2,
    side,
    colorSlug,
    sourceAsset: assetRelativePath,
    pxPerCm: printPxPerCm,
    silhouettePxPerCm,
    printAreaRects,
    ...measurement,
  };
}

export async function resolveDesignerGeometryV2(
  input: ResolveDesignerGeometryV2Input,
): Promise<DesignerGeometryV2Profile> {
  const colorSlug = input.colorSlug ?? GEOMETRY_V2_BASELINE_COLOR_SLUG;
  const assetPath =
    input.assetPath ?? buildGeometryV2AssetRelativePath(colorSlug, input.side);
  return measureDesignerGeometryV2FromAsset(assetPath, input.side, colorSlug);
}
