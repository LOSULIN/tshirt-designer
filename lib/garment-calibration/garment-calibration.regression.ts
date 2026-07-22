/**
 * Garment Frame Calibration regression — 14 sizes + M identity + metrics alignment.
 * Run: npx tsx lib/garment-calibration/garment-calibration.regression.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  METRICS_BASELINE_SIZE,
  resolveBaselineGarmentMetrics,
  resolveGarmentMetrics,
} from "@/lib/garment-metrics";
import { parseProductCalibration } from "@/lib/render/calibration";
import {
  PRODUCT_PLACEMENT_BASELINE_SIZE,
  resolveGarmentBluePrintAreaCm,
  scalePlacementRectForGarmentSize,
} from "@/lib/render/product-placement-scale";
import { resolveProductMockupPlacement } from "@/lib/render/visual-adjustment";
import { applyMockupVisualCompensation } from "@/lib/render/visual-compensation";
import {
  resolveGarmentComposeFrames,
  resolveGarmentPhotoFrame,
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

function runRegression(): { pass: boolean; checks: string[] } {
  const checks: string[] = [];
  const baselineMetrics = resolveBaselineGarmentMetrics("front");

  const cal = parseProductCalibration(
    JSON.parse(
      readFileSync(
        join(ROOT, "public/products/UA35001/calibration.json"),
        "utf8",
      ),
    ),
  );
  const mPlacementBase = resolveProductMockupPlacement(cal, "front");
  const mPrint = resolveGarmentBluePrintAreaCm(PRODUCT_PLACEMENT_BASELINE_SIZE, "front");
  const mScaled = scalePlacementRectForGarmentSize(mPlacementBase!, mPrint, mPrint);
  const mPlacement = applyMockupVisualCompensation(mScaled, MOCKUP_SCALE);

  for (const size of SIZES) {
    const metrics = resolveGarmentMetrics({ size, side: "front" });
    const photo = resolveGarmentPhotoFrame({
      metrics,
      baselineMetrics,
      assetWidth: PREVIEW_WIDTH,
      assetHeight: PREVIEW_HEIGHT,
      baselinePlacementRect: size === "M" ? mPlacement : null,
    });

    assert(
      approxEqual(
        photo.printToBodyWidthRatio,
        metrics.ratios.printWidthToBodyWidth,
        1e-6,
      ),
      `${size}: print/body width ratio from metrics`,
    );
    assert(
      approxEqual(
        photo.printToBodyHeightRatio,
        metrics.ratios.printHeightToBodyHeight,
        1e-6,
      ),
      `${size}: print/body height ratio from metrics`,
    );

    const photoPrintWRatio = photo.printWidth / photo.photoWidth;
    const photoPrintHRatio = photo.printHeight / photo.photoHeight;
    if (size !== "M") {
      assert(
        Math.abs(photoPrintWRatio - metrics.ratios.printWidthToBodyWidth) <
          RATIO_TOLERANCE,
        `${size}: photo print/garment width ratio within 1%`,
      );
      assert(
        Math.abs(photoPrintHRatio - metrics.ratios.printHeightToBodyHeight) <
          RATIO_TOLERANCE,
        `${size}: photo print/garment height ratio within 1%`,
      );
    }

    assert(
      photo.photoWidth === photo.garmentPhotoBounds.width &&
        photo.photoHeight === photo.garmentPhotoBounds.height,
      `${size}: photoWidth/Height match garmentPhotoBounds`,
    );
    assert(
      photo.printWidth === photo.printPhotoBounds.width &&
        photo.printHeight === photo.printPhotoBounds.height,
      `${size}: printWidth/Height match printPhotoBounds`,
    );
  }
  checks.push("14 sizes: garment/print photo frames align with Garment Metrics ratios");

  const mMetrics = resolveGarmentMetrics({ size: "M", side: "front" });
  const mFrames = resolveGarmentComposeFrames({
    metrics: mMetrics,
    baselineMetrics,
    placementRect: mPlacement,
    assetWidth: PREVIEW_WIDTH,
    assetHeight: PREVIEW_HEIGHT,
  });

  assert(
    approxEqual(mFrames.garmentFrame.x, 0) &&
      approxEqual(mFrames.garmentFrame.y, 0) &&
      approxEqual(mFrames.garmentFrame.width, PREVIEW_WIDTH) &&
      approxEqual(mFrames.garmentFrame.height, PREVIEW_HEIGHT),
    "M garment frame = full canvas",
  );
  assert(
    approxEqual(mFrames.artworkFrame!.x, mPlacement.x, 0.01) &&
      approxEqual(mFrames.artworkFrame!.y, mPlacement.y, 0.01) &&
      approxEqual(mFrames.artworkFrame!.width, mPlacement.width, 0.01) &&
      approxEqual(mFrames.artworkFrame!.height, mPlacement.height, 0.01),
    "M artwork frame = frozen placement (identity)",
  );
  checks.push("M identity PASS");

  const s90 = resolveGarmentPhotoFrame({
    metrics: resolveGarmentMetrics({ size: "90", side: "front" }),
    baselineMetrics,
    assetWidth: PREVIEW_WIDTH,
    assetHeight: PREVIEW_HEIGHT,
    baselinePlacementRect: null,
  });
  assert(
    s90.photoWidth < mFrames.garmentFrame.width,
    "90 garment photo narrower than M canvas",
  );
  assert(
    s90.printToBodyWidthRatio > 0.6 && s90.printToBodyWidthRatio < 0.65,
    "90 maintains official ~62% print/body width ratio",
  );
  checks.push("90 garment frame smaller with correct print/body ratio");

  const composeSource = readFileSync(
    join(ROOT, "lib/render/product-mockup-compose.ts"),
    "utf8",
  );
  assert(
    composeSource.includes("resolveGarmentMetrics"),
    "compose reads Garment Metrics",
  );
  assert(
    composeSource.includes("resolveMockupComposeFrames"),
    "compose uses calibration bridge",
  );
  assert(!composeSource.includes("findProductSizeRow"), "compose has no ratio math");
  assert(!composeSource.includes("lerp("), "compose has no geometry math");
  checks.push("compose draw-only contract");

  const calibrationSource = readFileSync(
    join(ROOT, "lib/garment-calibration/constants.ts"),
    "utf8",
  );
  assert(
    calibrationSource.includes("calibration.json"),
    "photo baseline traces to calibration.json",
  );
  checks.push("calibration constants traceable to calibration.json");

  assert(METRICS_BASELINE_SIZE === "M", "baseline is M");

  return { pass: true, checks };
}

const result = runRegression();
console.log("Garment Frame Calibration regression:", result.pass ? "PASS" : "FAIL");
for (const check of result.checks) {
  console.log(`  ✓ ${check}`);
}
if (!result.pass) process.exit(1);
