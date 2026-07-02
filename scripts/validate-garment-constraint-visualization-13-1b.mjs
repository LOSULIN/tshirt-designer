/**
 * Step 13.1B — Current Garment Constraint Visualization 驗證
 * 執行：node scripts/validate-garment-constraint-visualization-13-1b.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let failures = 0;
function fail(msg) {
  console.error("✗", msg);
  failures += 1;
}
function pass(msg) {
  console.log("✓", msg);
}

function parsePrintAreaRows(source, arrayName, endMarker) {
  const start = source.indexOf(`export const ${arrayName}`);
  const end = source.indexOf(endMarker, start + 1);
  const slice = source.slice(start, end > start ? end : undefined);
  const sizes = [];
  const re =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    sizes.push({
      size: m[1],
      blue: { width: Number(m[2]), height: Number(m[3]) },
    });
  }
  return sizes;
}

const configSrc = readFileSync(
  join(root, "lib/designer-print-area-config.ts"),
  "utf8",
);
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

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};
const OVERFLOW_EPS = 0.01;

function mapWorkspaceToGarment(rect, side, size) {
  const workspace = WORKSPACE_M[side];
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const garment = rows.find((r) => r.size === size).blue;
  if (size === "M") return { ...rect };
  return {
    x_cm: rect.x_cm * (garment.width / workspace.width),
    y_cm: rect.y_cm * (garment.height / workspace.height),
    width_cm: rect.width_cm * (garment.width / workspace.width),
    height_cm: rect.height_cm * (garment.height / workspace.height),
  };
}

function constraintExceeds(rect, side, size) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const garment = rows.find((r) => r.size === size).blue;
  const mapped = mapWorkspaceToGarment(rect, side, size);
  const aabb = {
    left: mapped.x_cm,
    top: mapped.y_cm,
    right: mapped.x_cm + mapped.width_cm,
    bottom: mapped.y_cm + mapped.height_cm,
  };
  return (
    aabb.left < -OVERFLOW_EPS ||
    aabb.top < -OVERFLOW_EPS ||
    aabb.right > garment.width + OVERFLOW_EPS ||
    aabb.bottom > garment.height + OVERFLOW_EPS
  );
}

// --- Visualization math (mirror lib/garment-constraint-visualization.ts) ---
function getPrintableConstraintPctInWorkspace(workspace, garment) {
  const widthPct = (garment.width / workspace.width) * 100;
  const heightPct = (garment.height / workspace.height) * 100;
  return {
    leftPct: 0,
    topPct: 0,
    widthPct: Math.min(100, widthPct),
    heightPct: Math.min(100, heightPct),
  };
}

function getExclusionMaskCount(workspace, garment) {
  const printable = getPrintableConstraintPctInWorkspace(workspace, garment);
  let count = 0;
  if (printable.widthPct < 99.95) count += 1;
  if (printable.heightPct < 99.95) count += 1;
  return count;
}

console.log("=== Step 13.1B Current Garment Constraint Visualization ===\n");

// Component / DOM
const vizSrc = readFileSync(
  join(
    root,
    "components/designer/CurrentGarmentConstraintVisualization.tsx",
  ),
  "utf8",
);
const canvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
const vizLibSrc = readFileSync(
  join(root, "lib/garment-constraint-visualization.ts"),
  "utf8",
);

for (const [name, src] of [
  ["visualization lib", vizLibSrc],
  ["CurrentGarmentConstraintVisualization", vizSrc],
]) {
  if (!src.includes("getPrintableConstraintPctInWorkspace")) {
    fail(`${name} 缺少 getPrintableConstraintPctInWorkspace`);
  } else {
    pass(`${name} → printable pct`);
  }
  if (!src.includes("getGarmentConstraintExclusionMaskRectsInWorkspace")) {
    fail(`${name} 缺少 exclusion mask API`);
  } else {
    pass(`${name} → exclusion mask API`);
  }
}

for (const attr of [
  "data-current-garment-constraint-viz",
  "data-garment-constraint-exclusion-mask",
  "data-garment-printable-constraint-region",
]) {
  if (!vizSrc.includes(attr)) {
    fail(`CurrentGarmentConstraintVisualization 缺少 ${attr}`);
  } else {
    pass(`DOM → ${attr}`);
  }
}

if (!canvasSrc.includes("CurrentGarmentConstraintVisualization")) {
  fail("DesignCanvas 未掛載 CurrentGarmentConstraintVisualization");
} else {
  pass("DesignCanvas 掛載 CurrentGarmentConstraintVisualization");
}

// Runtime files must not import visualization layer
const protectedFiles = [
  "lib/designer-workspace.ts",
  "lib/current-garment-print-constraint.ts",
  "lib/layer-overflow.ts",
  "lib/placement-presets.ts",
  "lib/coordinates/preview.ts",
];
for (const file of protectedFiles) {
  const src = readFileSync(join(root, file), "utf8");
  if (src.includes("garment-constraint-visualization")) {
    fail(`${file} 不應 import visualization`);
  } else {
    pass(`${file} 未修改`);
  }
}

// Example sizes from spec (front)
const ws = WORKSPACE_M.front;
const examples = [
  { size: "90", garment: { width: 18, height: 24 }, masks: 2 },
  { size: "130", garment: { width: 25, height: 35 }, masks: 2 },
  { size: "M", garment: { width: 35, height: 50 }, masks: 0 },
  { size: "XXXL", garment: { width: 45, height: 60 }, masks: 0 },
];

for (const ex of examples) {
  const row = FRONT_ROWS.find((r) => r.size === ex.size);
  if (!row) {
    fail(`front ${ex.size} 缺少 config`);
    continue;
  }
  if (
    Math.abs(row.blue.width - ex.garment.width) > 0.01 ||
    Math.abs(row.blue.height - ex.garment.height) > 0.01
  ) {
    fail(
      `front ${ex.size} config 應為 ${ex.garment.width}×${ex.garment.height}`,
    );
    continue;
  }
  const printable = getPrintableConstraintPctInWorkspace(ws, ex.garment);
  const masks = getExclusionMaskCount(ws, ex.garment);
  if (masks !== ex.masks) {
    fail(`front ${ex.size} 遮罩數應為 ${ex.masks}，得 ${masks}`);
  } else {
    pass(
      `front ${ex.size}: 可印 ${ex.garment.width}×${ex.garment.height} · printable ${printable.widthPct.toFixed(1)}%×${printable.heightPct.toFixed(1)}% · masks=${masks}`,
    );
  }
}

// All 14 sizes front/back — mask count sanity
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const workspace = WORKSPACE_M[side];
  for (const row of rows) {
    const masks = getExclusionMaskCount(workspace, row.blue);
    const expected =
      row.blue.width < workspace.width - 0.01 ||
      row.blue.height < workspace.height - 0.01
        ? row.blue.width < workspace.width - 0.01 &&
            row.blue.height < workspace.height - 0.01
          ? 2
          : 1
        : 0;
    if (masks !== expected) {
      fail(
        `${side} ${row.size}: 遮罩數預期 ${expected} 得 ${masks} (garment ${row.blue.width}×${row.blue.height})`,
      );
    } else {
      pass(`${side} ${row.size}: exclusion masks=${masks}`);
    }
  }
}

// Regression — placement presets still within constraint
const PRINT_AREA_OFFSET_CM = { front: 7, back: 5 };
const LEFT_CHEST_OFFSET = 8;
const BACK_UPPER_COLLAR_TOP = 7;
function centerX(side) {
  return WORKSPACE_M[side].width / 2;
}
function anchorY(side, collarToTop, height) {
  return collarToTop - PRINT_AREA_OFFSET_CM[side] + height / 2;
}
function presetRect(p) {
  return {
    x_cm: p.anchorX - p.w / 2,
    y_cm: p.anchorY - p.h / 2,
    width_cm: p.w,
    height_cm: p.h,
  };
}
const PRESETS = {
  center: (side) => {
    const ws = WORKSPACE_M[side];
    return {
      x_cm: (ws.width - 6) / 2,
      y_cm: (ws.height - 6) / 2,
      width_cm: 6,
      height_cm: 6,
    };
  },
  leftChest: presetRect({
    w: 6,
    h: 6,
    anchorX: centerX("front") + LEFT_CHEST_OFFSET,
    anchorY: anchorY("front", 9, 6),
  }),
  a4: presetRect({
    w: 21,
    h: 29.7,
    anchorX: centerX("front"),
    anchorY: anchorY("front", PRINT_AREA_OFFSET_CM.front, 29.7),
  }),
  a3: presetRect({
    w: 29.7,
    h: 42,
    anchorX: centerX("back"),
    anchorY: anchorY("back", BACK_UPPER_COLLAR_TOP, 42),
  }),
};

function expectWithin(side, size, rect, label) {
  if (constraintExceeds(rect, side, size)) {
    fail(`${side} ${size}: ${label} 應 within`);
  } else {
    pass(`${side} ${size}: ${label} OK`);
  }
}

for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  for (const row of rows) {
    expectWithin(side, row.size, PRESETS.center(side), "6×6 Center");
  }
}
for (const row of FRONT_ROWS) {
  expectWithin("front", row.size, PRESETS.leftChest, "Left Chest");
  expectWithin("front", row.size, PRESETS.a4, "A4");
}
for (const row of BACK_ROWS) {
  expectWithin("back", row.size, PRESETS.a3, "A3");
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
