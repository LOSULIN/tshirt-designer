#!/usr/bin/env node
/**
 * Phase 38 — Product Export visual calibration verification (all sizes).
 * node scripts/verify-product-export-visual-all-sizes.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PX_PER_CM = 12.24;
const SHIRT_CANVAS_W = 1024;
const EXPORT_SCALE = 2;
const BASELINE_SIZE = "M";

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
];

/** Front blue print areas — lib/designer-print-area-config.ts */
const PRINT_AREA_BY_SIZE = {
  "90": { widthCm: 18, heightCm: 24 },
  "110": { widthCm: 22, heightCm: 30 },
  "130": { widthCm: 25, heightCm: 35 },
  "150": { widthCm: 29, heightCm: 41 },
  "160": { widthCm: 32, heightCm: 44 },
  GS: { widthCm: 29, heightCm: 41 },
  GM: { widthCm: 32, heightCm: 44 },
  GL: { widthCm: 35, heightCm: 46 },
  S: { widthCm: 35, heightCm: 46 },
  M: { widthCm: 35, heightCm: 50 },
  L: { widthCm: 38, heightCm: 52 },
  XL: { widthCm: 40, heightCm: 55 },
  XXL: { widthCm: 42, heightCm: 58 },
  XXXL: { widthCm: 45, heightCm: 60 },
};

const ARTWORK_CASES = [
  { label: "5×5", widthCm: 5, heightCm: 5 },
  { label: "6×6", widthCm: 6, heightCm: 6 },
  { label: "8×8", widthCm: 8, heightCm: 8 },
  { label: "10×6", widthCm: 10, heightCm: 6 },
  { label: "10×10", widthCm: 10, heightCm: 10 },
  { label: "15×15", widthCm: 15, heightCm: 15 },
  { label: "20×20", widthCm: 20, heightCm: 20 },
  { label: "A4", widthCm: 21, heightCm: 29.7 },
  { label: "A3", widthCm: 29.7, heightCm: 42 },
];

const calibration = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "public/products/UA35001/calibration.json"),
    "utf8",
  ),
);

function resolveBaselinePlacement(calibrationScale) {
  const side = calibration.front;
  let rect = { ...side.productReference.printArea };
  rect.x = Math.round(rect.x + side.mapping.offsetX);
  rect.y = Math.round(rect.y + side.mapping.offsetY);
  rect.width = Math.round(rect.width * side.mapping.scaleX);
  rect.height = Math.round(rect.height * side.mapping.scaleY);
  if (calibrationScale !== 1) {
    rect = {
      x: Math.round(rect.x * calibrationScale),
      y: Math.round(rect.y * calibrationScale),
      width: Math.round(rect.width * calibrationScale),
      height: Math.round(rect.height * calibrationScale),
    };
  }
  const va = side.visualAdjustment;
  rect.x = Math.round(rect.x + Math.round(va.offsetX * calibrationScale));
  rect.y = Math.round(rect.y + Math.round(va.offsetY * calibrationScale));
  return rect;
}

function scalePlacementForGarmentSize(rect, garmentSize) {
  const baseline = PRINT_AREA_BY_SIZE[BASELINE_SIZE];
  const current = PRINT_AREA_BY_SIZE[garmentSize];
  const scaleW = current.widthCm / baseline.widthCm;
  const scaleH = current.heightCm / baseline.heightCm;
  const centerX = rect.x + rect.width / 2;
  const width = Math.round(rect.width * scaleW);
  const height = Math.round(rect.height * scaleH);
  return {
    x: Math.round(centerX - width / 2),
    y: rect.y,
    width,
    height,
  };
}

const previewBaseline = resolveBaselinePlacement(1);
const exportBaseline = resolveBaselinePlacement(EXPORT_SCALE);

function designerArtworkPx(artW, artH) {
  return { widthPx: artW * PX_PER_CM, heightPx: artH * PX_PER_CM };
}

function productArtworkPx(artW, artH, garment, placement) {
  return {
    widthPx: (artW / garment.widthCm) * placement.width,
    heightPx: (artH / garment.heightCm) * placement.height,
  };
}

function ratio(artPx, shirtPx) {
  return (artPx / shirtPx) * 100;
}

function pctDiff(previewRatio, designerRatio) {
  if (designerRatio === 0) return 0;
  return ((previewRatio - designerRatio) / designerRatio) * 100;
}

function round(n, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

const rows = [];

for (const size of SIZES) {
  const garment = PRINT_AREA_BY_SIZE[size];
  const previewPlacement = scalePlacementForGarmentSize(previewBaseline, size);
  const exportPlacement = scalePlacementForGarmentSize(exportBaseline, size);

  for (const art of ARTWORK_CASES) {
    const d = designerArtworkPx(art.widthCm, art.heightCm);
    const p = productArtworkPx(
      art.widthCm,
      art.heightCm,
      garment,
      previewPlacement,
    );
    const dl = productArtworkPx(
      art.widthCm,
      art.heightCm,
      garment,
      exportPlacement,
    );

    const designerRatio = ratio(d.widthPx, SHIRT_CANVAS_W);
    const previewRatio = ratio(p.widthPx, SHIRT_CANVAS_W);
    const downloadRatio = ratio(dl.widthPx / EXPORT_SCALE, SHIRT_CANVAS_W);

    const diffPreview = pctDiff(previewRatio, designerRatio);
    const diffDownload = pctDiff(downloadRatio, designerRatio);

    rows.push({
      size,
      artwork: art.label,
      designerRatioPct: round(designerRatio),
      previewRatioPct: round(previewRatio),
      downloadRatioPct: round(downloadRatio),
      visualErrorPct: round(diffPreview),
      previewVsDownloadPct: round(pctDiff(downloadRatio, previewRatio)),
      designerArtworkWidthPx: round(d.widthPx),
      previewArtworkWidthPx: round(p.widthPx),
      downloadArtworkWidthPx: round(dl.widthPx),
    });
  }
}

const errors = rows.map((r) => Math.abs(r.visualErrorPct));
const avgError = round(errors.reduce((a, b) => a + b, 0) / errors.length, 4);
const maxError = round(Math.max(...errors), 4);
const minError = round(Math.min(...errors), 4);

const overThreshold = rows.filter((r) => Math.abs(r.visualErrorPct) > 2);

const buckets = {
  "0~2%": rows.filter((r) => Math.abs(r.visualErrorPct) <= 2).length,
  "2~5%": rows.filter(
    (r) => Math.abs(r.visualErrorPct) > 2 && Math.abs(r.visualErrorPct) <= 5,
  ).length,
  "5~10%": rows.filter(
    (r) => Math.abs(r.visualErrorPct) > 5 && Math.abs(r.visualErrorPct) <= 10,
  ).length,
  "10%以上": rows.filter((r) => Math.abs(r.visualErrorPct) > 10).length,
};

const report = {
  phase: "38",
  testCount: rows.length,
  formulas: {
    designerArtworkWidthPx: "artW_cm * 12.24",
    productArtworkWidthPx:
      "(artW_cm / garmentPrintWidthCm) * scaledPlacementWidthPx",
    scaledPlacementWidthPx:
      "baselinePlacementWidth * (currentPrintWidthCm / baselinePrintWidthCm)",
    scaledPlacementHeightPx:
      "baselinePlacementHeight * (currentPrintHeightCm / baselinePrintHeightCm)",
    placementX: "centerX - scaledWidth/2 (top-anchored y)",
    visualErrorPct: "(previewRatio - designerRatio) / designerRatio * 100",
  },
  stats: { avgError, maxError, minError, overThresholdCount: overThreshold.length },
  buckets,
  overThreshold: overThreshold.map(
    (r) =>
      `${r.size} ${r.artwork}: ${r.visualErrorPct}% (preview ${r.previewRatioPct}% vs designer ${r.designerRatioPct}%)`,
  ),
  rows,
};

const outPath = path.join(
  ROOT,
  "public/guides/product-export-visual-all-sizes-report.json",
);
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`Phase 38 verification: ${rows.length} tests`);
console.log(`Average Error: ${avgError}%`);
console.log(`Max Error: ${maxError}%`);
console.log(`Min Error: ${minError}%`);
console.log(`Over ±2%: ${overThreshold.length}`);
console.log("Buckets:", buckets);
if (overThreshold.length > 0) {
  console.log("\nOver threshold:");
  for (const line of report.overThreshold) console.log(" ", line);
  process.exit(1);
}
console.log("\nAll tests within ±2%");
process.exit(0);
