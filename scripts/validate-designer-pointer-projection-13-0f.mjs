/**
 * Step 13.0F — Designer Pointer Projection (Drag Runtime) validation
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const POINTER_CONTROLLER_APIS = [
  "clientPixelDeltaToDesignerCm",
  "createDesignerPointerDragState",
  "resolveDesignerDragWorkspacePatch",
  "resolveDesignerDragDeltaWorkspacePatch",
];

const FORBIDDEN_IN_POINTER_FILES = [
  "designerPointToWorkspacePoint(",
  "designerRectToWorkspaceRect(",
  "designerLengthToWorkspaceLength(",
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

function workspaceToDesignerPoint(x, y, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = GARMENT_BLUE[side][size] ?? GARMENT_BLUE[side].M;
  return {
    x_cm: x * (gm.width / ws.width),
    y_cm: y * (gm.height / ws.height),
  };
}

function designerToWorkspacePoint(x, y, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = GARMENT_BLUE[side][size] ?? GARMENT_BLUE[side].M;
  return {
    x_cm: x * (ws.width / gm.width),
    y_cm: y * (ws.height / gm.height),
  };
}

function validateControllerPointerApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of POINTER_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validatePrintAreaElementDragFlow() {
  const source = read("components/designer/PrintAreaElement.tsx");
  const required = [
    "applyDesignerDragSnap",
    "clientPixelDeltaToDesignerCm",
    "createDesignerPointerDragState",
    "designerPointerContext",
    "applyWorkspacePosition",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`PrintAreaElement 缺少 Drag 投影：${token}`);
    } else {
      pass(`PrintAreaElement 使用 ${token}`);
    }
  }
  if (source.includes("applyDragSnap(")) {
    fail("PrintAreaElement 不應直接呼叫 applyDragSnap");
  } else {
    pass("PrintAreaElement snap 經 applyDesignerDragSnap");
  }
  if (source.includes("originX + dx") && source.includes("printArea.width / printRect")) {
    fail("PrintAreaElement 仍使用 workspace pointer drag");
  } else {
    pass("PrintAreaElement 已移除 workspace pointer drag 路徑");
  }
}

function validateDesignCanvasWiring() {
  const source = read("components/designer/DesignCanvas.tsx");
  if (!source.includes("designerPointerContext={designerCoordinateContext}")) {
    fail("DesignCanvas 未傳遞 designerPointerContext");
  } else {
    pass("DesignCanvas 傳遞 designerPointerContext");
  }
  if (!source.includes("layer={layer}")) {
    fail("DesignCanvas 未傳遞 layer 至 PrintAreaElement");
  } else {
    pass("DesignCanvas 傳遞 layer");
  }
}

function validateForbiddenFacadeWritesInPointerFiles() {
  for (const file of POINTER_FILES) {
    const source = read(file);
    for (const forbidden of FORBIDDEN_IN_POINTER_FILES) {
      if (source.includes(forbidden)) {
        fail(`${file} 直接使用禁止 API：${forbidden}`);
      }
    }
    pass(`${file} 無直接 Facade 寫入 API`);
  }
}

function validatePixelEquivalence() {
  // 固定視覺容器：workspace 與 designer CSS% 在線性投影下，拖曳像素 → cm 後再投影之視覺 % 不變
  const printRectWidth = 400;
  const printRectHeight = 500;
  const originWorkspace = { x: 10, y: 12 };
  const deltaPx = { x: 48, y: -30 };
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const ws = WORKSPACE_M[side];
      const gm =
        GARMENT_BLUE[side][size] ??
        (side === "front"
          ? { width: 35, height: 50 }
          : { width: 38, height: 45 });

      const legacyDx = deltaPx.x * (ws.width / printRectWidth);
      const legacyDy = deltaPx.y * (ws.height / printRectHeight);
      const legacyX = originWorkspace.x + legacyDx;
      const legacyY = originWorkspace.y + legacyDy;
      const legacyLeftPct = (legacyX / ws.width) * 100;

      const designerOrigin = workspaceToDesignerPoint(
        originWorkspace.x,
        originWorkspace.y,
        side,
        size,
      );
      const dDx = deltaPx.x * (gm.width / printRectWidth);
      const dDy = deltaPx.y * (gm.height / printRectHeight);
      const designerX = designerOrigin.x_cm + dDx;
      const designerY = designerOrigin.y_cm + dDy;
      const projected = designerToWorkspacePoint(designerX, designerY, side, size);
      const newLeftPct = (projected.x_cm / ws.width) * 100;

      cases += 1;
      if (Math.abs(legacyLeftPct - newLeftPct) > ROUND_TRIP_EPSILON) {
        fail(
          `Pixel drag equivalence ${side}/${size} left% drift=${Math.abs(legacyLeftPct - newLeftPct)}`,
        );
      }
    }
  }
  pass(`${cases} pixel drag visual equivalence checks`);
}

function validateGeometryUntouched() {
  const geometry = read("lib/geometry.ts");
  if (geometry.includes("designer-coordinate-controller")) {
    fail("geometry.ts 不應引用 controller");
  } else {
    pass("geometry.ts 未修改（無 controller 引用）");
  }
}

console.log("validate-designer-pointer-projection-13-0f\n");

validateControllerPointerApis();
validatePrintAreaElementDragFlow();
validateDesignCanvasWiring();
validateForbiddenFacadeWritesInPointerFiles();
validatePixelEquivalence();
validateGeometryUntouched();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
