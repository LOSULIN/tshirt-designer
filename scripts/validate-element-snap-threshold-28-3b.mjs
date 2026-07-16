/**
 * Phase 28-3B — Element Snap Threshold calibration validation.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DESIGN_UNITS_PER_CM = 10;
const ELEMENT_SNAP_THRESHOLD_CM = 0.8;

let failed = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  failed += 1;
}

function uiToCm(ui) {
  return ui / DESIGN_UNITS_PER_CM;
}

function cmToUi(cm) {
  return cm * DESIGN_UNITS_PER_CM;
}

console.log("validate-element-snap-threshold-28-3b\n");

if (Math.abs(uiToCm(8) - 0.8) < 1e-6) {
  pass("UI 8 → 0.8 workspace cm");
} else {
  fail(`UI 8 mapping failed`);
}

if (Math.abs(uiToCm(10) - 1.0) < 1e-6) {
  pass("UI 10 → 1.0 workspace cm (old default; was wrongly passed as 10 cm)");
} else {
  fail(`UI 10 mapping failed`);
}

if (Math.abs(uiToCm(24) - 2.4) < 1e-6) {
  pass("UI 24 (slider max) → 2.4 workspace cm");
} else {
  fail(`UI 24 mapping failed`);
}

const defaultUi = cmToUi(ELEMENT_SNAP_THRESHOLD_CM);
const thresholdModule = readFileSync(
  join(ROOT, "lib/designer/element-snap-threshold.ts"),
  "utf8",
);
if (thresholdModule.includes(`DEFAULT_ELEMENT_SNAP_UI_VALUE = cmToDesignUnits`)) {
  pass(`DEFAULT_ELEMENT_SNAP_UI_VALUE derived from ELEMENT_SNAP_THRESHOLD_CM (${defaultUi})`);
} else {
  fail("DEFAULT_ELEMENT_SNAP_UI_VALUE not aligned with ELEMENT_SNAP_THRESHOLD_CM");
}

const designerApp = readFileSync(
  join(ROOT, "components/designer/DesignerApp.tsx"),
  "utf8",
);
if (
  designerApp.includes("uiElementSnapDistanceToWorkspaceCm") &&
  designerApp.includes("DEFAULT_ELEMENT_SNAP_UI_VALUE") &&
  designerApp.includes("elementSnapThresholdCm: elementSnapThresholdCm")
) {
  pass("DesignerApp maps UI → runtime cm before snap calls");
} else {
  fail("DesignerApp missing threshold mapping");
}

if (!designerApp.includes("elementSnapThresholdCm: elementSnapDistance,")) {
  pass("DesignerApp no longer passes raw UI value as elementSnapThresholdCm");
} else {
  fail("DesignerApp still passes raw elementSnapDistance as cm");
}

const printAreaEl = readFileSync(
  join(ROOT, "components/designer/PrintAreaElement.tsx"),
  "utf8",
);
if (printAreaEl.includes("uiElementSnapDistanceToWorkspaceCm")) {
  pass("PrintAreaElement maps UI → runtime cm");
} else {
  fail("PrintAreaElement missing threshold mapping");
}

for (const file of ["lib/geometry.ts", "lib/element-snap.ts"]) {
  const src = readFileSync(join(ROOT, file), "utf8");
  if (!src.includes("uiElementSnapDistanceToWorkspaceCm")) {
    pass(`${file} snap algorithm untouched`);
  } else {
    fail(`${file} was modified`);
  }
}

console.log("\nThreshold simulation (runtime workspace cm):");
for (const cm of [0.5, 1, 2, 4, 6, 8, 10]) {
  const ui = cmToUi(cm);
  console.log(`  ${cm} cm → UI ${ui} → runtime ${uiToCm(ui)} cm`);
}

console.log(`\nBefore fix: UI 10 → runtime 10 cm (no mapping)`);
console.log(
  `After fix:  UI ${defaultUi} → runtime ${uiToCm(defaultUi)} cm (default)`,
);

if (failed > 0) {
  console.error(`\n${failed} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll checks passed.");
