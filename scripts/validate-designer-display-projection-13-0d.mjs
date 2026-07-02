/**
 * Step 13.0D — Designer Display Projection Integration validation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 1e-9;

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

const SIDES = ["front", "back"];

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const GARMENT_BLUE = {
  front: {
    90: { width: 18, height: 24 },
    110: { width: 22, height: 30 },
    130: { width: 25, height: 35 },
    150: { width: 29, height: 41 },
    160: { width: 32, height: 44 },
    GS: { width: 29, height: 41 },
    GM: { width: 32, height: 44 },
    GL: { width: 35, height: 46 },
    S: { width: 35, height: 46 },
    M: { width: 35, height: 50 },
    L: { width: 38, height: 52 },
    XL: { width: 40, height: 55 },
    XXL: { width: 42, height: 58 },
    XXXL: { width: 45, height: 60 },
  },
  back: {
    90: { width: 20, height: 22 },
    110: { width: 24, height: 27 },
    130: { width: 27, height: 32 },
    150: { width: 31, height: 37 },
    160: { width: 35, height: 40 },
    GS: { width: 31, height: 37 },
    GM: { width: 35, height: 40 },
    GL: { width: 38, height: 41 },
    S: { width: 38, height: 41 },
    M: { width: 38, height: 45 },
    L: { width: 41, height: 47 },
    XL: { width: 43, height: 50 },
    XXL: { width: 46, height: 52 },
    XXXL: { width: 49, height: 54 },
  },
};

const FORBIDDEN_RUNTIME_FILES = [
  "lib/geometry.ts",
  "lib/layer-alignment.ts",
  "lib/layer-constraints.ts",
  "lib/placement-presets.ts",
  "lib/direct-manipulation.ts",
  "lib/print-export-system.ts",
  "lib/mockup-export.ts",
  "lib/layer-overflow.ts",
];

const DISPLAY_FILES = [
  "lib/designer-display-projection.ts",
  "components/designer/DesignCanvas.tsx",
  "components/designer/PrintAreaElement.tsx",
  "components/designer/LayerFloatingControls.tsx",
  "components/designer/InspectorObjectCard.tsx",
  "components/designer/InspectorProofDetails.tsx",
  "components/designer/LayerInspectorEditor.tsx",
  "components/designer/PreviewInfoPanel.tsx",
  "components/designer/StackedInspectorPanel.tsx",
  "components/designer/CanvasInfoPanel.tsx",
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

function workspaceToDesigner(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = GARMENT_BLUE[side][size];
  return {
    x_cm: rect.x_cm * (gm.width / ws.width),
    y_cm: rect.y_cm * (gm.height / ws.height),
    width_cm: rect.width_cm * (gm.width / ws.width),
    height_cm: rect.height_cm * (gm.height / ws.height),
  };
}

function workspaceCssPercent(rect, side) {
  const ws = WORKSPACE_M[side];
  return {
    left: (rect.x_cm / ws.width) * 100,
    top: (rect.y_cm / ws.height) * 100,
    width: (rect.width_cm / ws.width) * 100,
    height: (rect.height_cm / ws.height) * 100,
  };
}

function designerCssPercent(rect, side, size) {
  const gm = GARMENT_BLUE[side][size];
  return {
    left: (rect.x_cm / gm.width) * 100,
    top: (rect.y_cm / gm.height) * 100,
    width: (rect.width_cm / gm.width) * 100,
    height: (rect.height_cm / gm.height) * 100,
  };
}

function validateCssEquivalence() {
  const sample = { x_cm: 10, y_cm: 15, width_cm: 12, height_cm: 8 };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const designer = workspaceToDesigner(sample, side, size);
      const legacy = workspaceCssPercent(sample, side);
      const projected = designerCssPercent(designer, side, size);
      for (const key of ["left", "top", "width", "height"]) {
        const delta = Math.abs(legacy[key] - projected[key]);
        cases += 1;
        if (delta > ROUND_TRIP_EPSILON) {
          fail(
            `CSS drift ${side}/${size} ${key}: legacy=${legacy[key]} projected=${projected[key]}`,
          );
        }
      }
    }
  }
  pass(
    `${cases} CSS % equivalence checks (${SIZES.length} sizes × ${SIDES.length} sides × 4 axes)`,
  );
}

function validateStructure() {
  if (!existsSync(join(ROOT, "lib/designer-display-projection.ts"))) {
    fail("designer-display-projection.ts 缺失");
  } else {
    pass("designer-display-projection.ts 存在");
  }

  const facade = read("lib/designer-coordinate-facade.ts");
  if (!facade.includes("toDesignerCssPercentFromWorkspace")) {
    fail("facade 缺少 toDesignerCssPercentFromWorkspace");
  } else {
    pass("facade.toDesignerCssPercentFromWorkspace");
  }

  const projection = read("lib/designer-display-projection.ts");
  if (!projection.includes("designer-coordinate-facade")) {
    fail("display-projection 必須委派 facade");
  } else {
    pass("display-projection 委派 facade");
  }

  const canvas = read("components/designer/DesignCanvas.tsx");
  if (!canvas.includes("displayPercentStyle")) {
    fail("DesignCanvas 未傳遞 displayPercentStyle");
  } else {
    pass("DesignCanvas 傳遞 displayPercentStyle");
  }
  if (!canvas.includes("getDesignerPrintableArea")) {
    fail("DesignCanvas Status Bar 未使用 getDesignerPrintableArea");
  } else {
    pass("DesignCanvas Status Bar 使用 getDesignerPrintableArea");
  }

  const printEl = read("components/designer/PrintAreaElement.tsx");
  if (!printEl.includes("displayPercentStyle")) {
    fail("PrintAreaElement 缺少 displayPercentStyle");
  } else {
    pass("PrintAreaElement displayPercentStyle prop");
  }

  const inspector = read("components/designer/InspectorObjectCard.tsx");
  if (!inspector.includes("getLayerDesignerDisplayRect")) {
    fail("InspectorObjectCard 未使用 designer display rect");
  } else {
    pass("InspectorObjectCard 使用 designer display rect");
  }
  if (inspector.includes("getLayerInspectorCmRect")) {
    fail("InspectorObjectCard 仍直接讀 workspace inspector rect");
  } else {
    pass("InspectorObjectCard 不直接顯示 workspace rect");
  }

  const statusBar = read("components/designer/DesignWorkspaceStatusBar.tsx");
  if (!statusBar.includes("data-garment-constraint-status-print-size")) {
    fail("Status Bar 缺少 printable area 標記");
  } else {
    pass("DesignWorkspaceStatusBar printable area 標記");
  }
}

function validateRuntimeUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const full = join(ROOT, file);
    if (!existsSync(full)) {
      fail(`${file} 不存在`);
      continue;
    }
    const stat = readFileSync(full, "utf8");
    const marker = `/* step-13-0d-display */`;
    if (stat.includes(marker)) {
      fail(`${file} 被 Step 13.0D 修改`);
    } else {
      pass(`${file} 未修改`);
    }
  }
}

function validateNoManualRatioInDisplay() {
  for (const file of DISPLAY_FILES) {
    const source = read(file);
    if (
      source.includes("garment.width / workspace.width") ||
      source.includes("workspace.width / garment.width")
    ) {
      fail(`${file} 含手動比例換算`);
    } else {
      pass(`${file} 無手動比例換算`);
    }
  }
}

console.log("validate-designer-display-projection-13-0d\n");

validateStructure();
validateCssEquivalence();
validateRuntimeUntouched();
validateNoManualRatioInDisplay();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
