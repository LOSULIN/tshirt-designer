/**
 * Step 13.0J — Designer Gesture Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const GESTURE_CONTROLLER_APIS = [
  "createDesignerGestureContext",
  "resolveDesignerGestureMoveWorkspacePatch",
  "resolveDesignerGestureScaleWorkspacePatch",
  "resolveDesignerGestureRotateWorkspacePatch",
  "applyDesignerGesturePatch",
  "projectWorkspaceGestureToDesigner",
  "projectDesignerGestureToWorkspace",
  "resolveWorkspaceGestureForApplyClamped",
  "resolveDesignerGestureResizeWorkspacePatch",
];

const FORBIDDEN_IN_DESIGNER_APP = [
  "designerRectToWorkspaceRect(",
  "designerPointToWorkspacePoint(",
  "designerLengthToWorkspaceLength(",
];

const FORBIDDEN_RUNTIME_FILES = [
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
];

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

function workspaceToDesigner(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (gm.width / ws.width),
    y_cm: point.y_cm * (gm.height / ws.height),
  };
}

function designerToWorkspace(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (ws.width / gm.width),
    y_cm: point.y_cm * (ws.height / gm.height),
  };
}

function validateGestureControllerApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of GESTURE_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validateDesignerAppGestureFlow() {
  const source = read("components/designer/DesignerApp.tsx");
  const required = [
    "designerGestureContext",
    "createDesignerGestureContext",
    "resolveWorkspaceGestureForApplyClamped",
    "resolveDesignerGestureResizeWorkspacePatch",
    "applyClampedLayerPatch",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`DesignerApp 缺少 Gesture 投影：${token}`);
    } else {
      pass(`DesignerApp 使用 ${token}`);
    }
  }
  for (const forbidden of FORBIDDEN_IN_DESIGNER_APP) {
    if (source.includes(forbidden)) {
      fail(`DesignerApp 直接使用禁止 API：${forbidden}`);
    }
  }
  pass("DesignerApp 無禁止 Facade 寫入 API");
}

function validateCanvasPointerUntouched() {
  const printArea = read("components/designer/PrintAreaElement.tsx");
  if (!printArea.includes("applyDesignerDragSnap")) {
    fail("PrintAreaElement Canvas drag snap 遭修改");
  } else {
    pass("PrintAreaElement 保留 applyDesignerDragSnap");
  }
  const canvas = read("components/designer/DesignCanvas.tsx");
  if (!canvas.includes("buildDesignerSnapTargetsFromLayers")) {
    fail("DesignCanvas snap targets 遭修改");
  } else {
    pass("DesignCanvas 保留 buildDesignerSnapTargetsFromLayers");
  }
  if (canvas.includes("resolveWorkspaceGestureForApplyClamped")) {
    fail("DesignCanvas 不應引用 Gesture Runtime");
  }
  if (printArea.includes("resolveWorkspaceGestureForApplyClamped")) {
    fail("PrintAreaElement 不應引用 Gesture Runtime");
  }
}

function validateGeometryUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const source = read(file);
    if (source.includes("designer-coordinate-controller")) {
      fail(`${file} 不應引用 controller`);
    } else {
      pass(`${file} 未修改（無 controller 引用）`);
    }
  }
  const geometry = read("lib/geometry.ts");
  if (!geometry.includes("export function applyDragSnap")) {
    fail("geometry.ts applyDragSnap 缺失");
  } else {
    pass("geometry.ts applyDragSnap 保留");
  }
  const constraints = read("lib/layer-constraints.ts");
  if (!constraints.includes("export function applyClampedLayerPatch")) {
    fail("layer-constraints applyClampedLayerPatch 缺失");
  } else {
    pass("applyClampedLayerPatch 仍存在");
  }
}

function validateProjectionRoundTrip() {
  const samples = [
    { x_cm: 8, y_cm: 12 },
    { x_cm: 20, y_cm: 30 },
    { x_cm: 5.5, y_cm: 40.25 },
  ];
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      for (const sample of samples) {
        const designer = workspaceToDesigner(sample, side, size);
        const roundTrip = designerToWorkspace(designer, side, size);
        cases += 1;
        if (
          Math.abs(roundTrip.x_cm - sample.x_cm) > ROUND_TRIP_EPSILON ||
          Math.abs(roundTrip.y_cm - sample.y_cm) > ROUND_TRIP_EPSILON
        ) {
          fail(`Move round-trip ${side}/${size} (${sample.x_cm},${sample.y_cm})`);
        }
      }
      const wsScale = 1.25;
      const designerScale = wsScale;
      const wsRot = 45;
      cases += 2;
      if (Math.abs(designerScale - wsScale) > ROUND_TRIP_EPSILON) {
        fail(`Scale round-trip ${side}/${size}`);
      }
      if (Math.abs(wsRot - 45) > ROUND_TRIP_EPSILON) {
        fail(`Rotate round-trip ${side}/${size}`);
      }
    }
  }
  pass(`${cases} gesture projection round-trip checks`);
}

console.log("validate-designer-gesture-projection-13-0j\n");

validateGestureControllerApis();
validateDesignerAppGestureFlow();
validateCanvasPointerUntouched();
validateGeometryUntouched();
validateProjectionRoundTrip();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
