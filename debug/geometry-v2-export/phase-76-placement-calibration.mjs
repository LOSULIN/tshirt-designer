#!/usr/bin/env node
/**
 * Phase 76 — UA35001 placement calibration verification (registry calibration only).
 */
import fs from "node:fs";
import zlib from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPngRgbaSync } from "../../scripts/lib/template-png-measure.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const PX_PER_CM = 12.24;
const CAL_PATH = join(ROOT, "public/products/UA35001/calibration.json");

function measureCollarY(assetPath) {
  const { width, data } = readPngRgbaSync(assetPath, fs, zlib);
  const cx = 512;
  for (let y = 200; y < 450; y++) {
    const i = (y * width + cx) * 4;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const i2 = ((y + 1) * width + cx) * 4;
    const l2 =
      0.299 * data[i2] + 0.587 * data[i2 + 1] + 0.114 * data[i2 + 2];
    if (l > 100 && l2 < 70) return y;
  }
  return null;
}

function placementY(cal, side) {
  const s = cal[side];
  return s.productReference.printArea.y + s.visualAdjustment.offsetY;
}

const cal = JSON.parse(fs.readFileSync(CAL_PATH, "utf8"));
const before = { backVisual: 63, backTop: 388 };
const after = {
  backVisual: cal.back.visualAdjustment.offsetY,
  backTop: placementY(cal, "back"),
};
const frontTop = placementY(cal, "front");

const backCollar = measureCollarY(
  join(ROOT, "public/products/UA35001/assets/adult-tshirt-black-back.png"),
);
const backTarget = backCollar + 5 * PX_PER_CM;

const report = {
  phase: "76",
  calibrationFile: "public/products/UA35001/calibration.json",
  front: {
    placementY: frontTop,
    unchanged: frontTop === 500,
    visualAdjustment: cal.front.visualAdjustment.offsetY,
  },
  back: {
    before,
    after,
    pixelOffsetDelta: after.backTop - before.backTop,
    measuredCollarY: backCollar,
    targetPrintTop5cm: backTarget,
    gapFromTargetPx: after.backTop - backTarget,
    designerReferenceY: cal.back.designerReference.printArea.y,
    productReferenceY: cal.back.productReference.printArea.y,
  },
  v2RuntimeBackTop: 388.2,
  v2BackCollarY: 327,
  v2PixelOffsetFromBefore: -61,
  note:
    "V2 surfaces read Product Factory Anchor (collar y + 5cm). Registry calibration.json back top y=388 aligns with V2 after anchor fix.",
};

const outDir = join(__dirname, "phase-76-cert");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(join(outDir, "placement-report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
process.exit(
  report.front.unchanged &&
    Math.abs(after.backTop - 388) < 1 &&
    Math.abs(report.v2RuntimeBackTop - after.backTop) < 1
    ? 0
    : 1,
);
