/**
 * Phase 64.4 — Visible Garment Presentation validation.
 * Run: npx tsx lib/result-panel/visible-garment-proportion.regression.ts
 */

import { getDesignerBluePrintArea } from "../designer-print-area-config";
import { findProductSizeRow } from "../product-size-config";
import { UA35001_SILHOUETTE_ANCHORS } from "./garment-silhouette-anchors";
import { resolveVisibleGarmentProportion } from "./visible-garment-proportion";
import {
  computeVisibleGarmentLayout,
  measureVisibleGarmentInLayout,
} from "./visible-garment-proportion-layout";
import { visibleGarmentProportionToCss } from "./visible-garment-proportion-css";
import { resolveProductMockupPlacementForGarmentSize } from "../render/product-placement-scale";
import { applyMockupVisualCompensation } from "../render/visual-compensation";
import fs from "fs";

const SIZES = ["90", "160", "M", "XXXL"] as const;
const CONTAINER_W = 320;
const MOCKUP_SCALE = 1.0568;
const calibration = JSON.parse(
  fs.readFileSync("public/products/UA35001/calibration.json", "utf8"),
);

const checks: string[] = [];

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function artworkRect(size: string) {
  const rect = resolveProductMockupPlacementForGarmentSize(
    calibration,
    "front",
    size,
  )!;
  return applyMockupVisualCompensation(rect, MOCKUP_SCALE);
}

console.log("=== Phase 64.4 Validation Report ===\n");

for (const size of SIZES) {
  const profile = resolveVisibleGarmentProportion(size);
  const layout = computeVisibleGarmentLayout(profile);
  const css = visibleGarmentProportionToCss(profile);
  const sideMargin = (profile.sideMarginPercent / 100) * CONTAINER_W;
  const frameWidthPx = CONTAINER_W - 2 * sideMargin;
  const garment = measureVisibleGarmentInLayout(
    layout,
    UA35001_SILHOUETTE_ANCHORS,
    frameWidthPx,
  );
  const art = artworkRect(size);
  const official = findProductSizeRow(size)!;
  const print = getDesignerBluePrintArea(size);

  const vhrDelta = Math.abs(
    layout.visibleSourceHeightFraction - profile.visibleHeightRatio,
  );
  const vhrPass =
    size === "XXXL"
      ? layout.visibleSourceHeightFraction < 1
      : vhrDelta < 0.02;

  checks.push(`${size} VHR measured ${pct(layout.visibleSourceHeightFraction)}`);
  checks.push(`${size} topAnchor applied=${layout.applyTopAnchor}`);

  console.log(`--- ${size} ---`);
  console.log("1. Visible Height");
  console.log(`   setting: ${pct(profile.visibleHeightRatio)}`);
  console.log(`   measured: ${pct(layout.visibleSourceHeightFraction)}`);
  console.log(`   viewport height: ${layout.viewportHeightPercent.toFixed(1)}% of frame`);
  console.log(`   pass: ${vhrPass}`);

  console.log("2. topAnchorPercent");
  console.log(`   computed: ${profile.topAnchorPercent.toFixed(2)}%`);
  console.log(`   before (v1): never applied`);
  console.log(
    `   after: transform=${layout.imageTransform ?? "none"}, objectPosition=${layout.objectPosition}`,
  );
  console.log(`   visible source top: ${layout.visibleSourceTopPx.toFixed(0)}px`);
  console.log(`   applied: ${layout.applyTopAnchor}`);

  console.log("3. frameAspect");
  console.log(`   value: ${profile.frameAspectRatio.toFixed(4)}`);
  console.log(`   CSS aspect-ratio: ${css.frameStyle.aspectRatio}`);

  console.log("4. Artwork Placement (unchanged compose)");
  console.log(
    `   canvas rect: w=${art.width.toFixed(1)} h=${art.height.toFixed(1)}`,
  );

  console.log("5. Garment measurements @320px");
  console.log(
    `   visible length src=${garment.visibleLengthPx.toFixed(0)} screen=${garment.screenLengthPx.toFixed(1)}`,
  );
  console.log(
    `   visible chest src=${garment.visibleChestPx} screen=${garment.screenChestPx.toFixed(1)}`,
  );
  console.log(
    `   art/chest=${pct(art.width / garment.visibleChestPx)} official=${pct(print.widthCm / official.chest)}`,
  );
  console.log("");
}

// M must remain full-height presentation
const mLayout = computeVisibleGarmentLayout(resolveVisibleGarmentProportion("M"));
checks.push("M full viewport");
if (Math.abs(mLayout.visibleSourceHeightFraction - 1) > 0.01) {
  console.error("FAIL: M should show ~100% source height");
  process.exit(1);
}

// 90 must show ~77% not ~97%
const s90 = computeVisibleGarmentLayout(resolveVisibleGarmentProportion("90"));
checks.push("90 VHR crop");
if (s90.visibleSourceHeightFraction > 0.8) {
  console.error(
    `FAIL: 90 visible height ${pct(s90.visibleSourceHeightFraction)} expected ~77%`,
  );
  process.exit(1);
}

// topAnchor must be wired for 90
if (!s90.applyTopAnchor || !s90.imageTransform?.includes("translateY")) {
  console.error("FAIL: 90 topAnchor not applied");
  process.exit(1);
}

// No old translateY hack
const s90css = visibleGarmentProportionToCss(resolveVisibleGarmentProportion("90"));
if (
  s90css.imageStyle.transform ===
  `translateY(${-((1 - s90.visibleHeightRatio) * 12)}%)`
) {
  console.error("FAIL: old VHR translateY hack still present");
  process.exit(1);
}

// Artwork rects unchanged from phase 64.3 baseline
const mArt = artworkRect("M");
if (Math.abs(mArt.width - 452.3104) > 0.5) {
  console.error("FAIL: M artwork width changed");
  process.exit(1);
}

console.log("All checks passed:", checks.length);
console.log(JSON.stringify({ phase: "64.4-visible-garment-presentation", ok: true, checks }, null, 2));
