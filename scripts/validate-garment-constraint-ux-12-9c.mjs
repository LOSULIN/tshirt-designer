/**
 * Step 12.9C — Professional Print Constraint UX 驗證
 * 執行：node scripts/validate-garment-constraint-ux-12-9c.mjs
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

function overlayPct(side, size) {
  const ws = WORKSPACE_M[side];
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const g = rows.find((r) => r.size === size).blue;
  return {
    widthPct: (g.width / ws.width) * 100,
    heightPct: (g.height / ws.height) * 100,
  };
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

console.log("=== Step 12.9C Professional Print Constraint UX ===\n");

// DOM / component presence
const canvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
const domChecks = [
  [
    "CurrentGarmentConstraintVisualization",
    "data-garment-print-constraint-overlay",
  ],
  ["GarmentConstraintLayerWarning", "data-garment-constraint-layer-warning"],
  ["DesignWorkspaceStatusBar", "data-garment-constraint-status-warning"],
  ["LayerInspectorCard", "data-garment-constraint-inspector-warning"],
  ["PlacementPresetToolbar", "data-garment-constraint-selection-warning"],
];
for (const [component, attr] of domChecks) {
  const file =
    component === "LayerInspectorCard"
      ? "components/designer/LayerInspectorCard.tsx"
      : component === "PlacementPresetToolbar"
        ? "components/designer/PlacementPresetToolbar.tsx"
        : component === "DesignWorkspaceStatusBar"
          ? "components/designer/DesignWorkspaceStatusBar.tsx"
          : `components/designer/${component}.tsx`;
  const src = readFileSync(join(root, file), "utf8");
  if (!src.includes(attr)) {
    fail(`${component} 缺少 ${attr}`);
  } else {
    pass(`${component} → ${attr}`);
  }
}
if (!canvasSrc.includes("CurrentGarmentConstraintVisualization")) {
  fail("DesignCanvas 未掛載 CurrentGarmentConstraintVisualization");
} else {
  pass("DesignCanvas 掛載 CurrentGarmentConstraintVisualization");
}
if (!readFileSync(join(root, "lib/live-design-state.ts"), "utf8").includes(
  "buildLayerInspectorReportWithConstraint",
)) {
  fail("live-design-state 未使用 Constraint Inspector");
} else {
  pass("Inspector 使用 buildLayerInspectorReportWithConstraint");
}

// Overlay 比例（M = 100%，90 front 縮小）
const mFront = overlayPct("front", "M");
if (Math.abs(mFront.widthPct - 100) > 0.1) {
  fail(`front M overlay width 應 ≈100%，得 ${mFront.widthPct}`);
} else {
  pass("front M overlay 100%×100%");
}
const s90 = overlayPct("front", "90");
pass(
  `front 90 overlay ${s90.widthPct.toFixed(1)}%×${s90.heightPct.toFixed(1)}%`,
);

function expectWithin(side, size, rect, label) {
  if (constraintExceeds(rect, side, size)) {
    fail(`${side} ${size}: ${label} 應 within`);
  } else {
    pass(`${side} ${size}: ${label} OK`);
  }
}
function expectExceeds(side, size, rect, label) {
  if (!constraintExceeds(rect, side, size)) {
    fail(`${side} ${size}: ${label} 應 exceeds`);
  } else {
    pass(`${side} ${size}: ${label} exceeds`);
  }
}

for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  for (const row of rows) {
    expectWithin(side, row.size, PRESETS.center(side), "6×6 Center");
  }
}
for (const row of FRONT_ROWS) {
  expectWithin("front", row.size, PRESETS.leftChest, "Left Chest 6×6");
  expectWithin("front", row.size, PRESETS.a4, "A4");
}
for (const row of BACK_ROWS) {
  expectWithin("back", row.size, PRESETS.a3, "A3");
}
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
    expectExceeds(side, row.size, rect, "Oversize");
  }
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
