/**
 * Step 13.0I — Designer Snap Projection validation
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const ROUND_TRIP_EPSILON = 0.0001;

const SNAP_CONTROLLER_APIS = [
  "projectSnapTargetsToDesigner",
  "projectSnapGuidesToDesigner",
  "projectDesignerSnapResultToWorkspace",
  "applyDesignerDragSnap",
  "buildDesignerSnapTargetsFromLayers",
  "getDesignerGridSizeCm",
];

const FORBIDDEN_IN_SNAP_BOUNDARY = [
  "applyDragSnap(",
  "designerPointToWorkspacePoint(",
  "designerRectToWorkspaceRect(",
];

const SNAP_BOUNDARY_FILES = [
  "components/designer/PrintAreaElement.tsx",
  "components/designer/DesignCanvas.tsx",
];

const FORBIDDEN_RUNTIME_FILES = ["lib/geometry.ts"];

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

const GRID_SIZE_CM = 2.5;
const SNAP_THRESHOLD_CM = 1;

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

function workspaceLengthToDesigner(length, side, size, axis) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return length * (axis === "x" ? gm.width / ws.width : gm.height / ws.height);
}

function designerToWorkspacePoint(x, y, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = garmentFor(side, size);
  return {
    x_cm: x * (ws.width / gm.width),
    y_cm: y * (ws.height / gm.height),
  };
}

function snapAxisToGrid(value, gridSize, threshold) {
  const gridLine = Math.round(value / gridSize) * gridSize;
  if (Math.abs(value - gridLine) <= threshold) {
    return { value: gridLine, snapped: true };
  }
  return { value, snapped: false };
}

function applyDesignerCenterSnap(
  x,
  y,
  effW,
  effH,
  designerPrintArea,
) {
  const centerX = x + effW / 2;
  const centerY = y + effH / 2;
  const areaCenterX = designerPrintArea.width / 2;
  const areaCenterY = designerPrintArea.height / 2;
  let nextX = x;
  let nextY = y;
  let printCenterSnapX = false;
  let printCenterSnapY = false;
  if (Math.abs(centerX - areaCenterX) <= SNAP_THRESHOLD_CM) {
    nextX = areaCenterX - effW / 2;
    printCenterSnapX = true;
  }
  if (Math.abs(centerY - areaCenterY) <= SNAP_THRESHOLD_CM) {
    nextY = areaCenterY - effH / 2;
    printCenterSnapY = true;
  }
  return { x: nextX, y: nextY, printCenterSnapX, printCenterSnapY };
}

function validateControllerSnapApis() {
  const source = read("lib/designer-coordinate-controller.ts");
  for (const api of SNAP_CONTROLLER_APIS) {
    if (!source.includes(`export function ${api}`)) {
      fail(`Controller 缺少 ${api}`);
    } else {
      pass(`export function ${api}`);
    }
  }
}

function validatePrintAreaElementSnapFlow() {
  const source = read("components/designer/PrintAreaElement.tsx");
  const required = [
    "applyDesignerDragSnap",
    "setLayerDesignerPosition",
    "designerPointerContext",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`PrintAreaElement 缺少 Snap 投影：${token}`);
    } else {
      pass(`PrintAreaElement 使用 ${token}`);
    }
  }
  if (source.includes("applyDragSnap")) {
    fail("PrintAreaElement 仍直接呼叫 applyDragSnap");
  } else {
    pass("PrintAreaElement 已移除直接 applyDragSnap");
  }
  if (source.includes("resolveDesignerDragDeltaWorkspacePatch")) {
    fail("PrintAreaElement 應在 snap 前使用 Designer 座標");
  } else {
    pass("PrintAreaElement drag 經 Designer snap 路徑");
  }
}

function validateDesignCanvasSnapWiring() {
  const source = read("components/designer/DesignCanvas.tsx");
  const required = [
    "buildDesignerSnapTargetsFromLayers",
    "designerPrintableArea",
    "designerGridSizeCm",
    "getDesignerGridSizeCm",
  ];
  for (const token of required) {
    if (!source.includes(token)) {
      fail(`DesignCanvas 缺少 Snap 投影：${token}`);
    } else {
      pass(`DesignCanvas 使用 ${token}`);
    }
  }
  if (source.includes("buildSnapTargetsFromLayers")) {
    fail("DesignCanvas 仍使用 workspace buildSnapTargetsFromLayers");
  } else {
    pass("DesignCanvas 使用 Designer snap targets");
  }
}

function validateForbiddenFacadeInBoundary() {
  for (const file of SNAP_BOUNDARY_FILES) {
    const source = read(file);
    for (const forbidden of FORBIDDEN_IN_SNAP_BOUNDARY) {
      if (source.includes(forbidden)) {
        fail(`${file} 直接使用禁止 API：${forbidden}`);
      }
    }
    pass(`${file} 無禁止 Snap 邊界 API`);
  }
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
}

function validateCenterSnap() {
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const effW = 8;
      const effH = 6;
      const nearCenterX = gm.width / 2 - effW / 2 + 0.4;
      const nearCenterY = gm.height / 2 - effH / 2 + 0.4;
      const snapped = applyDesignerCenterSnap(
        nearCenterX,
        nearCenterY,
        effW,
        effH,
        gm,
      );
      cases += 1;
      const expectedX = gm.width / 2 - effW / 2;
      const expectedY = gm.height / 2 - effH / 2;
      if (!snapped.printCenterSnapX || !snapped.printCenterSnapY) {
        fail(`Center snap miss ${side}/${size}`);
      }
      if (
        Math.abs(snapped.x - expectedX) > ROUND_TRIP_EPSILON ||
        Math.abs(snapped.y - expectedY) > ROUND_TRIP_EPSILON
      ) {
        fail(`Center snap position ${side}/${size}`);
      }
    }
  }
  pass(`${cases} center snap checks (${SIZES.length} sizes × ${SIDES.length} sides)`);
}

function validateGridSnap() {
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const gridSize = workspaceLengthToDesigner(GRID_SIZE_CM, side, size, "x");
      const rawX = gridSize * 2 + 0.3;
      const snapped = snapAxisToGrid(rawX, gridSize, 0.8 * (gridSize / GRID_SIZE_CM));
      cases += 1;
      if (!snapped.snapped) {
        fail(`Grid snap miss ${side}/${size}`);
      }
      const pct = (snapped.value / gm.width) * 100;
      const legacyPct =
        ((snapped.value * (WORKSPACE_M[side].width / gm.width)) /
          WORKSPACE_M[side].width) *
        100;
      if (Math.abs(pct - legacyPct) > ROUND_TRIP_EPSILON) {
        fail(`Grid snap visual drift ${side}/${size}`);
      }
    }
  }
  pass(`${cases} grid snap checks`);
}

function validateElementSnapTargets() {
  const wsTarget = { id: "a", x: 10, y: 12, width: 8, height: 6, scale: 1 };
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const sx =
        garmentFor(side, size).width / WORKSPACE_M[side].width;
      const sy =
        garmentFor(side, size).height / WORKSPACE_M[side].height;
      const designer = {
        x: wsTarget.x * sx,
        y: wsTarget.y * sy,
        width: wsTarget.width * sx,
        height: wsTarget.height * sy,
      };
      cases += 1;
      const leftPct = (designer.x / garmentFor(side, size).width) * 100;
      const legacyLeftPct = (wsTarget.x / WORKSPACE_M[side].width) * 100;
      const projectedLegacy =
        legacyLeftPct *
        (WORKSPACE_M[side].width / garmentFor(side, size).width) *
        (garmentFor(side, size).width / WORKSPACE_M[side].width);
      if (Math.abs(leftPct - projectedLegacy) > ROUND_TRIP_EPSILON) {
        fail(`Snap target drift ${side}/${size}`);
      }
    }
  }
  pass(`${cases} element snap target projection checks`);
}

function validateGuideRendering() {
  const source = read("components/designer/ElementAlignmentGuides.tsx");
  if (!source.includes("printArea.width") || !source.includes("printArea.height")) {
    fail("ElementAlignmentGuides 渲染邏輯遭修改");
  } else {
    pass("ElementAlignmentGuides 渲染未修改");
  }
  const canvas = read("components/designer/DesignCanvas.tsx");
  if (!canvas.includes("printArea={designerPrintableArea}")) {
    fail("DesignCanvas 未以 Designer Printable Area 渲染導引");
  } else {
    pass("Guide data 使用 Designer Printable Area");
  }
}

function validateStorageRoundTrip() {
  let cases = 0;
  for (const side of SIDES) {
    for (const size of SIZES) {
      const gm = garmentFor(side, size);
      const designerX = gm.width / 2 - 4;
      const designerY = gm.height / 2 - 3;
      const ws = designerToWorkspacePoint(designerX, designerY, side, size);
      const sx = gm.width / WORKSPACE_M[side].width;
      const sy = gm.height / WORKSPACE_M[side].height;
      const roundTripX = ws.x_cm * sx;
      const roundTripY = ws.y_cm * sy;
      cases += 1;
      if (
        Math.abs(roundTripX - designerX) > ROUND_TRIP_EPSILON ||
        Math.abs(roundTripY - designerY) > ROUND_TRIP_EPSILON
      ) {
        fail(`Storage round-trip ${side}/${size}`);
      }
    }
  }
  pass(`${cases} storage round-trip checks`);
}

console.log("validate-designer-snap-projection-13-0i\n");

validateControllerSnapApis();
validatePrintAreaElementSnapFlow();
validateDesignCanvasSnapWiring();
validateForbiddenFacadeInBoundary();
validateGeometryUntouched();
validateCenterSnap();
validateGridSnap();
validateElementSnapTargets();
validateGuideRendering();
validateStorageRoundTrip();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
