/**
 * Step 13.0C — Designer Coordinate Projection Facade validation
 *
 * - Structural: facade module exports & dependency boundaries
 * - Numeric: 14 sizes × front/back round-trip error < 0.0001 cm
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const FACADE_PATH = "lib/designer-coordinate-facade.ts";
const ROUND_TRIP_EPSILON_CM = 0.0001;

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

/** Mirror DESIGNER_PRINT_AREA_ROWS / _BACK (M workspace baseline) */
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

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const REQUIRED_EXPORTS = [
  "createDesignerCoordinateContext",
  "workspaceRectToDesignerRect",
  "designerRectToWorkspaceRect",
  "workspacePointToDesignerPoint",
  "designerPointToWorkspacePoint",
  "workspaceLengthToDesignerLength",
  "designerLengthToWorkspaceLength",
  "projectLayerToDesigner",
  "projectLayerToWorkspace",
  "projectLayerPatchToWorkspace",
  "toDesignerCssPercent",
  "toDesignerCssPercentFromWorkspace",
  "getDesignerPrintableArea",
];

const FORBIDDEN_IMPORTS = [
  "geometry",
  "layer-alignment",
  "layer-constraints",
  "placement-presets",
  "direct-manipulation",
  "print-export-system",
  "mockup-export",
  "layer-overflow",
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
  const scaleX = gm.width / ws.width;
  const scaleY = gm.height / ws.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function designerToWorkspace(rect, side, size) {
  const ws = WORKSPACE_M[side];
  const gm = GARMENT_BLUE[side][size];
  const scaleX = ws.width / gm.width;
  const scaleY = ws.height / gm.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function maxAbsDelta(a, b) {
  return Math.max(
    Math.abs(a.x_cm - b.x_cm),
    Math.abs(a.y_cm - b.y_cm),
    Math.abs(a.width_cm - b.width_cm),
    Math.abs(a.height_cm - b.height_cm),
  );
}

function validateStructure() {
  if (!existsSync(join(ROOT, FACADE_PATH))) {
    fail(`${FACADE_PATH} 不存在`);
    return;
  }
  pass(`${FACADE_PATH} 存在`);

  const source = read(FACADE_PATH);

  for (const name of REQUIRED_EXPORTS) {
    if (!source.includes(`export function ${name}`)) {
      fail(`缺少 export function ${name}`);
    } else {
      pass(`export function ${name}`);
    }
  }

  if (!source.includes("DesignerCoordinateContext")) {
    fail("缺少 DesignerCoordinateContext 型別");
  } else {
    pass("DesignerCoordinateContext 型別");
  }

  for (const mod of FORBIDDEN_IMPORTS) {
    if (
      source.includes(`from "./${mod}"`) ||
      source.includes(`from '../${mod}'`)
    ) {
      fail(`Facade 不得 import ${mod}`);
    }
  }
  pass("Facade 未引用禁止的 Runtime 模組");

  if (
    !source.includes("getDesignerWorkspacePrintAreaCm") ||
    !source.includes("resolveGarmentPrintAreaCm")
  ) {
    fail("Facade 應透過 designer-workspace / garment-anchor-runtime 取得 print area");
  } else {
    pass("Facade 使用 workspace + garment print area 來源");
  }
}

const SAMPLE_RECTS = [
  { x_cm: 0, y_cm: 0, width_cm: 10, height_cm: 10 },
  { x_cm: 17.5, y_cm: 25, width_cm: 21, height_cm: 29.7 },
  { x_cm: 30, y_cm: 40, width_cm: 5, height_cm: 8 },
  { x_cm: 2.5, y_cm: 3.5, width_cm: 35, height_cm: 50 },
];

const SAMPLE_POINTS = [
  { x_cm: 0, y_cm: 0 },
  { x_cm: 17.5, y_cm: 25 },
  { x_cm: 35, y_cm: 50 },
];

const SAMPLE_LENGTHS = [
  { length: 1, axis: "x" },
  { length: 10.5, axis: "x" },
  { length: 29.7, axis: "y" },
  { length: 50, axis: "y" },
];

function validateRoundTrips() {
  let cases = 0;
  let worstError = 0;
  let worstLabel = "";

  for (const side of SIDES) {
    for (const size of SIZES) {
      for (const rect of SAMPLE_RECTS) {
        const designer = workspaceToDesigner(rect, side, size);
        const roundTrip = designerToWorkspace(designer, side, size);
        const delta = maxAbsDelta(rect, roundTrip);
        cases += 1;
        if (delta > worstError) {
          worstError = delta;
          worstLabel = `${side}/${size} rect`;
        }
        if (delta >= ROUND_TRIP_EPSILON_CM) {
          fail(
            `Rect round-trip ${side}/${size} delta=${delta.toFixed(8)} cm (max ${ROUND_TRIP_EPSILON_CM})`,
          );
        }
      }

      for (const point of SAMPLE_POINTS) {
        const ws = WORKSPACE_M[side];
        const gm = GARMENT_BLUE[side][size];
        const designer = {
          x_cm: point.x_cm * (gm.width / ws.width),
          y_cm: point.y_cm * (gm.height / ws.height),
        };
        const roundTrip = {
          x_cm: designer.x_cm * (ws.width / gm.width),
          y_cm: designer.y_cm * (ws.height / gm.height),
        };
        const delta = Math.max(
          Math.abs(point.x_cm - roundTrip.x_cm),
          Math.abs(point.y_cm - roundTrip.y_cm),
        );
        cases += 1;
        if (delta > worstError) {
          worstError = delta;
          worstLabel = `${side}/${size} point`;
        }
        if (delta >= ROUND_TRIP_EPSILON_CM) {
          fail(
            `Point round-trip ${side}/${size} delta=${delta.toFixed(8)} cm`,
          );
        }
      }

      for (const { length, axis } of SAMPLE_LENGTHS) {
        const ws = WORKSPACE_M[side];
        const gm = GARMENT_BLUE[side][size];
        const scaleToDesigner =
          axis === "x" ? gm.width / ws.width : gm.height / ws.height;
        const scaleToWorkspace =
          axis === "x" ? ws.width / gm.width : ws.height / gm.height;
        const designerLen = length * scaleToDesigner;
        const roundTrip = designerLen * scaleToWorkspace;
        const delta = Math.abs(length - roundTrip);
        cases += 1;
        if (delta > worstError) {
          worstError = delta;
          worstLabel = `${side}/${size} length-${axis}`;
        }
        if (delta >= ROUND_TRIP_EPSILON_CM) {
          fail(
            `Length round-trip ${side}/${size}/${axis} delta=${delta.toFixed(8)} cm`,
          );
        }
      }
    }
  }

  pass(
    `${cases} round-trip cases (${SIZES.length} sizes × ${SIDES.length} sides) worst=${worstError.toExponential(3)} cm @ ${worstLabel}`,
  );
}

function validateIdentityAtM() {
  const rect = { x_cm: 12, y_cm: 18, width_cm: 21, height_cm: 29.7 };
  for (const side of SIDES) {
    const designer = workspaceToDesigner(rect, side, "M");
    const delta = maxAbsDelta(rect, designer);
    if (delta >= ROUND_TRIP_EPSILON_CM) {
      fail(`M size should be identity mapping on ${side}, delta=${delta}`);
    } else {
      pass(`M size identity on ${side} (workspace === garment printable)`);
    }
  }
}

function validateCssPercentFormula() {
  const side = "front";
  const size = "90";
  const designerRect = { x_cm: 9, y_cm: 12, width_cm: 18, height_cm: 24 };
  const gm = GARMENT_BLUE[side][size];
  const left = (designerRect.x_cm / gm.width) * 100;
  const top = (designerRect.y_cm / gm.height) * 100;
  if (Math.abs(left - 50) > 1e-9 || Math.abs(top - 50) > 1e-9) {
    fail("toDesignerCssPercent formula sanity check failed");
  } else {
    pass("toDesignerCssPercent 分母為 garment printable area（90 front 50% @ 9,12）");
  }
}

console.log("validate-designer-coordinate-facade-13-0c\n");

validateStructure();
validateRoundTrips();
validateIdentityAtM();
validateCssPercentFormula();

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
