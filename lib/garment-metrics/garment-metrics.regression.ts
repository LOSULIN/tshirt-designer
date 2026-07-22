/**
 * Garment Metrics Layer regression — 14 sizes + M identity + ratio contract.
 * Run: npx tsx lib/garment-metrics/garment-metrics.regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  getDesignerBlueVisualRenderSizePx,
  getGarmentVisualRenderHeightPx,
  getGarmentVisualRenderWidthPx,
} from "@/lib/garment-visual-profile";
import { parseProductCalibration } from "@/lib/render/calibration";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  scalePlacementRectForGarmentSize,
  resolveGarmentBluePrintAreaCm,
} from "@/lib/render/product-placement-scale";
import { resolveProductMockupPlacement } from "@/lib/render/visual-adjustment";
import { applyMockupVisualCompensation } from "@/lib/render/visual-compensation";
import {
  METRICS_BASELINE_SIZE,
  resolveBaselineGarmentMetrics,
  resolveGarmentMetrics,
  resolveMockupComposeFrames,
} from "./index";

const ROOT = process.cwd();
const SIZES = [
  "90",
  "110",
  "130",
  "150",
  "160",
  "GS",
  "GM",
  "GL",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
] as const;

const RATIO_TOLERANCE = 0.01;
const PX_TOLERANCE = 0.5;
const PREVIEW_WIDTH = 1024;
const PREVIEW_HEIGHT = 1536;
const MOCKUP_SCALE = 1.0568;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function approxEqual(a: number, b: number, epsilon = PX_TOLERANCE): boolean {
  return Math.abs(a - b) < epsilon;
}

function ratioDelta(a: number, b: number): number {
  return Math.abs(a - b);
}

function runRegression(): { pass: boolean; checks: string[] } {
  const checks: string[] = [];

  for (const size of SIZES) {
    const metrics = resolveGarmentMetrics({ size, side: "front" });
    const officialWR = metrics.printWidthCm / metrics.bodyWidthCm;
    const officialHR = metrics.printHeightCm / metrics.bodyHeightCm;

    assert(
      ratioDelta(metrics.ratios.printWidthToBodyWidth, officialWR) < 1e-9,
      `${size}: internal width ratio`,
    );
    assert(
      ratioDelta(metrics.ratios.printHeightToBodyHeight, officialHR) < 1e-9,
      `${size}: internal height ratio`,
    );
    assert(
      ratioDelta(metrics.printWidthPx / metrics.bodyWidthPx, officialWR) <
        RATIO_TOLERANCE,
      `${size}: BlueWidth/ChestWidth px ratio within 1%`,
    );
    assert(
      ratioDelta(metrics.printHeightPx / metrics.bodyHeightPx, officialHR) <
        RATIO_TOLERANCE,
      `${size}: BlueHeight/Length px ratio within 1%`,
    );

    const designerBlue = getDesignerBlueVisualRenderSizePx(size);
    const designerGarmentW = getGarmentVisualRenderWidthPx(size);
    const designerGarmentH = getGarmentVisualRenderHeightPx(size);

    assert(
      approxEqual(metrics.bodyWidthPx, designerGarmentW, 0.01),
      `${size}: bodyWidthPx matches garment-visual-profile`,
    );
    assert(
      approxEqual(metrics.bodyHeightPx, designerGarmentH, 0.01),
      `${size}: bodyHeightPx matches garment-visual-profile`,
    );
    assert(
      approxEqual(metrics.printWidthPx, designerBlue.widthPx, 0.01),
      `${size}: printWidthPx matches garment-visual-profile`,
    );
    assert(
      approxEqual(metrics.printHeightPx, designerBlue.heightPx, 0.01),
      `${size}: printHeightPx matches garment-visual-profile`,
    );
  }
  checks.push("14 sizes: official ratio < 1% + aligned with garment-visual-profile");

  const metricsSource = readFileSync(
    join(ROOT, "lib/garment-metrics/resolve-garment-metrics.ts"),
    "utf8",
  );
  const allowedImportPatterns = [
    /@\/lib\/product-size-config/,
    /@\/lib\/designer-print-area-config/,
    /import type \{ Side \} from "@\/lib\/constants"/,
    /\.\/constants/,
    /\.\/types/,
  ];
  const importBlocks =
    metricsSource.match(/import[\s\S]*?from\s+["'][^"']+["'];?/g) ?? [];
  for (const block of importBlocks) {
    assert(
      allowedImportPatterns.some((pattern) => pattern.test(block)),
      `illegal garment-metrics import: ${block.trim()}`,
    );
  }
  checks.push("garment-metrics import boundary (size-config + print-area-config only)");

  const cal = parseProductCalibration(
    JSON.parse(
      readFileSync(
        join(ROOT, "public/products/UA35001/calibration.json"),
        "utf8",
      ),
    ),
  );
  const mBaseline = resolveProductMockupPlacement(cal, "front");
  const mPrint = resolveGarmentBluePrintAreaCm(PRODUCT_PLACEMENT_BASELINE_SIZE, "front");

  const mMetrics = resolveGarmentMetrics({ size: "M", side: "front" });
  const mBaselineMetrics = resolveBaselineGarmentMetrics("front");
  const mScaled = scalePlacementRectForGarmentSize(mBaseline!, mPrint, mPrint);
  const mDest = applyMockupVisualCompensation(mScaled, MOCKUP_SCALE);
  const mFrames = resolveMockupComposeFrames({
    metrics: mMetrics,
    baselineMetrics: mBaselineMetrics,
    placementRect: mDest,
    assetWidth: PREVIEW_WIDTH,
    assetHeight: PREVIEW_HEIGHT,
  });

  assert(
    approxEqual(mFrames.garmentFrame.x, 0) &&
      approxEqual(mFrames.garmentFrame.y, 0) &&
      approxEqual(mFrames.garmentFrame.width, PREVIEW_WIDTH) &&
      approxEqual(mFrames.garmentFrame.height, PREVIEW_HEIGHT),
    "M garment frame = full canvas (identity)",
  );
  assert(
    mFrames.artworkFrame !== null &&
      approxEqual(mFrames.artworkFrame.x, mDest.x, 0.01) &&
      approxEqual(mFrames.artworkFrame.y, mDest.y, 0.01) &&
      approxEqual(mFrames.artworkFrame.width, mDest.width, 0.01) &&
      approxEqual(mFrames.artworkFrame.height, mDest.height, 0.01),
    "M artwork frame = frozen placement pipeline (identity)",
  );
  checks.push("M identity: compose frames unchanged");

  const composeSource = readFileSync(
    join(ROOT, "lib/render/product-mockup-compose.ts"),
    "utf8",
  );
  assert(
    composeSource.includes("resolveGarmentMetrics"),
    "compose reads Garment Metrics Layer",
  );
  assert(
    composeSource.includes("resolveMockupComposeFrames"),
    "compose uses metrics bridge (no local ratio math)",
  );
  assert(
    !composeSource.includes("findProductSizeRow"),
    "compose does not derive ratios locally",
  );
  checks.push("composeProductMockup draw-only + metrics read contract");

  assert(METRICS_BASELINE_SIZE === "M", "baseline size is M");
  checks.push("baseline M");

  return { pass: true, checks };
}

const result = runRegression();
console.log("Garment Metrics regression:", result.pass ? "PASS" : "FAIL");
for (const check of result.checks) {
  console.log(`  ✓ ${check}`);
}
if (!result.pass) process.exit(1);
