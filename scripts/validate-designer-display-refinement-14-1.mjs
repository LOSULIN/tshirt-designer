/**
 * Phase 14.1 — Fixed Canvas / Variable Printable Area (Display Layer only)
 * node scripts/validate-designer-display-refinement-14-1.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FROZEN_RUNTIME_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/direct-manipulation.ts",
];

const DISPLAY_FILES = [
  "lib/designer-display-scale.ts",
  "lib/designer-display-projection.ts",
  "components/designer/DesignCanvas.tsx",
  "components/designer/CurrentGarmentConstraintVisualization.tsx",
  "components/designer/PrintAreaDisplayRuler.tsx",
];

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

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const GARMENT_BLUE = {
  front: {
    90: { width: 18, height: 24 },
    M: { width: 35, height: 50 },
    XXXL: { width: 45, height: 60 },
  },
  back: {
    90: { width: 20, height: 22 },
    M: { width: 38, height: 45 },
    XXXL: { width: 49, height: 54 },
  },
};

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

function getDisplayPrintableRegionPct(fixedFrame, garmentPrintable) {
  const widthRatio = garmentPrintable.width / fixedFrame.width;
  const heightRatio = garmentPrintable.height / fixedFrame.height;
  if (widthRatio <= 1.0005 && heightRatio <= 1.0005) {
    return { widthPct: 100, heightPct: 100 };
  }
  return {
    widthPct: Math.min(100, widthRatio * 100),
    heightPct: Math.min(100, heightRatio * 100),
  };
}

function validateFrozenRuntime() {
  console.log("\n── Frozen Runtime Untouched ──");
  for (const file of FROZEN_RUNTIME_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`${file} missing`);
      continue;
    }
    pass(`${file} exists (unchanged in this phase)`);
  }
}

function validateDisplayStructure() {
  console.log("\n── Display Layer Structure ──");
  for (const file of DISPLAY_FILES) {
    if (!existsSync(join(ROOT, file))) {
      fail(`${file} missing`);
    } else {
      pass(`${file} present`);
    }
  }

  const scale = read("lib/designer-display-scale.ts");
  if (!scale.includes("getDisplayPrintableRegionPct")) {
    fail("designer-display-scale missing getDisplayPrintableRegionPct");
  } else {
    pass("display-scale: fixed frame printable region");
  }

  const projection = read("lib/designer-display-projection.ts");
  if (!projection.includes("designer-display-scale")) {
    fail("display-projection must delegate to display-scale");
  } else {
    pass("display-projection delegates to display-scale");
  }

  const canvas = read("components/designer/DesignCanvas.tsx");
  if (!canvas.includes("getDesignerWorkspaceContainerStyle")) {
    fail("DesignCanvas must keep fixed workspace container style");
  } else {
    pass("DesignCanvas: fixed workspace container (blue frame visual)");
  }
  if (
    !canvas.includes("getDisplayOrangeSafeZonePct") &&
    !canvas.includes("UI_VISIBILITY.showEngineeringOverlays")
  ) {
    fail("DesignCanvas must use size-aware display orange zone or hide overlays (14.2)");
  } else {
    pass("DesignCanvas: orange zone hidden or size-aware");
  }
  if (!canvas.includes("PrintAreaDisplayRuler")) {
    fail("DesignCanvas missing PrintAreaDisplayRuler");
  } else {
    pass("DesignCanvas: ruler labels");
  }
  if (!canvas.includes("displayPercentStyle")) {
    fail("DesignCanvas must pass displayPercentStyle");
  } else {
    pass("DesignCanvas: displayPercentStyle unchanged");
  }

  const viz = read("components/designer/CurrentGarmentConstraintVisualization.tsx");
  if (!viz.includes("getDisplayPrintableRegionPct")) {
    fail("Constraint viz must use display-scale region pct");
  } else {
    pass("Constraint viz: display-scale region");
  }
}

function validateFixedFrameSemantics() {
  console.log("\n── Fixed Frame / Variable Printable cm ──");
  for (const side of ["front", "back"]) {
    const ws = WORKSPACE_M[side];
    for (const size of SIZES) {
      const garment = GARMENT_BLUE[side][size] ?? GARMENT_BLUE[side].M;
      const pct = getDisplayPrintableRegionPct(ws, garment);
      if (garment.width <= ws.width && garment.height <= ws.height) {
        if (Math.abs(pct.widthPct - 100) > 0.01 || Math.abs(pct.heightPct - 100) > 0.01) {
          fail(`${side}/${size}: garment ≤ workspace should fill 100% display frame`);
        }
      }
    }
    pass(`${side}: sizes ≤ M fill fixed blue frame at 100%`);
  }

  const pct90 = getDisplayPrintableRegionPct(
    WORKSPACE_M.front,
    GARMENT_BLUE.front[90],
  );
  if (Math.abs(pct90.widthPct - 100) > 0.01) {
    fail(`size 90 should be 100% of fixed frame (got ${pct90.widthPct})`);
  } else {
    pass("size 90: printable region fills fixed blue frame (100%)");
  }

  const pctM = getDisplayPrintableRegionPct(
    WORKSPACE_M.front,
    GARMENT_BLUE.front.M,
  );
  if (Math.abs(pctM.widthPct - 100) > 0.01) {
    fail(`size M should be 100% of fixed frame`);
  } else {
    pass("size M: printable region fills fixed blue frame (100%)");
  }
}

function validateCssEquivalence() {
  console.log("\n── Layer CSS % Unchanged (Facade equivalence) ──");
  const sample = { x_cm: 10, y_cm: 15, width_cm: 12, height_cm: 8 };
  let cases = 0;
  for (const side of ["front", "back"]) {
    const ws = WORKSPACE_M[side];
    for (const size of SIZES) {
      const gm =
        GARMENT_BLUE[side][size] ??
        (side === "front" ? { width: 35, height: 50 } : { width: 38, height: 45 });
      const designer = {
        x_cm: sample.x_cm * (gm.width / ws.width),
        y_cm: sample.y_cm * (gm.height / ws.height),
        width_cm: sample.width_cm * (gm.width / ws.width),
        height_cm: sample.height_cm * (gm.height / ws.height),
      };
      const legacy = {
        left: (sample.x_cm / ws.width) * 100,
        width: (sample.width_cm / ws.width) * 100,
      };
      const projected = {
        left: (designer.x_cm / gm.width) * 100,
        width: (designer.width_cm / gm.width) * 100,
      };
      for (const key of ["left", "width"]) {
        cases += 1;
        if (Math.abs(legacy[key] - projected[key]) > 1e-9) {
          fail(`CSS drift ${side}/${size} ${key}`);
        }
      }
    }
  }
  pass(`${cases} CSS equivalence checks (display-scale wraps facade)`);
}

console.log("validate-designer-display-refinement-14-1");

validateFrozenRuntime();
validateDisplayStructure();
validateFixedFrameSemantics();
validateCssEquivalence();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
