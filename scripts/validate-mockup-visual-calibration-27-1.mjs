#!/usr/bin/env node
/**
 * Phase 27.1 — UA35001 Mockup Visual Calibration validation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const PX_PER_CM = 12.24;
const DESIGNER_COLLAR_Y = 494;
const PRODUCT_COLLAR_Y = 534;
const FACTORY_PRINT_TOP_Y = 472;
const COMPARE_OFFSETS = [0, 20, 30, 40, 50];

const FROZEN_CORE_FILES = [
  "lib/render/compose-artwork.ts",
  "lib/render/coordinate-mapping.ts",
  "lib/render/fine-calibration.ts",
  "components/render/RenderEngine.ts",
  "lib/print-export-system.ts",
];

function read(rel) {
  const abs = join(ROOT, rel);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  return msg;
}

const failures = [];

console.log("Phase 27.1 — UA35001 Mockup Visual Calibration\n");

console.log("1. Frozen core untouched");
for (const file of FROZEN_CORE_FILES) {
  const content = read(file);
  if (!content) {
    failures.push(fail(`Missing: ${file}`));
    continue;
  }
  if (/visualAdjustment|mockup-visual-calibration|VisualOffsetCompare/.test(content)) {
    failures.push(fail(`${file} modified for mockup layer`));
  } else {
    pass(file);
  }
}

console.log("\n2. calibration.json visualAdjustment.offsetY = 40");
const calibrationPath = "public/products/UA35001/calibration.json";
const calibrationRaw = read(calibrationPath);
if (calibrationRaw) {
  const calibration = JSON.parse(calibrationRaw);
  const offsetY = calibration.front?.visualAdjustment?.offsetY;
  const productY = calibration.front?.productReference?.printArea?.y;
  const mapping = calibration.front?.mapping;
  if (offsetY === 40) {
    pass("visualAdjustment.offsetY = 40");
  } else {
    failures.push(fail(`visualAdjustment.offsetY = ${offsetY} (expected 40)`));
  }
  if (productY === 472) {
    pass("productReference.y unchanged (472)");
  } else {
    failures.push(fail(`productReference.y = ${productY} (must stay 472)`));
  }
  if (mapping?.offsetX === 0 && mapping?.offsetY === 0) {
    pass("mapping unchanged");
  } else {
    failures.push(fail("mapping was modified"));
  }
} else {
  failures.push(fail("calibration.json missing"));
}

console.log("\n3. Calibration Tool — Visual Offset Preview");
const tool = read("components/render/CalibrationTool.tsx") ?? "";
if (
  tool.includes("VisualOffsetComparePanel") &&
  tool.includes("MOCKUP_VISUAL_OFFSET_PRESETS") &&
  tool.includes("onSaveVisual")
) {
  pass("Offset Preview UI + Save visual only");
} else {
  failures.push(fail("Calibration Tool missing Offset Preview"));
}

console.log("\n4. Visual Compare Report");
const anatomyDeltaPx = PRODUCT_COLLAR_Y - DESIGNER_COLLAR_Y;
const designerGapPx = FACTORY_PRINT_TOP_Y - DESIGNER_COLLAR_Y;
console.log(`  Designer collar Y: ${DESIGNER_COLLAR_Y}`);
console.log(`  Product collar Y:  ${PRODUCT_COLLAR_Y}`);
console.log(`  Anatomy delta:     ${anatomyDeltaPx}px (${(anatomyDeltaPx / PX_PER_CM).toFixed(2)} cm)`);
console.log(`  Factory print top: y=${FACTORY_PRINT_TOP_Y}`);
console.log(`  Designer visual gap (print − collar): ${designerGapPx}px`);
console.log("");
console.log("  Offset | Print top | Gap from product collar | Match designer gap");
for (const offsetY of COMPARE_OFFSETS) {
  const printTop = FACTORY_PRINT_TOP_Y + offsetY;
  const gap = printTop - PRODUCT_COLLAR_Y;
  const match = Math.abs(gap - designerGapPx) <= 1;
  const marker = offsetY === anatomyDeltaPx ? " ← anatomy" : "";
  const best = match ? " ✓" : "";
  console.log(
    `  +${String(offsetY).padStart(2)}px | y=${printTop} | ${gap}px (${(gap / PX_PER_CM).toFixed(2)} cm) | ${match ? "YES" : "no"}${best}${marker}`,
  );
}

const recommended = anatomyDeltaPx;
console.log(`\n  建議 offsetY: +${recommended}`);
console.log("  理由: Product 領口較 Designer 低 40px；+40 使 Product 印刷頂與領口視覺間距");
console.log("        與 Designer 一致（非 Factory / Mapping 問題）。");

console.log("\n5. Product export path");
const renderExport = read("lib/export/render-export.ts") ?? "";
if (renderExport.includes("renderProductMockupOnProduct")) {
  pass("Product Export uses mockup engine (visual adjustment applied)");
} else {
  failures.push(fail("Product Export not on mockup path"));
}

console.log("\n" + "=".repeat(60));
if (failures.length === 0) {
  console.log("PASS — Phase 27.1 Mockup Visual Calibration");
  process.exit(0);
}
console.error(`FAIL — ${failures.length} issue(s)`);
process.exit(1);
