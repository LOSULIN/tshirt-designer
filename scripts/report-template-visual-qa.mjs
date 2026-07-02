#!/usr/bin/env node
/**
 * Template Visual QA Report — 各尺碼 Preview 衣身／藍框／橘框尺寸對照
 * 正面 · adult-white-front · 現行 runtime 公式
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCodebaseCalibrationConstants } from "./lib/read-calibration-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SIZES = ["90", "130", "GM", "M", "XL", "XXXL"];
const MIN_PREVIEW_PRINT_AREA_SCALE = 0.85;
const SAFE_ZONE_M_FRONT_CM = { widthCm: 26, heightCm: 40 };

function round(n, d = 1) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return round((numerator / denominator) * 100, 1);
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
  if (chest == null) throw new Error(`Missing chest for size ${size}`);
  return chest / baselineChestCm;
}

function getPreviewPrintAreaScale(shirtScale) {
  return Math.max(MIN_PREVIEW_PRINT_AREA_SCALE, shirtScale);
}

function scaleSafeZoneFront(size, baselineChestCm, chestBySize) {
  const ratio = chestBySize[size] / baselineChestCm;
  return {
    widthCm: SAFE_ZONE_M_FRONT_CM.widthCm * ratio,
    heightCm: SAFE_ZONE_M_FRONT_CM.heightCm * ratio,
  };
}

function buildRow(size, ctx) {
  const {
    baselineChestPx,
    baselineBodyLengthPx,
    silhouetteScale,
    pxPerCm,
    blueBoxCm,
    baselineChestCm,
    chestBySize,
  } = ctx;

  const shirtScale = getShirtScale(size, baselineChestCm, chestBySize);
  const previewScale = getPreviewPrintAreaScale(shirtScale);
  const visualScale = shirtScale * silhouetteScale;

  const shirtWidthPx = baselineChestPx * visualScale;
  const shirtHeightPx = baselineBodyLengthPx * visualScale;

  const blueWidthPx = blueBoxCm.widthCm * pxPerCm * previewScale;
  const blueHeightPx = blueBoxCm.heightCm * pxPerCm * previewScale;

  const safe = scaleSafeZoneFront(size, baselineChestCm, chestBySize);
  const orangeWidthPx = safe.widthCm * pxPerCm * previewScale;
  const orangeHeightPx = safe.heightCm * pxPerCm * previewScale;

  const blueOverShirtWidthPct = pct(blueWidthPx, shirtWidthPx);
  const orangeOverShirtWidthPct = pct(orangeWidthPx, shirtWidthPx);
  const orangeOverBluePct = pct(orangeWidthPx, blueWidthPx);
  const blueGreaterThanShirt = blueWidthPx > shirtWidthPx;
  const orangeGreaterThanShirt = orangeWidthPx > shirtWidthPx;

  return {
    size,
    officialChestCm: chestBySize[size],
    shirtScale: round(shirtScale, 4),
    previewPrintAreaScale: round(previewScale, 4),
    shirtWidthPx: round(shirtWidthPx, 1),
    shirtHeightPx: round(shirtHeightPx, 1),
    blueWidthPx: round(blueWidthPx, 1),
    blueHeightPx: round(blueHeightPx, 1),
    orangeWidthPx: round(orangeWidthPx, 1),
    orangeHeightPx: round(orangeHeightPx, 1),
    blueOverShirtWidthPct,
    orangeOverShirtWidthPct,
    orangeOverBluePct,
    blueGreaterThanShirt,
    orangeGreaterThanShirt,
  };
}

function main() {
  const profilePath = path.join(
    ROOT,
    "public/template-profiles/adult-white-front.json",
  );
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const codebase = readCodebaseCalibrationConstants(ROOT);
  const pcs = codebase.printCoordinateSystem;

  const ctx = {
    baselineChestPx: profile.garment.armpitChestWidthPx,
    baselineBodyLengthPx: profile.garment.bodyLengthPx,
    silhouetteScale: profile.measurement.silhouetteScale ?? 1,
    pxPerCm: pcs.pxPerCm,
    blueBoxCm: pcs.blueBoxCm.front,
    baselineChestCm: profile.garment.baselineChestCm,
    chestBySize: parseProductChestBySize(),
  };

  const rows = SIZES.map((size) => buildRow(size, ctx));

  const report = {
    schema: "template-visual-qa-report/v1",
    title: "Template Visual QA Report",
    side: "front",
    templateProfile: profile.id,
    assumptions: {
      baselineArmpitChestPx: ctx.baselineChestPx,
      baselineBodyLengthPx: ctx.baselineBodyLengthPx,
      silhouetteScale: ctx.silhouetteScale,
      printPxPerCm: ctx.pxPerCm,
      blueBoxCm: ctx.blueBoxCm,
      safeZoneBaselineMFrontCm: SAFE_ZONE_M_FRONT_CM,
      minPreviewPrintAreaScale: MIN_PREVIEW_PRINT_AREA_SCALE,
      formulas: {
        shirtWidthPx: "baselineArmpitChestPx × shirtScale × silhouetteScale",
        shirtHeightPx: "baselineBodyLengthPx × shirtScale × silhouetteScale",
        blueWidthPx: "blueWidthCm × pxPerCm × previewPrintAreaScale",
        blueHeightPx: "blueHeightCm × pxPerCm × previewPrintAreaScale",
        orangeWidthPx: "safeWidthCm × pxPerCm × previewPrintAreaScale",
        orangeHeightPx: "safeHeightCm × pxPerCm × previewPrintAreaScale",
        previewPrintAreaScale: "max(0.85, shirtScale)",
        shirtScale: "officialChestCm / 52",
      },
    },
    rows,
  };

  const outJson = path.join(
    ROOT,
    "public/guides/template-visual-qa-report.json",
  );
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Template Visual QA Report (front · adult-white-front)\n");
  console.log(
    [
      "Size",
      "Shirt W",
      "Shirt H",
      "Blue W",
      "Blue H",
      "Orange W",
      "Orange H",
      "Blue/Shirt W%",
      "Orange/Shirt W%",
      "Orange/Blue%",
      "Blue>Shirt",
      "Orange>Shirt",
    ].join("\t"),
  );

  for (const r of rows) {
    console.log(
      [
        r.size,
        r.shirtWidthPx,
        r.shirtHeightPx,
        r.blueWidthPx,
        r.blueHeightPx,
        r.orangeWidthPx,
        r.orangeHeightPx,
        r.blueOverShirtWidthPct,
        r.orangeOverShirtWidthPct,
        r.orangeOverBluePct,
        r.blueGreaterThanShirt ? "TRUE" : "FALSE",
        r.orangeGreaterThanShirt ? "TRUE" : "FALSE",
      ].join("\t"),
    );
  }

  console.log(`\nJSON: ${outJson}`);
}

main();
