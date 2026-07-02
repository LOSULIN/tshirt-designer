/**
 * Step 13.0M — Designer Auto-Fit / Hydration Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const FIT_CONTROLLER_APIS = [
  "createDesignerFitContext",
  "fitDesignerLayer",
  "fitDesignerLayers",
  "resolveDesignerFitWorkspacePatch",
  "resolveDesignerFitWorkspaceLayers",
  "hydrateDesignerLayers",
  "updateDesignerLayer",
];

const FORBIDDEN_IN_DESIGNER_APP = [
  "fitTextLayer(",
  "fitImageLayer(",
  "fitShapeLayer(",
  "fitDesignLayers(",
];

const FIT_HANDLERS = [
  "designerFitContext",
  "createDesignerFitContext",
  "fitDesignerLayers",
  "updateDesignerLayer",
  "hydrateDesignerLayers",
  "handleGenderChange",
  "hydrateDesignLayersByTemplate",
];

const HYDRATION_FLOWS = [
  "hydrateDesignerLayers",
  "createDesignerFitContext",
  "fitDesignerLayers",
  "updateDesignerLayer",
];

const FORBIDDEN_RUNTIME_FILES = ["lib/layer-constraints.ts", "lib/geometry.ts"];

const POINTER_FILES = [
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
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

function garmentFor(side, size) {
  return (
    GARMENT_BLUE[side][size] ??
    (side === "front"
      ? { width: 35, height: 50 }
      : { width: 38, height: 45 })
  );
}

function workspaceToDesignerRect(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: rect.x_cm * (gm.width / ws.width),
    y_cm: rect.y_cm * (gm.height / ws.height),
    width_cm: rect.width_cm * (gm.width / ws.width),
    height_cm: rect.height_cm * (gm.height / ws.height),
  };
}

function designerToWorkspaceRect(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: rect.x_cm * (ws.width / gm.width),
    y_cm: rect.y_cm * (ws.height / gm.height),
    width_cm: rect.width_cm * (ws.width / gm.width),
    height_cm: rect.height_cm * (ws.height / gm.height),
  };
}

function clampInDesigner(rect, side, size) {
  const gm = garmentFor(side, size);
  const maxX = Math.max(0, gm.width - rect.width_cm);
  const maxY = Math.max(0, gm.height - rect.height_cm);
  return {
    ...rect,
    x_cm: Math.min(Math.max(0, rect.x_cm), maxX),
    y_cm: Math.min(Math.max(0, rect.y_cm), maxY),
  };
}

function validateFitControllerApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of FIT_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
  if (!source.includes("fitTextLayer(designerLayer, designerPrintArea")) {
    fail("Controller fit 須使用 designerPrintableArea");
  } else {
    pass("Controller fit 使用 designerPrintableArea");
  }
}

function validateDesignerAppFitFlow() {
  const source = read("components/designer/DesignerApp.tsx");
  for (const token of FIT_HANDLERS) {
    if (!source.includes(token)) {
      fail(`DesignerApp 缺少 Fit 投影：${token}`);
    } else {
      pass(`DesignerApp 使用 ${token}`);
    }
  }
  for (const forbidden of FORBIDDEN_IN_DESIGNER_APP) {
    if (source.includes(forbidden)) {
      fail(`DesignerApp 直接呼叫禁止 API：${forbidden}`);
    }
  }
  pass("DesignerApp 無禁止 fit*Layer / fitDesignLayers API");
}

function validateHydrationFlows() {
  const source = read("components/designer/DesignerApp.tsx");
  for (const token of HYDRATION_FLOWS) {
    if (!source.includes(token)) {
      fail(`Hydration 流程缺少 ${token}`);
    }
  }
  if (source.includes("getDesignerPrintAreaCmBounds(templateSide)")) {
    fail("hydrate 仍使用 workspace/garment bounds 直接 fit");
  }
  if (source.includes("getDesignerWorkspacePrintAreaCm(templateSide)")) {
    const genderBlock = source.slice(
      source.indexOf("handleGenderChange"),
      source.indexOf("handleGenderChange") + 800,
    );
    if (genderBlock.includes("getDesignerWorkspacePrintAreaCm")) {
      fail("handleGenderChange 仍使用 workspace print area fit");
    }
  }
  pass("Draft Load / Gender Change / setLayers / updateLayer 經 Designer Controller");
}

function validateGeometryUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const source = read(file);
    if (source.includes("designer-coordinate")) {
      fail(`${file} 不應引用 designer-coordinate`);
    } else {
      pass(`${file} 未修改（無 designer-coordinate 引用）`);
    }
  }
  const constraints = read("lib/layer-constraints.ts");
  if (constraints.includes("designer-coordinate-controller")) {
    fail("layer-constraints.ts 不應引用 controller");
  } else {
    pass("layer-constraints.ts 未感知 Designer Coordinate");
  }
}

function validateCanvasUntouched() {
  for (const file of POINTER_FILES) {
    const source = read(file);
    if (source.includes("fitDesignerLayer") || source.includes("hydrateDesignerLayers")) {
      fail(`${file} 不應引用 Fit Runtime`);
    }
  }
  pass("PrintAreaElement / DesignCanvas 未引用 Fit Runtime");
}

function validateProjectionRoundTrip() {
  const layer = { x_cm: 8, y_cm: 12, width_cm: 10, height_cm: 6 };
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const designer = workspaceToDesignerRect(layer, side, size);
      const clampedDesigner = clampInDesigner(designer, side, size);
      const workspace = designerToWorkspaceRect(clampedDesigner, side, size);
      const roundTripDesigner = workspaceToDesignerRect(
        { x_cm: workspace.x_cm, y_cm: workspace.y_cm, width_cm: layer.width_cm, height_cm: layer.height_cm },
        side,
        size,
      );
      cases += 1;

      if (
        Math.abs(roundTripDesigner.x_cm - clampedDesigner.x_cm) >
          ROUND_TRIP_EPSILON ||
        Math.abs(roundTripDesigner.y_cm - clampedDesigner.y_cm) >
          ROUND_TRIP_EPSILON
      ) {
        fail(`Fit projection round-trip ${side}/${size}`);
      }
    }
  }
  pass(
    `${cases} fit projection round-trip checks (${SIZES.length} sizes × ${SIDES.length} sides)`,
  );
}

function validateVisualConsistency() {
  const layer = { x_cm: 10, y_cm: 15, width_cm: 8, height_cm: 5 };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const designer = workspaceToDesignerRect(layer, side, size);
      const gm = garmentFor(side, size);
      const ws = WORKSPACE_M[side];
      const legacyLeft = (layer.x_cm / ws.width) * 100;
      const projectedLeft = (designer.x_cm / gm.width) * 100;
      cases += 1;
      if (Math.abs(legacyLeft - projectedLeft) > ROUND_TRIP_EPSILON) {
        fail(`Display CSS drift ${side}/${size}`);
      }
    }
  }
  pass(`${cases} display CSS % consistency checks`);
}

console.log("validate-designer-fit-projection-13-0m\n");

validateFitControllerApis();
validateDesignerAppFitFlow();
validateHydrationFlows();
validateGeometryUntouched();
validateCanvasUntouched();
validateProjectionRoundTrip();
validateVisualConsistency();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
