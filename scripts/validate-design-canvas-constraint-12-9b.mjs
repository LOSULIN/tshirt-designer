/**
 * Step 12.9B — DesignCanvas adopts Current Garment Constraint Runtime
 * 執行：node scripts/validate-design-canvas-constraint-12-9b.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

let failures = 0;
function fail(msg) {
  console.error("✗", msg);
  failures += 1;
}
function pass(msg) {
  console.log("✓", msg);
}

function mapWorkspaceToGarment(rect, side, size) {
  const workspace = WORKSPACE_M[side];
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const garment = rows.find((r) => r.size === size)?.blue ?? workspace;
  if (size === "M") return { ...rect };
  return {
    x_cm: rect.x_cm * (garment.width / workspace.width),
    y_cm: rect.y_cm * (garment.height / workspace.height),
    width_cm: rect.width_cm * (garment.width / workspace.width),
    height_cm: rect.height_cm * (garment.height / workspace.height),
  };
}

/** 模擬 Current Garment Constraint Runtime 判定 */
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

const PRINT_AREA_OFFSET_CM = { front: 7, back: 5 };
const LEFT_CHEST_OFFSET = 8;
const BACK_UPPER_COLLAR_TOP = 7;

function centerX(side) {
  return WORKSPACE_M[side].width / 2;
}
function anchorY(side, collarToTop, height) {
  return collarToTop - PRINT_AREA_OFFSET_CM[side] + height / 2;
}

const PRESETS = {
  "6x6-center": (side) => {
    const ws = WORKSPACE_M[side];
    return {
      x_cm: (ws.width - 6) / 2,
      y_cm: (ws.height - 6) / 2,
      width_cm: 6,
      height_cm: 6,
    };
  },
  "10x3": {
    w: 10,
    h: 3,
    anchorX: centerX("front") + LEFT_CHEST_OFFSET,
    anchorY: anchorY("front", 9, 3),
  },
  a4: {
    w: 21,
    h: 29.7,
    anchorX: centerX("front"),
    anchorY: anchorY("front", PRINT_AREA_OFFSET_CM.front, 29.7),
  },
  a3: {
    w: 29.7,
    h: 42,
    anchorX: centerX("back"),
    anchorY: anchorY("back", BACK_UPPER_COLLAR_TOP, 42),
  },
};

function presetRect(p) {
  return {
    x_cm: p.anchorX - p.w / 2,
    y_cm: p.anchorY - p.h / 2,
    width_cm: p.w,
    height_cm: p.h,
  };
}

console.log("=== Step 12.9B DesignCanvas Constraint Validation ===\n");

// DesignCanvas 採用 Constraint Runtime
const canvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
if (!canvasSrc.includes("buildCurrentGarmentConstraintMap")) {
  fail("DesignCanvas 未使用 buildCurrentGarmentConstraintMap");
} else {
  pass("DesignCanvas 使用 buildCurrentGarmentConstraintMap");
}
if (canvasSrc.includes("buildWorkspaceGarmentLayerOverflowMap")) {
  fail("DesignCanvas 仍引用 buildWorkspaceGarmentLayerOverflowMap");
} else {
  pass("DesignCanvas 已移除 buildWorkspaceGarmentLayerOverflowMap");
}
if (!canvasSrc.includes("exceedsGarmentPrintArea")) {
  fail("DesignCanvas 未使用 exceedsGarmentPrintArea");
} else {
  pass("DesignCanvas 使用 exceedsGarmentPrintArea");
}

function expectWithin(side, size, rect, label) {
  if (constraintExceeds(rect, side, size)) {
    fail(`${side} ${size}: ${label} → exceedsGarmentPrintArea 應 false`);
  } else {
    pass(`${side} ${size}: ${label} withinGarmentPrintArea`);
  }
}

function expectExceeds(side, size, rect, label) {
  if (!constraintExceeds(rect, side, size)) {
    fail(`${side} ${size}: ${label} → exceedsGarmentPrintArea 應 true`);
  } else {
    pass(`${side} ${size}: ${label} exceedsGarmentPrintArea`);
  }
}

// 6×6 center — front + back all sizes
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const rect = PRESETS["6x6-center"](side);
  for (const row of rows) {
    expectWithin(side, row.size, rect, "6×6 置中");
  }
}

// 10×3 left chest text — front
for (const row of FRONT_ROWS) {
  expectWithin("front", row.size, presetRect(PRESETS["10x3"]), "10×3 左胸文字");
}

// A4 front
for (const row of FRONT_ROWS) {
  expectWithin("front", row.size, presetRect(PRESETS.a4), "A4 直式");
}

// A3 back
for (const row of BACK_ROWS) {
  expectWithin("back", row.size, presetRect(PRESETS.a3), "A3 直式");
}

// Oversize — front + back
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const ws = WORKSPACE_M[side];
  const rect = {
    x_cm: -2,
    y_cm: -2,
    width_cm: ws.width + 4,
    height_cm: ws.height + 4,
  };
  for (const row of rows) {
    expectExceeds(side, row.size, rect, "超大圖");
  }
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
