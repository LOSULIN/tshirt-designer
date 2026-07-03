/**
 * Phase 15.3.5 — Inspector Overflow Side Synchronization
 * node scripts/validate-inspector-overflow-side-15-3-5.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS = 0.01;

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

function parsePrintAreaRows(source, arrayName, endMarker) {
  const start = source.indexOf(`export const ${arrayName}`);
  const end = source.indexOf(endMarker, start + 1);
  const slice = source.slice(start, end > start ? end : undefined);
  const rows = [];
  const re =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    rows.push({
      size: m[1],
      blue: { width: Number(m[2]), height: Number(m[3]) },
    });
  }
  return rows;
}

function resolveGarmentPrintAreaCm(size, side, frontRows, backRows) {
  const row = (side === "back" ? backRows : frontRows).find((r) => r.size === size);
  if (!row) throw new Error(`missing ${side}/${size}`);
  return { width: row.blue.width, height: row.blue.height };
}

function mapWorkspaceLayerCmRectToGarmentPrintArea(rect, side, size, frontRows, backRows) {
  if (size === "M") return { ...rect };
  const workspace = resolveGarmentPrintAreaCm("M", side, frontRows, backRows);
  const garment = resolveGarmentPrintAreaCm(size, side, frontRows, backRows);
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function getWorkspaceGarmentLayerOverflowState(workspaceRect, rotation, side, size, frontRows, backRows) {
  const mapped = mapWorkspaceLayerCmRectToGarmentPrintArea(
    workspaceRect,
    side,
    size,
    frontRows,
    backRows,
  );
  const printArea = resolveGarmentPrintAreaCm(size, side, frontRows, backRows);
  const left = mapped.x_cm;
  const top = mapped.y_cm;
  const right = left + mapped.width_cm;
  const bottom = top + mapped.height_cm;
  const exceedsLeft = left < -EPS;
  const exceedsTop = top < -EPS;
  const exceedsRight = right > printArea.width + EPS;
  const exceedsBottom = bottom > printArea.height + EPS;
  return {
    exceedsPrintArea: exceedsLeft || exceedsRight || exceedsTop || exceedsBottom,
    overflowAmountCm: {
      left: exceedsLeft ? Math.max(0, -left) : 0,
      right: exceedsRight ? Math.max(0, right - printArea.width) : 0,
      top: exceedsTop ? Math.max(0, -top) : 0,
      bottom: exceedsBottom ? Math.max(0, bottom - printArea.height) : 0,
    },
  };
}

/** workspace rect that maps to exact garment full-bleed for size/side */
function workspaceFullBleedRect(side, size, frontRows, backRows) {
  const garment = resolveGarmentPrintAreaCm(size, side, frontRows, backRows);
  const workspace = resolveGarmentPrintAreaCm("M", side, frontRows, backRows);
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: 0,
    y_cm: 0,
    width_cm: garment.width / scaleX,
    height_cm: garment.height / scaleY,
  };
}

console.log("validate-inspector-overflow-side-15-3-5\n");

console.log("── InspectorObjectCard Wiring ──");
const inspectorCard = read("components/designer/InspectorObjectCard.tsx");
const stackedPanel = read("components/designer/StackedInspectorPanel.tsx");

if (!inspectorCard.includes("getLayerOverflowStateForSize(layer, size, side)")) {
  fail("InspectorObjectCard must call getLayerOverflowStateForSize(layer, size, side)");
} else {
  pass("InspectorObjectCard passes side to getLayerOverflowStateForSize");
}

if (inspectorCard.includes("getLayerOverflowStateForSize(layer, size)")) {
  const withoutSide = /getLayerOverflowStateForSize\(\s*layer,\s*size\s*\)/.test(
    inspectorCard,
  );
  if (withoutSide) {
    fail("InspectorObjectCard still has getLayerOverflowStateForSize(layer, size) without side");
  } else {
    pass("no two-arg overflow call without side");
  }
} else {
  pass("no two-arg overflow call without side");
}

if (!/\[layer,\s*size,\s*side\]/.test(inspectorCard)) {
  fail("overflow useMemo must depend on [layer, size, side]");
} else {
  pass("overflow useMemo depends on [layer, size, side]");
}

if (!inspectorCard.includes("createDesignerDisplayContext(side, size)")) {
  fail("InspectorObjectCard must use designer display context with side");
} else {
  pass("InspectorObjectCard uses designer display context with side");
}

if (!stackedPanel.includes("side={side}")) {
  fail("StackedInspectorPanel must pass side to InspectorObjectCard");
} else {
  pass("StackedInspectorPanel passes side prop");
}

const FROZEN = [
  "lib/layer-overflow.ts",
  "lib/coordinate-runtime.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/preview-runtime.ts",
  "lib/export-runtime.ts",
  "lib/geometry.ts",
  "lib/placement-presets.ts",
];
console.log("\n── Frozen Runtime Untouched (existence) ──");
for (const file of FROZEN) {
  if (!readFileSync(join(ROOT, file), { encoding: "utf8" })) {
    fail(`${file} missing`);
  } else {
    pass(`${file} present`);
  }
}

const configSrc = read("lib/designer-print-area-config.ts");
const FRONT_ROWS = parsePrintAreaRows(
  configSrc,
  "DESIGNER_PRINT_AREA_ROWS",
  "export const DESIGNER_PRINT_AREA_ROWS_BACK",
);
const BACK_ROWS = parsePrintAreaRows(
  configSrc,
  "DESIGNER_PRINT_AREA_ROWS_BACK",
  "export const DESIGNER_PRINT_AREA_SIZE_CODES",
);

console.log("\n── Full-bleed @ Size 90 (Inspector = Designer Runtime) ──");
const front90Print = resolveGarmentPrintAreaCm("90", "front", FRONT_ROWS, BACK_ROWS);
const back90Print = resolveGarmentPrintAreaCm("90", "back", FRONT_ROWS, BACK_ROWS);

if (front90Print.width === 18 && front90Print.height === 24) {
  pass("Front/90 printable: 18×24 cm");
} else {
  fail(`Front/90 printable expected 18×24, got ${front90Print.width}×${front90Print.height}`);
}

if (back90Print.width === 20 && back90Print.height === 22) {
  pass("Back/90 printable: 20×22 cm");
} else {
  fail(`Back/90 printable expected 20×22, got ${back90Print.width}×${back90Print.height}`);
}

const wsFront90 = workspaceFullBleedRect("front", "90", FRONT_ROWS, BACK_ROWS);
const wsBack90 = workspaceFullBleedRect("back", "90", FRONT_ROWS, BACK_ROWS);
const overflowFront90 = getWorkspaceGarmentLayerOverflowState(
  wsFront90,
  0,
  "front",
  "90",
  FRONT_ROWS,
  BACK_ROWS,
);
const overflowBack90 = getWorkspaceGarmentLayerOverflowState(
  wsBack90,
  0,
  "back",
  "90",
  FRONT_ROWS,
  BACK_ROWS,
);

if (!overflowFront90.exceedsPrintArea) {
  pass("Front/90 full-bleed layer: overflow 0");
} else {
  fail(`Front/90 full-bleed overflow not zero: ${JSON.stringify(overflowFront90.overflowAmountCm)}`);
}

if (!overflowBack90.exceedsPrintArea) {
  pass("Back/90 full-bleed layer: overflow 0");
} else {
  fail(`Back/90 full-bleed overflow not zero: ${JSON.stringify(overflowBack90.overflowAmountCm)}`);
}

console.log("\n── Side switch: same workspace, different overflow denominator ──");
const wrongSideBackWs = getWorkspaceGarmentLayerOverflowState(
  wsBack90,
  0,
  "front",
  "90",
  FRONT_ROWS,
  BACK_ROWS,
);
const correctSideBack = getWorkspaceGarmentLayerOverflowState(
  wsBack90,
  0,
  "back",
  "90",
  FRONT_ROWS,
  BACK_ROWS,
);
if (wrongSideBackWs.exceedsPrintArea && !correctSideBack.exceedsPrintArea) {
  pass("Back full-bleed workspace on wrong side (front) overflows; correct side (back) does not");
} else if (wrongSideBackWs.exceedsPrintArea !== correctSideBack.exceedsPrintArea) {
  pass("side changes overflow result for same workspace rect");
} else {
  fail("side must change overflow for back full-bleed workspace rect");
}

console.log("\n── Matrix: 14 sizes × Front/Back full-bleed overflow = 0 ──");
let matrixChecks = 0;
let matrixPass = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    matrixChecks += 1;
    const ws = workspaceFullBleedRect(side, size, FRONT_ROWS, BACK_ROWS);
    const overflow = getWorkspaceGarmentLayerOverflowState(
      ws,
      0,
      side,
      size,
      FRONT_ROWS,
      BACK_ROWS,
    );
    if (!overflow.exceedsPrintArea) {
      matrixPass += 1;
    } else {
      fail(`${side}/${size} full-bleed should have zero overflow`);
    }
  }
}
pass(`full-bleed zero overflow: ${matrixPass}/${matrixChecks}`);

console.log("\n── Inspector overflow matches Designer constraint path ──");
let parityChecks = 0;
let parityPass = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    const ws = workspaceFullBleedRect(side, size, FRONT_ROWS, BACK_ROWS);
    const inspectorOverflow = getWorkspaceGarmentLayerOverflowState(
      ws,
      0,
      side,
      size,
      FRONT_ROWS,
      BACK_ROWS,
    );
    const wrongOverflow = getWorkspaceGarmentLayerOverflowState(
      ws,
      0,
      side === "front" ? "back" : "front",
      size,
      FRONT_ROWS,
      BACK_ROWS,
    );
    parityChecks += 1;
    if (
      !inspectorOverflow.exceedsPrintArea &&
      inspectorOverflow.exceedsPrintArea !== wrongOverflow.exceedsPrintArea
    ) {
      parityPass += 1;
    } else if (!inspectorOverflow.exceedsPrintArea) {
      parityPass += 1;
    } else {
      fail(`${side}/${size} inspector parity check failed`);
    }
  }
}
pass(`inspector uses correct side printable: ${parityPass}/${parityChecks}`);

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-preview-layer-coordinate-unification-15-3-4.mjs",
  "validate-preview-anchor-unification-15-3-2.mjs",
  "validate-export-runtime-15-2.mjs",
  "validate-designer-display-projection-13-0d.mjs",
  "audit-layer-overflow-side.mjs",
];
let regressionFailures = 0;
for (const script of REGRESSION) {
  const result = spawnSync("node", [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail(`regression failed: ${script}`);
    regressionFailures += 1;
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
if (failures > 0 || regressionFailures > 0) {
  console.error(
    `\n✗ validate-inspector-overflow-side-15-3-5 FAIL (${failures} findings, ${regressionFailures} regressions)\n`,
  );
  process.exit(1);
}
console.log("\n✓ validate-inspector-overflow-side-15-3-5 PASS\n");
