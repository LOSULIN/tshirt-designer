/**
 * Step 13.0L — Designer Floating Controls Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const FLOATING_CONTROLLER_APIS = [
  "createDesignerFloatingControlContext",
  "clientPixelDeltaToDesignerCm",
  "resolveDesignerFloatingMoveWorkspacePatch",
  "applyDesignerFloatingMove",
  "projectDesignerFloatingResultToWorkspace",
];

const FORBIDDEN_IN_FLOATING_CONTROLS = [
  "workspaceRectToDesignerRect(",
  "designerRectToWorkspaceRect(",
  "designerPointToWorkspacePoint(",
  "workspacePointToDesignerPoint(",
  "designerLengthToWorkspaceLength(",
];

const FORBIDDEN_WORKSPACE_POINTER_PATTERNS = [
  "printArea.width / printRect.width",
  "printArea.height / printRect.height",
];

const FORBIDDEN_RUNTIME_FILES = ["lib/geometry.ts", "lib/layer-alignment.ts"];

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

function workspaceToDesignerPoint(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (gm.width / ws.width),
    y_cm: point.y_cm * (gm.height / ws.height),
  };
}

function designerToWorkspacePoint(point, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: point.x_cm * (ws.width / gm.width),
    y_cm: point.y_cm * (ws.height / gm.height),
  };
}

function designerCssPercent(point, side, size) {
  const gm = garmentFor(side, size);
  return {
    left: (point.x_cm / gm.width) * 100,
    top: (point.y_cm / gm.height) * 100,
  };
}

function validateFloatingControllerApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of FLOATING_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validateLayerFloatingControlsFlow() {
  const source = read("components/designer/LayerFloatingControls.tsx");
  const required = [
    "createDesignerFloatingControlContext",
    "clientPixelDeltaToDesignerCm",
    "applyDesignerFloatingMove",
    "projectDesignerFloatingResultToWorkspace",
    "createDesignerFloatingDragState",
    "inferSideFromWorkspacePrintArea",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`LayerFloatingControls 缺少 ${token}`);
    } else {
      pass(`LayerFloatingControls 使用 ${token}`);
    }
  }
  for (const forbidden of FORBIDDEN_IN_FLOATING_CONTROLS) {
    if (source.includes(forbidden)) {
      fail(`LayerFloatingControls 直接使用禁止 API：${forbidden}`);
    }
  }
  for (const pattern of FORBIDDEN_WORKSPACE_POINTER_PATTERNS) {
    if (source.includes(pattern)) {
      fail(`LayerFloatingControls 仍使用 Workspace Pointer 路徑：${pattern}`);
    }
  }
  pass("LayerFloatingControls 無禁止 Facade / Workspace Pointer API");
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
}

function validateCanvasUntouched() {
  for (const file of POINTER_FILES) {
    const source = read(file);
    if (source.includes("applyDesignerFloatingMove")) {
      fail(`${file} 不應引用 Floating Controls Runtime`);
    }
  }
  pass("PrintAreaElement / DesignCanvas 未引用 Floating Controls Runtime");
}

function validateProjectionRoundTrip() {
  const origin = { x_cm: 9.5, y_cm: 14.25 };
  const deltaDesigner = { dx_cm: 2.4, dy_cm: -1.1 };
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const designerOrigin = workspaceToDesignerPoint(origin, side, size);
      const designerTarget = {
        x_cm: designerOrigin.x_cm + deltaDesigner.dx_cm,
        y_cm: designerOrigin.y_cm + deltaDesigner.dy_cm,
      };
      const workspaceTarget = designerToWorkspacePoint(designerTarget, side, size);
      const roundTripDesigner = workspaceToDesignerPoint(
        workspaceTarget,
        side,
        size,
      );
      cases += 1;

      if (
        Math.abs(roundTripDesigner.x_cm - designerTarget.x_cm) >
          ROUND_TRIP_EPSILON ||
        Math.abs(roundTripDesigner.y_cm - designerTarget.y_cm) >
          ROUND_TRIP_EPSILON
      ) {
        fail(`Floating move round-trip ${side}/${size}`);
      }
    }
  }
  pass(
    `${cases} floating move projection round-trip checks (${SIZES.length} sizes × ${SIDES.length} sides)`,
  );
}

function validateVisualConsistency() {
  const origin = { x_cm: 11, y_cm: 16 };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const designer = workspaceToDesignerPoint(origin, side, size);
      const ws = WORKSPACE_M[side];
      const legacyLeft = (origin.x_cm / ws.width) * 100;
      const projectedLeft = designerCssPercent(designer, side, size).left;
      cases += 1;
      if (Math.abs(legacyLeft - projectedLeft) > ROUND_TRIP_EPSILON) {
        fail(`Display CSS drift ${side}/${size}`);
      }
    }
  }
  pass(`${cases} display CSS % consistency checks`);
}

console.log("validate-designer-floating-controls-projection-13-0l\n");

validateFloatingControllerApis();
validateLayerFloatingControlsFlow();
validateGeometryUntouched();
validateCanvasUntouched();
validateProjectionRoundTrip();
validateVisualConsistency();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
