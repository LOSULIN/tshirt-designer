#!/usr/bin/env node
/**
 * 各尺碼 Preview 校正報告：PNG 胸寬、藍框、橘框（正面 @ white-front profile）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCodebaseCalibrationConstants } from "./lib/read-calibration-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SIZES = ["90", "130", "GM", "M", "XL", "XXXL"];
const MIN_PREVIEW_PRINT_AREA_SCALE = 0.85;
const SAFE_ZONE_M_FRONT_CM = 26;

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
  const re =
    /size:\s*"([^"]+)"[\s\S]*?chest:\s*([\d.]+)/g;
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

function getSafeWidthCmFront(size, baselineChestCm, chestBySize) {
  const chest = chestBySize[size];
  return SAFE_ZONE_M_FRONT_CM * (chest / baselineChestCm);
}

function main() {
  const profilePath = path.join(
    ROOT,
    "public/template-profiles/adult-white-front.json",
  );
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const codebase = readCodebaseCalibrationConstants(ROOT);
  const pcs = codebase.printCoordinateSystem;

  const baselineChestPx = profile.garment.armpitChestWidthPx;
  const silhouetteScale = profile.measurement.silhouetteScale ?? 1;
  const pxPerCm = pcs.pxPerCm;
  const blueBoxCm = pcs.blueBoxCm.front.widthCm;
  const baselineChestCm = profile.garment.baselineChestCm;
  const chestBySize = parseProductChestBySize();

  const rows = SIZES.map((size) => {
    const shirtScale = getShirtScale(size, baselineChestCm, chestBySize);
    const previewScale = getPreviewPrintAreaScale(shirtScale);
    const pngChestPx = baselineChestPx * shirtScale * silhouetteScale;
    const blueBoxPx = blueBoxCm * pxPerCm * previewScale;
    const safeWidthCm = getSafeWidthCmFront(
      size,
      baselineChestCm,
      chestBySize,
    );
    const orangeBoxPx = safeWidthCm * pxPerCm * previewScale;

    return {
      size,
      officialChestCm: chestBySize[size],
      shirtScale: round(shirtScale, 4),
      previewPrintAreaScale: round(previewScale, 4),
      pngChestPx: round(pngChestPx, 1),
      blueBoxPx: round(blueBoxPx, 1),
      orangeBoxPx: round(orangeBoxPx, 1),
      orangeOverChestPct: pct(orangeBoxPx, pngChestPx),
      blueOverChestPct: pct(blueBoxPx, pngChestPx),
    };
  });

  const report = {
    schema: "size-calibration-report/v1",
    side: "front",
    templateProfile: profile.id,
    assumptions: {
      baselineArmpitChestPx: baselineChestPx,
      silhouetteScale,
      printPxPerCm: pxPerCm,
      blueBoxCm,
      safeZoneBaselineMFrontCm: SAFE_ZONE_M_FRONT_CM,
      minPreviewPrintAreaScale: MIN_PREVIEW_PRINT_AREA_SCALE,
      formulas: {
        pngChestPx: "baselineArmpitChestPx × shirtScale × silhouetteScale",
        blueBoxPx: "blueBoxCm × pxPerCm × previewPrintAreaScale",
        orangeBoxPx: "safeWidthCm × pxPerCm × previewPrintAreaScale",
        previewPrintAreaScale: "max(0.85, shirtScale)",
        shirtScale: "officialChestCm / baselineChestCm (52)",
      },
    },
    rows,
  };

  const outJson = path.join(ROOT, "public/guides/size-calibration-report.json");
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);

  const header = [
    "size",
    "PNG胸寬(px)",
    "藍框(px)",
    "橘框(px)",
    "橘框/胸寬%",
    "藍框/胸寬%",
  ].join("\t");

  const lines = rows.map((r) =>
    [
      r.size,
      r.pngChestPx,
      r.blueBoxPx,
      r.orangeBoxPx,
      r.orangeOverChestPct,
      r.blueOverChestPct,
    ].join("\t"),
  );

  console.log("Size Calibration Report (front · adult-white-front)\n");
  console.log(header);
  console.log(lines.join("\n"));
  console.log(`\nJSON: ${outJson}`);
}

main();
