/**
 * Phase 14.2 — Designer UX Refinement (Display Only)
 * node scripts/validate-designer-ux-refinement-14-2.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/direct-manipulation.ts",
];

let failures = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

console.log("validate-designer-ux-refinement-14-2\n");

console.log("── Frozen Runtime ──");
for (const file of FROZEN_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`${file} missing`);
  } else {
    pass(`${file} present (unchanged)`);
  }
}

console.log("\n── Part A: Engineering Overlays Hidden ──");
const uiVis = read("components/designer/ui-visibility.ts");
if (!uiVis.includes("showEngineeringOverlays: false")) {
  fail("UI_VISIBILITY.showEngineeringOverlays must be false");
} else {
  pass("showEngineeringOverlays: false");
}

const canvas = read("components/designer/DesignCanvas.tsx");
if (!canvas.includes("UI_VISIBILITY.showEngineeringOverlays")) {
  fail("DesignCanvas must gate engineering overlays");
} else {
  pass("DesignCanvas gates constraint overlay");
}
if (canvas.includes("data-garment-safe-zone")) {
  fail("Orange safe zone should not render in DesignCanvas");
} else {
  pass("Orange safe zone removed from canvas");
}
if (!canvas.includes("PrintAreaDisplayRuler")) {
  fail("Ruler must remain visible");
} else {
  pass("Ruler remains");
}
if (!canvas.includes("getDesignerWorkspaceContainerStyle")) {
  fail("Fixed blue frame API missing");
} else {
  pass("Fixed blue frame unchanged");
}

console.log("\n── Part C: Presets Preserve Physical Size ──");
const placementUx = read("lib/designer-placement-ux.ts");
if (!placementUx.includes("applyDesignerPlacementPresetPreserveSize")) {
  fail("designer-placement-ux missing preserve-size helper");
} else {
  pass("designer-placement-ux.ts present");
}
if (placementUx.includes("fitImageLayer") || placementUx.includes("fitTextLayer")) {
  fail("placement UX must not call fit runtime");
} else {
  pass("placement UX does not auto-fit");
}
if (!placementUx.includes("designerRectToWorkspaceRect")) {
  fail("placement UX must normalize via designerRectToWorkspaceRect");
} else {
  pass("placement UX: physical → workspace via facade");
}

const app = read("components/designer/DesignerApp.tsx");
if (app.includes("applyDesignerPlacementPreset(")) {
  fail("DesignerApp must not call applyDesignerPlacementPreset (auto-fit)");
} else {
  pass("DesignerApp uses preserve-size preset UX");
}
if (app.includes("fitDesignerLayers(next, designerFitContext)")) {
  fail("setLayers must not auto-fit all layers");
} else {
  pass("setLayers does not auto-fit");
}

console.log("\n── Part D: Overflow Feedback ──");
const printEl = read("components/designer/PrintAreaElement.tsx");
if (!printEl.includes("border-red-500") || !printEl.includes("border-zinc-900")) {
  fail("PrintAreaElement missing Figma-style overflow borders");
} else {
  pass("PrintAreaElement: zinc normal / red overflow");
}
if (!printEl.includes("hasPrintAreaOverflow")) {
  fail("PrintAreaElement overflow state missing");
} else {
  pass("PrintAreaElement overflow prop");
}

const ux = read("lib/garment-constraint-ux.ts");
if (!ux.includes("Exceeds printable area")) {
  fail("Layer warning copy missing");
} else {
  pass("Overflow warning copy");
}
if (!ux.includes("This artwork exceeds the printable area")) {
  fail("Status bar copy missing");
} else {
  pass("Status bar overflow copy");
}

console.log("\n── Part E: Optional Fit Action ──");
const controls = read("components/designer/LayerFloatingControls.tsx");
if (!controls.includes("data-fit-to-printable-area")) {
  fail("Fit to printable area control missing");
} else {
  pass("Fit to printable area button (manual only)");
}
if (!app.includes("handleFitToPrintableArea")) {
  fail("DesignerApp missing handleFitToPrintableArea");
} else {
  pass("DesignerApp wires manual fit handler");
}

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
