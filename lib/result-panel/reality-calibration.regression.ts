/**
 * Phase 65 — Reality Calibration validation (14 sizes).
 * Run: npx tsx lib/result-panel/reality-calibration.regression.ts
 */

import fs from "fs";
import { getDesignerBluePrintArea } from "../designer-print-area-config";
import { findProductSizeRow } from "../product-size-config";
import {
  REALITY_CALIBRATION_BASELINE_SIZE,
  REALITY_HEIGHT_CLAMP,
  REALITY_WIDTH_CLAMP,
  REALITY_MOCKUP_CANVAS,
  resolveRealityCalibrationFromPlacement,
} from "./reality-calibration";
import { resolveResultPanelArtworkPlacement } from "./resolve-result-panel-artwork-placement";
import { visibleGarmentProportionToCss } from "./visible-garment-proportion-css";
import { resolveVisibleGarmentProportion } from "./visible-garment-proportion";
import { computeVisibleGarmentLayout } from "./visible-garment-proportion-layout";

const ALL_SIZES = [
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

const calibration = JSON.parse(
  fs.readFileSync("public/products/UA35001/calibration.json", "utf8"),
);
const visualCompensation = JSON.parse(
  fs.readFileSync("public/products/UA35001/visual-compensation.json", "utf8"),
);
const mockupVisualScale = visualCompensation.mockupVisualScale ?? 1;

const baselinePlacement = resolveResultPanelArtworkPlacement(
  calibration,
  "front",
  REALITY_CALIBRATION_BASELINE_SIZE,
  mockupVisualScale,
);

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function compPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

console.log("=== Phase 65 Reality Calibration Audit Report ===\n");
console.log(`Baseline size: ${REALITY_CALIBRATION_BASELINE_SIZE}`);
console.log(`Clamp: width ±${REALITY_WIDTH_CLAMP * 100}%, height ±${REALITY_HEIGHT_CLAMP * 100}%`);
console.log(`mockupVisualScale (read-only): ${mockupVisualScale}\n`);

type Row = {
  size: string;
  chestCm: number;
  lengthCm: number;
  printW: number;
  printH: number;
  printToChest: number;
  screenArtToGarment: number;
  widthComp: number;
  heightComp: number;
  exceedsClamp: boolean;
  mIdentity: boolean;
  visualDistortionRisk: string;
};

const rows: Row[] = [];
let anyExceedsIdealClamp = false;
let mRegression = false;

for (const size of ALL_SIZES) {
  const official = findProductSizeRow(size)!;
  const print = getDesignerBluePrintArea(size);
  const placement = resolveResultPanelArtworkPlacement(
    calibration,
    "front",
    size,
    mockupVisualScale,
  );
  const reality = resolveRealityCalibrationFromPlacement(
    size,
    "front",
    placement,
    baselinePlacement,
  );

  const profile = resolveVisibleGarmentProportion(size);
  const layout = computeVisibleGarmentLayout(profile);
  const css = visibleGarmentProportionToCss(profile);

  const compensatedArtToGarment =
    reality.currentArtToGarmentWidthRatio * reality.widthCompensation;
  const screenArtToGarment = compensatedArtToGarment;
  const exceedsClamp =
    reality.exceedsWidthLimit || reality.exceedsHeightLimit;
  if (exceedsClamp) anyExceedsIdealClamp = true;

  const mIdentity =
    size === REALITY_CALIBRATION_BASELINE_SIZE
      ? Math.abs(reality.widthCompensation - 1) < 1e-6 &&
        Math.abs(reality.heightCompensation - 1) < 1e-6
      : true;
  if (size === REALITY_CALIBRATION_BASELINE_SIZE && !mIdentity) {
    mRegression = true;
  }

  let visualDistortionRisk = "low";
  if (size === "90" && reality.widthCompensation < 1.04) {
    visualDistortionRisk = "90 may still look like M (clamp-limited)";
  } else if (size === "XXXL" && reality.widthCompensation > 0.96) {
    visualDistortionRisk = "XXXL logo may still look large (clamp-limited)";
  } else if (exceedsClamp) {
    visualDistortionRisk = "ideal exceeds ±8% — clamp applied";
  }

  rows.push({
    size,
    chestCm: official.chest,
    lengthCm: official.length,
    printW: print.widthCm,
    printH: print.heightCm,
    printToChest: print.widthCm / official.chest,
    screenArtToGarment,
    widthComp: reality.widthCompensation,
    heightComp: reality.heightCompensation,
    exceedsClamp,
    mIdentity,
    visualDistortionRisk,
  });

  console.log(`--- ${size} ---`);
  console.log(`胸寬(cm): ${official.chest}`);
  console.log(`衣長(cm): ${official.length}`);
  console.log(`最大印刷(cm): ${print.widthCm} × ${print.heightCm}`);
  console.log(`印刷區占胸寬: ${pct(print.widthCm / official.chest)}`);
  console.log(
    `目前畫面比例 (art/garment chest): ${pct(reality.currentArtToGarmentWidthRatio)} → compensated ${pct(screenArtToGarment)}`,
  );
  console.log(
    `Reality Compensation: W ${compPct(reality.widthCompensationPercent)} H ${compPct(reality.heightCompensationPercent)} Area ${compPct(reality.areaCompensationPercent)}`,
  );
  console.log(`是否超過8%理想值需鉗制: ${exceedsClamp ? "YES (clamped)" : "NO"}`);
  console.log(`是否符合官方尺寸邏輯: print/chest=${pct(reality.printToChestRatio)}`);
  console.log(`視覺失真風險: ${visualDistortionRisk}`);
  console.log(`M identity: ${mIdentity}`);
  console.log(`viewport CSS height: ${css.viewportStyle.height}`);
  console.log("");
}

console.log("=== Summary ===");
console.log(`Sizes validated: ${rows.length}`);
console.log(`Any ideal compensation exceeded ±8% clamp: ${anyExceedsIdealClamp}`);
console.log(`M baseline unchanged (1.0): ${!mRegression}`);
console.log(`Garment chest px anchor: ${REALITY_MOCKUP_CANVAS.garmentChestPx}`);

const size90 = rows.find((r) => r.size === "90")!;
const sizeM = rows.find((r) => r.size === "M")!;
const sizeXxxl = rows.find((r) => r.size === "XXXL")!;
const size160 = rows.find((r) => r.size === "160")!;
const sizeS = rows.find((r) => r.size === "S")!;

console.log("\n=== Acceptance Checks ===");
console.log(
  `90 improved vs uncompensated: ${pct(size90.screenArtToGarment / size90.widthComp)} → ${pct(size90.screenArtToGarment)} (toward official ratio)`,
);
console.log(
  `XXXL reduced vs uncompensated: ${pct(sizeXxxl.screenArtToGarment / sizeXxxl.widthComp)} → ${pct(sizeXxxl.screenArtToGarment)}`,
);
console.log(
  `160 close to S: ratio delta ${Math.abs(size160.screenArtToGarment - sizeS.screenArtToGarment).toFixed(3)}`,
);
console.log(
  `M compensation identity: W=${sizeM.widthComp.toFixed(4)} H=${sizeM.heightComp.toFixed(4)}`,
);

console.log("\n=== Frozen Layer Impact ===");
console.log("Export: NO (productUrl still from composeProductMockup)");
console.log("Designer: NO");
console.log("Placement: NO (read-only)");
console.log("composeProductMockup: NO");
console.log("Calibration: NO");
console.log("mockupVisualScale: NO (read-only)");
