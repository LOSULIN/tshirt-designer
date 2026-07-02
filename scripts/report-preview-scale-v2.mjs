#!/usr/bin/env node
/**
 * Step 10.2B-4 — Preview Scale V1 vs V2 comparison report（不修改 runtime）
 * 複製 getPreviewPrintAreaScale / getPreviewPrintAreaScaleV2 公式
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_JSON = path.join(ROOT, "public/guides/preview-scale-v2-report.json");

/** Console summary order */
const SIZES = ["90", "130", "GM", "M", "XL", "XXXL"];

const CONTAINER = { width: 1024, height: 1536 };
const MIN_PREVIEW_PRINT_AREA_SCALE = 0.85;
const SILHOUETTE_SCALE = 1.1127;
const ARMPIT_CHEST_WIDTH_PX = 550;
const BLUE_CM = { width: 35, height: 50 };
const PX_PER_CM = 12.24;
const SIDE = "front";

function round(n, d = 4) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pct(num, den) {
  return den ? round((num / den) * 100, 1) : null;
}

function parseProductChestBySize() {
  const src = fs.readFileSync(
    path.join(ROOT, "lib/product-size-config.ts"),
    "utf8",
  );
  const map = {};
  const re = /size:\s*"([^"]+)"[\s\S]*?chest:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

function getShirtScale(size, baselineChestCm, chestBySize) {
  const chest = chestBySize[size];
  if (chest == null) throw new Error(`Unknown size: ${size}`);
  return chest / baselineChestCm;
}

/** V1 — mirrors getPreviewPrintAreaScale() */
function getPreviewPrintAreaScaleV1(shirtScale) {
  return Math.max(MIN_PREVIEW_PRINT_AREA_SCALE, shirtScale);
}

/** V2 — mirrors getPreviewPrintAreaScaleV2() */
function getPreviewPrintAreaScaleV2(shirtScale) {
  return shirtScale;
}

function getBaseWidthPct() {
  return (BLUE_CM.width * PX_PER_CM) / CONTAINER.width;
}

function getBaseHeightPct() {
  return (BLUE_CM.height * PX_PER_CM) / CONTAINER.height;
}

function computeBluePx(blueScale) {
  const baseWPct = getBaseWidthPct();
  const baseHPct = getBaseHeightPct();
  return {
    blueWidthPx: round(CONTAINER.width * baseWPct * blueScale, 1),
    blueHeightPx: round(CONTAINER.height * baseHPct * blueScale, 1),
  };
}

function buildSizeRow(size, baselineChestCm, chestBySize) {
  const shirtScale = getShirtScale(size, baselineChestCm, chestBySize);
  const shirtVisualScale = shirtScale * SILHOUETTE_SCALE;
  const shirtArmpitWidthPx = ARMPIT_CHEST_WIDTH_PX * shirtVisualScale;

  const v1Scale = getPreviewPrintAreaScaleV1(shirtScale);
  const v2Scale = getPreviewPrintAreaScaleV2(shirtScale);
  const v1Px = computeBluePx(v1Scale);
  const v2Px = computeBluePx(v2Scale);

  const widthPxDiff = round(v2Px.blueWidthPx - v1Px.blueWidthPx, 1);
  const heightPxDiff = round(v2Px.blueHeightPx - v1Px.blueHeightPx, 1);

  const blueOverShirtWidthPctV1 = pct(v1Px.blueWidthPx, shirtArmpitWidthPx);
  const blueOverShirtWidthPctV2 = pct(v2Px.blueWidthPx, shirtArmpitWidthPx);

  return {
    size,
    officialChestCm: chestBySize[size],
    side: SIDE,
    shirtScale: round(shirtScale),
    shirtArmpitWidthPx: round(shirtArmpitWidthPx, 1),
    v1: {
      blueScale: round(v1Scale),
      blueWidthPx: v1Px.blueWidthPx,
      blueHeightPx: v1Px.blueHeightPx,
      blueOverShirtWidthPct: blueOverShirtWidthPctV1,
    },
    v2: {
      blueScale: round(v2Scale),
      blueWidthPx: v2Px.blueWidthPx,
      blueHeightPx: v2Px.blueHeightPx,
      blueOverShirtWidthPct: blueOverShirtWidthPctV2,
    },
    difference: {
      widthPx: widthPxDiff,
      heightPx: heightPxDiff,
      widthPercent: pct(widthPxDiff, v1Px.blueWidthPx),
      heightPercent: pct(heightPxDiff, v1Px.blueHeightPx),
      blueScaleDelta: round(v2Scale - v1Scale),
    },
    blueOverShirtWidthPct: {
      v1: blueOverShirtWidthPctV1,
      v2: blueOverShirtWidthPctV2,
      delta: round(blueOverShirtWidthPctV2 - blueOverShirtWidthPctV1, 1),
    },
  };
}

function printConsoleSummary(rows) {
  console.log("\nPreview Scale V1 vs V2 Summary\n");
  for (const row of rows) {
    console.log(`--- ${row.size} ---`);
    console.log(`shirtScale=${row.shirtScale}`);
    console.log(
      `V1: scale=${row.v1.blueScale} ${row.v1.blueWidthPx}×${row.v1.blueHeightPx}px | Blue/Shirt ${row.blueOverShirtWidthPct.v1}%`,
    );
    console.log(
      `V2: scale=${row.v2.blueScale} ${row.v2.blueWidthPx}×${row.v2.blueHeightPx}px | Blue/Shirt ${row.blueOverShirtWidthPct.v2}%`,
    );
    console.log(
      `Δ: ${row.difference.widthPx}px (${row.difference.widthPercent}%) × ${row.difference.heightPx}px (${row.difference.heightPercent}%)`,
    );
  }
}

function main() {
  const chestBySize = parseProductChestBySize();
  const baselineChestCm = chestBySize.M;
  if (!baselineChestCm) {
    throw new Error("Cannot resolve M baseline chest from product-size-config");
  }

  const sizes = SIZES.map((size) => buildSizeRow(size, baselineChestCm, chestBySize));

  const report = {
    schema: "preview-scale-v2-report/v1",
    generatedAt: new Date().toISOString(),
    side: SIDE,
    formulas: {
      shirtScale: "officialChestCm / M baseline chest (getShirtScale)",
      v1BlueScale: "max(0.85, shirtScale) — getPreviewPrintAreaScale()",
      v2BlueScale: "shirtScale — getPreviewPrintAreaScaleV2()",
      blueWidthPx: "1024 × (35×12.24/1024) × blueScale",
      blueHeightPx: "1536 × (50×12.24/1536) × blueScale",
      shirtArmpitWidthPx: "550 × shirtScale × silhouetteScale(1.1127)",
      blueOverShirtWidthPct: "blueWidthPx / shirtArmpitWidthPx × 100",
    },
    constants: {
      container: CONTAINER,
      minPreviewPrintAreaScale: MIN_PREVIEW_PRINT_AREA_SCALE,
      silhouetteScale: SILHOUETTE_SCALE,
      pxPerCm: PX_PER_CM,
      blueCm: BLUE_CM,
    },
    sizes,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Preview Scale V2 Comparison Report");
  console.log(`JSON: ${OUT_JSON}`);
  printConsoleSummary(sizes);
}

main();
