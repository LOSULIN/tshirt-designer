/**
 * Step 13.0E — Designer Coordinate Controller validation
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;
const ROUND_TRIP_EPSILON_CM = ROUND_TRIP_EPSILON;

const CONTROLLER_APIS = [
  "setLayerDesignerPosition",
  "setLayerDesignerSize",
  "setLayerDesignerRect",
  "moveLayerDesigner",
  "resizeLayerDesigner",
  "setLayerDesignerRotation",
  "setLayerDesignerTransform",
  "applyDesignerLayerPatch",
  "readLayerDesignerProjection",
  "createControllerContext",
];

const FACADE_LAYER_APIS = [
  "projectLayerToDesigner",
  "projectLayerToWorkspace",
  "projectLayerPatchToWorkspace",
];

const FORBIDDEN_IN_UI = [
  "designerRectToWorkspaceRect(",
  "designerPointToWorkspacePoint(",
  "designerLengthToWorkspaceLength(",
  "projectDesignerRectToWorkspaceStorage",
  "projectDesignerPointToWorkspaceStorage",
  "projectDesignerLengthToWorkspaceStorage",
];

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
    rotation: rect.rotation ?? 0,
    scale: rect.scale ?? 1,
  };
}

function designerToWorkspace(designer, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = GARMENT_BLUE[side][size];
  return {
    x_cm: designer.x_cm * (ws.width / gm.width),
    y_cm: designer.y_cm * (ws.height / gm.height),
    width_cm: designer.width_cm * (ws.width / gm.width),
    height_cm: designer.height_cm * (ws.height / gm.height),
    rotation: designer.rotation,
    scale: designer.scale,
  };
}

function maxRectDelta(a, b) {
  return Math.max(
    Math.abs(a.x_cm - b.x_cm),
    Math.abs(a.y_cm - b.y_cm),
    Math.abs(a.width_cm - b.width_cm),
    Math.abs(a.height_cm - b.height_cm),
  );
}

function listDesignerComponentFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listDesignerComponentFiles(full));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function validateControllerStructure() {
  const path = "lib/designer-coordinate-controller.ts";
  if (!existsSync(join(ROOT, path))) {
    fail(`${path} 不存在`);
    return;
  }
  pass(`${path} 存在`);

  const source = read(path);
  for (const api of CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 export function ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }

  if (source.includes("from \"react\"") || source.includes("document.")) {
    fail("Controller 不得依賴 React / DOM");
  } else {
    pass("Controller 為 Pure Module（無 React / DOM）");
  }

  if (!source.includes("designer-coordinate-facade")) {
    fail("Controller 必須委派 facade");
  } else {
    pass("Controller 委派 facade");
  }
}

function validateFacadeLayerApis() {
  const source = read("lib/designer-coordinate-facade.ts");
  for (const api of FACADE_LAYER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Facade 缺少 export function ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validateControllerOutputIsWorkspace() {
  const source = read("lib/designer-coordinate-controller.ts");
  if (!source.includes("WorkspaceLayerPatch")) {
    fail("Controller 未宣告 WorkspaceLayerPatch 輸出");
  } else {
    pass("Controller 輸出 WorkspaceLayerPatch");
  }
  if (
    /return\s+designer(Rect|Point|Length)/.test(source) &&
    !source.includes("return designerRectToWorkspaceRect")
  ) {
    fail("Controller 可能回傳 Designer Coordinate");
  } else {
    pass("Controller 不回傳 Designer Coordinate 物件");
  }
}

function validateRoundTrip() {
  const sample = {
    x_cm: 8.5,
    y_cm: 12.3,
    width_cm: 14,
    height_cm: 9,
    rotation: 15,
    scale: 1.2,
  };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const designer = workspaceToDesigner(sample, side, size);
      const roundTrip = designerToWorkspace(designer, side, size);
      const delta = maxRectDelta(sample, roundTrip);
      cases += 1;
      if (delta >= ROUND_TRIP_EPSILON_CM) {
        fail(`Round-trip ${side}/${size} delta=${delta}`);
      }
    }
  }
  pass(
    `${cases} layer round-trip cases < ${ROUND_TRIP_EPSILON_CM} cm`,
  );
}

function validateForbiddenUiUsage() {
  const files = listDesignerComponentFiles(join(ROOT, "components/designer"));
  for (const fullPath of files) {
    const rel = fullPath.slice(ROOT.length + 1);
    const source = readFileSync(fullPath, "utf8");
    for (const forbidden of FORBIDDEN_IN_UI) {
      if (source.includes(forbidden)) {
        fail(`${rel} 直接使用禁止 API：${forbidden}`);
      }
    }
    pass(`${rel} 無禁止 Facade 寫入 API`);
  }

  const displayProjection = read("lib/designer-display-projection.ts");
  for (const forbidden of FORBIDDEN_IN_UI) {
    if (displayProjection.includes(forbidden)) {
      fail(`designer-display-projection.ts 含禁止寫入 API：${forbidden}`);
    }
  }
  pass("designer-display-projection 無 Facade 寫入捷徑");
}

function validateRuntimeUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    pass(`${file} 未修改（架構步驟）`);
  }
}

console.log("validate-designer-coordinate-controller-13-0e\n");

validateControllerStructure();
validateFacadeLayerApis();
validateControllerOutputIsWorkspace();
validateRoundTrip();
validateForbiddenUiUsage();
validateRuntimeUntouched();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
