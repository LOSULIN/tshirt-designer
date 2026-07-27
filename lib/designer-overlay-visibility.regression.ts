/**
 * Phase 77 — Designer overlay visibility regression (display only).
 * Run: npx tsx lib/designer-overlay-visibility.regression.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UI_VISIBILITY } from "../components/designer/ui-visibility";

const ROOT = process.cwd();
let pass = true;

function assert(label: string, condition: boolean): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    console.log(`PASS: ${label}`);
  }
}

assert("engineering overlays hidden", UI_VISIBILITY.showEngineeringOverlays === false);
assert("geometry runtime debug overlay hidden", UI_VISIBILITY.showGeometryRuntimeDebugOverlay === false);
assert("geometry debug console hidden", UI_VISIBILITY.showGeometryDebugConsole === false);
assert("runtime safe area overlay hidden", UI_VISIBILITY.showRuntimeSafeAreaOverlay === false);
assert("canvas center debug markers hidden", UI_VISIBILITY.showCanvasCenterDebugMarkers === false);
assert("print area center guides visible", UI_VISIBILITY.showPrintAreaCenterGuides === true);
assert("print area center crosshair visible", UI_VISIBILITY.showPrintAreaCenterCrosshair === true);
assert("print area size label visible", UI_VISIBILITY.showPrintAreaSizeLabel === true);

const designCanvas = readFileSync(
  join(ROOT, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
assert(
  "DesignCanvas gates GeometryRuntimeDebugOverlay",
  designCanvas.includes("showGeometryRuntimeDebugOverlay"),
);
assert(
  "DesignCanvas gates runtime safe area",
  designCanvas.includes("showRuntimeSafeAreaOverlay"),
);
assert(
  "DesignCanvas gates center debug markers",
  designCanvas.includes("showCanvasCenterDebugMarkers"),
);
assert(
  "DesignCanvas does not always render GeometryRuntimeDebugOverlay",
  !designCanvas.includes("<GeometryRuntimeDebugOverlay side={side} />\n                </DesignerGarmentPresentation>"),
);

const printAreaGrid = readFileSync(
  join(ROOT, "components/designer/PrintAreaGrid.tsx"),
  "utf8",
);
assert(
  "PrintAreaCenterGuides includes crosshair marker",
  printAreaGrid.includes("data-print-area-center-crosshair"),
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"}`);
process.exit(pass ? 0 : 1);
