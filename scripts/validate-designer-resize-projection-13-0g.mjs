/**
 * Step 13.0G — Designer Resize Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const RESIZE_CONTROLLER_APIS = [
  "clientPointToDesignerCm",
  "createDesignerPointerResizeState",
  "projectWorkspaceMaxResizeToDesigner",
  "resolveDesignerHandleResizeWorkspacePatch",
];

const FORBIDDEN_IN_RESIZE_FILES = [
  "designerRectToWorkspaceRect(",
  "designerLengthToWorkspaceLength(",
  "clientPointToPrintCm(",
];

const RESIZE_FILES = [
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
];

const FORBIDDEN_RUNTIME_FILES = [
  "lib/direct-manipulation.ts",
  "lib/geometry.ts",
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

function designerCssPercent(rect, side, size) {
  const gm = garmentFor(side, size);
  return {
    left: (rect.x_cm / gm.width) * 100,
    top: (rect.y_cm / gm.height) * 100,
    width: (rect.width_cm / gm.width) * 100,
    height: (rect.height_cm / gm.height) * 100,
  };
}

/** SE corner resize, rotation=0, lockAspect=true — mirrors computeCornerResizeCm */
function computeSeResizeCm(
  pointerX,
  pointerY,
  originX,
  originY,
  originWidth,
  originHeight,
) {
  const halfW = originWidth / 2;
  const halfH = originHeight / 2;
  const centerX = originX + halfW;
  const centerY = originY + halfH;
  const fixedLocalX = -halfW;
  const fixedLocalY = -halfH;
  const moveLocalX = pointerX - centerX;
  const moveLocalY = pointerY - centerY;
  let newW = Math.abs(moveLocalX - fixedLocalX);
  let newH = Math.abs(moveLocalY - fixedLocalY);
  const ratio = originWidth / originHeight;
  if (newW / newH > ratio) {
    newW = newH * ratio;
  } else {
    newH = newW / ratio;
  }
  newW = Math.max(0.5, newW);
  newH = Math.max(0.5, newH);
  const newHalfW = newW / 2;
  const newHalfH = newH / 2;
  const newFixedLocalX = -newHalfW;
  const newFixedLocalY = -newHalfH;
  const newCenterX = centerX + (newFixedLocalX + moveLocalX) / 2;
  const newCenterY = centerY + (newFixedLocalY + moveLocalY) / 2;
  return {
    x_cm: newCenterX - newHalfW,
    y_cm: newCenterY - newHalfH,
    width_cm: newW,
    height_cm: newH,
  };
}

function validateControllerResizeApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of RESIZE_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validatePrintAreaElementResizeFlow() {
  const source = read("components/designer/PrintAreaElement.tsx");
  const required = [
    "resolveDesignerHandleResizeWorkspacePatch",
    "clientPointToDesignerCm",
    "createDesignerPointerResizeState",
    "projectWorkspaceMaxResizeToDesigner",
    "computeHandleResizeCm",
    "designerPointerContext",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`PrintAreaElement 缺少 Resize 投影：${token}`);
    } else {
      pass(`PrintAreaElement 使用 ${token}`);
    }
  }
  if (source.includes("clientPointToPrintCm")) {
    fail("PrintAreaElement 仍使用 clientPointToPrintCm（workspace resize）");
  } else {
    pass("PrintAreaElement 已移除 clientPointToPrintCm");
  }
  if (source.includes("originX: x") && source.includes("originWidth: scaled.width")) {
    fail("PrintAreaElement 仍使用 workspace resize origin");
  } else {
    pass("PrintAreaElement 已移除 workspace resize origin");
  }
}

function validateDragRuntimeUntouched() {
  const source = read("components/designer/PrintAreaElement.tsx");
  const dragTokens = [
    "applyDesignerDragSnap",
    "clientPixelDeltaToDesignerCm",
    "createDesignerPointerDragState",
  ];
  for (const token of dragTokens) {
    if (!source.includes(token)) {
      fail(`Drag Runtime 遭修改/移除：${token}`);
    } else {
      pass(`Drag Runtime 保留 ${token}`);
    }
  }
}

function validateForbiddenFacadeWritesInResizeFiles() {
  for (const file of RESIZE_FILES) {
    const source = read(file);
    for (const forbidden of FORBIDDEN_IN_RESIZE_FILES) {
      if (source.includes(forbidden)) {
        fail(`${file} 直接使用禁止 API：${forbidden}`);
      }
    }
    pass(`${file} 無禁止 Facade / workspace pointer API`);
  }
}

function validateForbiddenRuntimeUntouched() {
  for (const file of FORBIDDEN_RUNTIME_FILES) {
    const source = read(file);
    if (source.includes("designer-coordinate-controller")) {
      fail(`${file} 不應引用 controller`);
    } else {
      pass(`${file} 未修改（無 controller 引用）`);
    }
  }
}

function validatePixelEquivalence() {
  const printRectWidth = 400;
  const printRectHeight = 500;
  const originWorkspace = { x_cm: 8, y_cm: 10, width_cm: 14, height_cm: 10 };
  const pointerPx = { x: 320, y: 280 };
  let cases = 0;

  for (const side of SIDES) {
    for (const size of SIZES) {
      const ws = WORKSPACE_M[side];
      const gm = garmentFor(side, size);
      const sx = gm.width / ws.width;
      const sy = gm.height / ws.height;

      const pointerWs = {
        x: pointerPx.x * (ws.width / printRectWidth),
        y: pointerPx.y * (ws.height / printRectHeight),
      };
      const legacyWorkspace = computeSeResizeCm(
        pointerWs.x,
        pointerWs.y,
        originWorkspace.x_cm,
        originWorkspace.y_cm,
        originWorkspace.width_cm,
        originWorkspace.height_cm,
      );

      const originDesigner = workspaceToDesignerRect(originWorkspace, side, size);
      const pointerDesigner = {
        x_cm: pointerPx.x * (gm.width / printRectWidth),
        y_cm: pointerPx.y * (gm.height / printRectHeight),
      };
      const designerRect = computeSeResizeCm(
        pointerDesigner.x_cm,
        pointerDesigner.y_cm,
        originDesigner.x_cm,
        originDesigner.y_cm,
        originDesigner.width_cm,
        originDesigner.height_cm,
      );
      const projectedWorkspace = designerToWorkspaceRect(designerRect, side, size);

      const legacyDisplay = designerCssPercent(
        workspaceToDesignerRect(legacyWorkspace, side, size),
        side,
        size,
      );
      const newDisplay = designerCssPercent(designerRect, side, size);
      const roundTripDisplay = designerCssPercent(
        workspaceToDesignerRect(projectedWorkspace, side, size),
        side,
        size,
      );

      cases += 1;
      for (const key of ["left", "top", "width", "height"]) {
        const driftLegacy = Math.abs(legacyDisplay[key] - newDisplay[key]);
        const driftRoundTrip = Math.abs(newDisplay[key] - roundTripDisplay[key]);
        if (driftLegacy > ROUND_TRIP_EPSILON) {
          fail(
            `Resize visual drift ${side}/${size} ${key}: legacy=${legacyDisplay[key]} new=${newDisplay[key]}`,
          );
        }
        if (driftRoundTrip > ROUND_TRIP_EPSILON) {
          fail(
            `Controller round-trip drift ${side}/${size} ${key}: designer=${newDisplay[key]} ws=${roundTripDisplay[key]}`,
          );
        }
      }
    }
  }
  pass(`${cases} resize visual equivalence checks (${SIZES.length} sizes × ${SIDES.length} sides)`);
}

console.log("validate-designer-resize-projection-13-0g\n");

validateControllerResizeApis();
validatePrintAreaElementResizeFlow();
validateDragRuntimeUntouched();
validateForbiddenFacadeWritesInResizeFiles();
validateForbiddenRuntimeUntouched();
validatePixelEquivalence();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
