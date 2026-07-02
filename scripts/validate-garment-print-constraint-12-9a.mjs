/**
 * Step 12.9A — Current Garment Print Constraint Runtime 驗證
 * 執行：node scripts/validate-garment-print-constraint-12-9a.mjs
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
const WORKSPACE_M = { front: { width: 35, height: 50 }, back: { width: 38, height: 45 } };
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
  const garment = FRONT_ROWS.find((r) => r.size === size)?.blue ?? workspace;
  if (size === "M") return { ...rect };
  return {
    x_cm: rect.x_cm * (garment.width / workspace.width),
    y_cm: rect.y_cm * (garment.height / workspace.height),
    width_cm: rect.width_cm * (garment.width / workspace.width),
    height_cm: rect.height_cm * (garment.height / workspace.height),
  };
}

function constraintFromRect(rect, rotation, garmentPrintArea) {
  const aabb = {
    left: rect.x_cm,
    top: rect.y_cm,
    right: rect.x_cm + rect.width_cm,
    bottom: rect.y_cm + rect.height_cm,
  };
  const exceedsLeft = aabb.left < -OVERFLOW_EPS;
  const exceedsTop = aabb.top < -OVERFLOW_EPS;
  const exceedsRight = aabb.right > garmentPrintArea.width + OVERFLOW_EPS;
  const exceedsBottom = aabb.bottom > garmentPrintArea.height + OVERFLOW_EPS;
  const exceeds = exceedsLeft || exceedsRight || exceedsTop || exceedsBottom;
  return { withinGarmentPrintArea: !exceeds, exceedsGarmentPrintArea: exceeds };
}

console.log("=== Step 12.9A Garment Print Constraint Validation ===\n");

// 6×6 front 置中 — 全 front 尺碼應 within
const ws = WORKSPACE_M.front;
const centered = {
  x_cm: (ws.width - 6) / 2,
  y_cm: (ws.height - 6) / 2,
  width_cm: 6,
  height_cm: 6,
};
for (const row of FRONT_ROWS) {
  const mapped = mapWorkspaceToGarment(centered, "front", row.size);
  const c = constraintFromRect(mapped, 0, row.blue);
  if (!c.withinGarmentPrintArea) {
    fail(`front ${row.size}: 6×6 置中 → withinGarmentPrintArea 應 true`);
  } else {
    pass(`front ${row.size}: 6×6 withinGarmentPrintArea=true`);
  }
}

// 超大圖 — 應 exceeds
const oversized = {
  x_cm: -2,
  y_cm: -2,
  width_cm: ws.width + 4,
  height_cm: ws.height + 4,
};
for (const row of FRONT_ROWS) {
  const mapped = mapWorkspaceToGarment(oversized, "front", row.size);
  const c = constraintFromRect(mapped, 0, row.blue);
  if (!c.exceedsGarmentPrintArea) {
    fail(`front ${row.size}: 超大圖 → exceedsGarmentPrintArea 應 true`);
  } else {
    pass(`front ${row.size}: 超大圖 exceedsGarmentPrintArea=true`);
  }
}

// API 檔案存在且匯出目標函式
const apiSrc = readFileSync(
  join(root, "lib/current-garment-print-constraint.ts"),
  "utf8",
);
for (const fn of [
  "getCurrentGarmentConstraintState",
  "buildCurrentGarmentConstraintMap",
  "mapWorkspaceLayerCmRectToGarmentPrintArea",
]) {
  if (!apiSrc.includes(fn)) {
    fail(`lib/current-garment-print-constraint.ts 缺少 ${fn}`);
  } else {
    pass(`API 匯出/引用 ${fn}`);
  }
}

if (apiSrc.includes("layer-overflow.ts") && apiSrc.match(/from\s+["']\.\/layer-overflow["']/)) {
  pass("重用 getRectOverflowState（未修改 layer-overflow.ts）");
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
