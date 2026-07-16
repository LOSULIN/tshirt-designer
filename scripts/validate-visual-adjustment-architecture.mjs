/**
 * Phase 27 — Visual Adjustment Architecture validation
 * Ensures mockup-only layer is wired without touching frozen render core.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FROZEN_CORE_FILES = [
  "lib/render/compose-artwork.ts",
  "lib/render/coordinate-mapping.ts",
  "lib/render/fine-calibration.ts",
  "components/render/RenderEngine.ts",
  "lib/print-export-system.ts",
  "lib/designer-workspace.ts",
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
];

const REQUIRED_NEW_FILES = [
  "lib/render/visual-adjustment.ts",
  "lib/render/product-mockup-compose.ts",
  "components/render/ProductMockupEngine.ts",
];

function read(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  return msg;
}

const failures = [];

console.log("Phase 27 — Visual Adjustment Architecture\n");

console.log("1. Frozen core must not reference visualAdjustment");
for (const file of FROZEN_CORE_FILES) {
  const content = read(file);
  if (!content) {
    failures.push(fail(`Missing frozen file: ${file}`));
    continue;
  }
  if (/visualAdjustment|visual-adjustment|product-mockup-compose|ProductMockupEngine/.test(content)) {
    failures.push(fail(`${file} references visual adjustment layer`));
  } else {
    pass(`${file} untouched`);
  }
}

console.log("\n2. New mockup layer files exist");
for (const file of REQUIRED_NEW_FILES) {
  if (existsSync(join(ROOT, file))) {
    pass(file);
  } else {
    failures.push(fail(`Missing: ${file}`));
  }
}

console.log("\n3. Product export uses ProductMockupEngine");
const renderExport = read("lib/export/render-export.ts") ?? "";
if (renderExport.includes("renderProductMockupOnProduct")) {
  pass("render-export.ts → renderProductMockupOnProduct");
} else {
  failures.push(fail("render-export.ts must use renderProductMockupOnProduct"));
}
if (!renderExport.includes("renderArtworkOnProduct")) {
  pass("render-export.ts does not call renderArtworkOnProduct");
} else {
  failures.push(fail("render-export.ts still calls renderArtworkOnProduct"));
}

console.log("\n4. composeArtwork remains factory path");
const composeArtwork = read("lib/render/compose-artwork.ts") ?? "";
if (composeArtwork.includes("resolveFinalArtworkPlacement")) {
  pass("composeArtwork uses resolveFinalArtworkPlacement (no visual adjustment)");
} else {
  failures.push(fail("composeArtwork placement resolver changed"));
}

const productMockup = read("lib/render/product-mockup-compose.ts") ?? "";
if (productMockup.includes("resolveProductMockupPlacement")) {
  pass("composeProductMockup uses resolveProductMockupPlacement");
} else {
  failures.push(fail("product-mockup-compose missing resolveProductMockupPlacement"));
}

console.log("\n5. Visual adjustment is last placement step");
const visualAdj = read("lib/render/visual-adjustment.ts") ?? "";
if (
  visualAdj.includes("resolveFinalArtworkPlacement") &&
  visualAdj.includes("applyVisualAdjustment")
) {
  pass("resolveProductMockupPlacement = factory + visual offset");
} else {
  failures.push(fail("visual-adjustment pipeline incomplete"));
}

console.log("\n6. calibration.json schema");
const calibrationJson = read("public/products/UA35001/calibration.json");
if (calibrationJson) {
  try {
    const parsed = JSON.parse(calibrationJson);
    const front = parsed.front;
    if (
      front?.visualAdjustment &&
      typeof front.visualAdjustment.offsetX === "number" &&
      typeof front.visualAdjustment.offsetY === "number"
    ) {
      pass("UA35001 calibration.json includes visualAdjustment");
    } else {
      failures.push(fail("UA35001 calibration.json missing visualAdjustment"));
    }
  } catch {
    failures.push(fail("UA35001 calibration.json invalid JSON"));
  }
} else {
  failures.push(fail("UA35001 calibration.json not found"));
}

console.log("\n7. Calibration Tool UI");
const calibrationTool = read("components/render/CalibrationTool.tsx") ?? "";
if (
  calibrationTool.includes("Visual Adjustment") &&
  calibrationTool.includes("renderProductMockupWithCalibration") &&
  calibrationTool.includes("draftVisualAdjustment")
) {
  pass("CalibrationTool has Visual Adjustment + mockup preview");
} else {
  failures.push(fail("CalibrationTool missing Visual Adjustment UI"));
}

console.log("\n8. Validation checklist");
const checklist = [
  ["Designer unchanged", !read("lib/designer-workspace.ts")?.includes("visualAdjustment")],
  ["Artwork Export path frozen", !read("lib/print-export-system.ts")?.includes("visualAdjustment")],
  ["Product Reference in calibration", calibrationJson?.includes("productReference")],
  ["Visual offset mockup-only", productMockup.includes("resolveProductMockupPlacement")],
  ["Factory coordinate untouched", !composeArtwork.includes("visualAdjustment")],
  ["Coordinate mapping untouched", !read("lib/render/coordinate-mapping.ts")?.includes("visualAdjustment")],
  ["New SKU calibration flow", read("lib/render/calibration.ts")?.includes("parseVisualAdjustment")],
];

for (const [label, ok] of checklist) {
  if (ok) {
    pass(label);
  } else {
    failures.push(fail(label));
  }
}

console.log("\n" + "=".repeat(60));
if (failures.length === 0) {
  console.log("PASS — Visual Adjustment Architecture validated");
  process.exit(0);
} else {
  console.error(`FAIL — ${failures.length} issue(s)`);
  process.exit(1);
}
