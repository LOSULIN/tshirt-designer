/**
 * Step 12.8E — Overflow Runtime Canonicalization 全尺寸驗證
 * 執行：node scripts/validate-overflow-12-8e.mjs
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** 從 designer-print-area-config 解析尺碼表（避免 TS circular import） */
function parsePrintAreaRows(source, arrayName) {
  const start = source.indexOf(`export const ${arrayName}`);
  const endMarker =
    arrayName === "DESIGNER_PRINT_AREA_ROWS"
      ? "export const DESIGNER_PRINT_AREA_ROWS_BACK"
      : "export const DESIGNER_PRINT_AREA_SIZE_CODES";
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
);
const BACK_ROWS = parsePrintAreaRows(
  configSrc,
  "DESIGNER_PRINT_AREA_ROWS_BACK",
);

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const EPS = 0.01;
const OVERFLOW_EPS = 0.01;

let failures = 0;

function fail(msg) {
  console.error("✗", msg);
  failures += 1;
}

function pass(msg) {
  console.log("✓", msg);
}

function getRotatedAabb(w, h, rotDeg) {
  const rad = (rotDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return { width: w * cos + h * sin, height: w * sin + h * cos };
}

function orientedAabb(rect, rotation) {
  const aabb = getRotatedAabb(rect.width_cm, rect.height_cm, rotation);
  const cx = rect.x_cm + rect.width_cm / 2;
  const cy = rect.y_cm + rect.height_cm / 2;
  return {
    left: cx - aabb.width / 2,
    top: cy - aabb.height / 2,
    right: cx + aabb.width / 2,
    bottom: cy + aabb.height / 2,
  };
}

function getRectOverflowState(rect, rotation, printArea) {
  const aabb = orientedAabb(rect, rotation);
  const exceedsLeft = aabb.left < -OVERFLOW_EPS;
  const exceedsTop = aabb.top < -OVERFLOW_EPS;
  const exceedsRight = aabb.right > printArea.width + OVERFLOW_EPS;
  const exceedsBottom = aabb.bottom > printArea.height + OVERFLOW_EPS;
  return {
    exceedsPrintArea:
      exceedsLeft || exceedsRight || exceedsTop || exceedsBottom,
  };
}

function mapWorkspaceToGarment(rect, side, size) {
  const workspace = WORKSPACE_M[side];
  const row =
    (side === "front" ? FRONT_ROWS : BACK_ROWS).find((r) => r.size === size) ??
    WORKSPACE_M;
  const garment =
    side === "front"
      ? FRONT_ROWS.find((r) => r.size === size)?.blue ??
        WORKSPACE_M.front
      : BACK_ROWS.find((r) => r.size === size)?.blue ?? WORKSPACE_M.back;
  if (size === "M") return { ...rect };
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function workspaceGarmentOverflow(rect, rotation, side, size) {
  const mapped = mapWorkspaceToGarment(rect, side, size);
  const row = (side === "front" ? FRONT_ROWS : BACK_ROWS).find(
    (r) => r.size === size,
  );
  const garment = row.blue;
  return getRectOverflowState(mapped, rotation, garment);
}

function toCssPercent(rect, printArea) {
  return {
    left: (rect.x_cm / printArea.width) * 100,
    top: (rect.y_cm / printArea.height) * 100,
    width: (rect.width_cm / printArea.width) * 100,
    height: (rect.height_cm / printArea.height) * 100,
  };
}

function previewCenterMatches(rect, side, size) {
  const mapped = mapWorkspaceToGarment(rect, side, size);
  const garment = (side === "front" ? FRONT_ROWS : BACK_ROWS).find(
    (r) => r.size === size,
  ).blue;
  const ws = WORKSPACE_M[side];
  const mPct = toCssPercent(mapped, garment);
  const wPct = toCssPercent(rect, ws);
  const mcx = mPct.left + mPct.width / 2;
  const mcy = mPct.top + mPct.height / 2;
  const wcx = wPct.left + wPct.width / 2;
  const wcy = wPct.top + wPct.height / 2;
  return Math.abs(mcx - wcx) < 0.02 && Math.abs(mcy - wcy) < 0.02;
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

/** 與 verify-placement-presets.mjs / buildPlacementPresets 一致 */
const PRESETS = {
  "left-chest-6": {
    w: 6,
    h: 6,
    anchorX: centerX("front") + LEFT_CHEST_OFFSET,
    anchorY: anchorY("front", 9, 6),
  },
  "left-chest-text": {
    w: 10,
    h: 3,
    anchorX: centerX("front") + LEFT_CHEST_OFFSET,
    anchorY: anchorY("front", 9, 3),
  },
  "a4-front": {
    w: 21,
    h: 29.7,
    anchorX: centerX("front"),
    anchorY: anchorY("front", PRINT_AREA_OFFSET_CM.front, 29.7),
  },
  "a3-back": {
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

console.log("=== Step 12.8E Overflow Validation ===\n");
console.log(
  `Front 尺碼 (${FRONT_ROWS.length}): ${FRONT_ROWS.map((r) => r.size).join(", ")}`,
);
console.log(
  `Back 尺碼 (${BACK_ROWS.length}): ${BACK_ROWS.map((r) => r.size).join(", ")}\n`,
);

// 6×6 workspace 幾何置中
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const ws = WORKSPACE_M[side];
  const rect = {
    x_cm: (ws.width - 6) / 2,
    y_cm: (ws.height - 6) / 2,
    width_cm: 6,
    height_cm: 6,
  };
  for (const row of rows) {
    const size = row.size;
    const o = workspaceGarmentOverflow(rect, 0, side, size);
    if (o.exceedsPrintArea) {
      fail(`${side} ${size}: 6×6 置中 → 應 overflow=false`);
    } else if (!previewCenterMatches(rect, side, size)) {
      fail(`${side} ${size}: 6×6 Preview 中心 % 不一致`);
    } else {
      pass(`${side} ${size}: 6×6 置中 overflow=false`);
    }
  }
}

// A4 front
for (const row of FRONT_ROWS) {
  const rect = presetRect(PRESETS["a4-front"]);
  const o = workspaceGarmentOverflow(rect, 0, "front", row.size);
  if (o.exceedsPrintArea) {
    fail(`front ${row.size}: A4 直式 → 應 overflow=false`);
  } else {
    pass(`front ${row.size}: A4 直式 overflow=false`);
  }
}

// A3 back
for (const row of BACK_ROWS) {
  const rect = presetRect(PRESETS["a3-back"]);
  const o = workspaceGarmentOverflow(rect, 0, "back", row.size);
  if (o.exceedsPrintArea) {
    fail(`back ${row.size}: A3 直式 → 應 overflow=false`);
  } else {
    pass(`back ${row.size}: A3 直式 overflow=false`);
  }
}

// 左胸 LOGO 6×6
for (const row of FRONT_ROWS) {
  const rect = presetRect(PRESETS["left-chest-6"]);
  const o = workspaceGarmentOverflow(rect, 0, "front", row.size);
  if (o.exceedsPrintArea) {
    fail(`front ${row.size}: 左胸 LOGO 6×6 → 應 overflow=false`);
  } else {
    pass(`front ${row.size}: 左胸 LOGO 6×6 overflow=false`);
  }
}

// 左胸文字 10×3
for (const row of FRONT_ROWS) {
  const rect = presetRect(PRESETS["left-chest-text"]);
  const o = workspaceGarmentOverflow(rect, 0, "front", row.size);
  if (o.exceedsPrintArea) {
    fail(`front ${row.size}: 左胸文字 10×3 → 應 overflow=false`);
  } else {
    pass(`front ${row.size}: 左胸文字 10×3 overflow=false`);
  }
}

// 超大圖
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
    const o = workspaceGarmentOverflow(rect, 0, side, row.size);
    if (!o.exceedsPrintArea) {
      fail(`${side} ${row.size}: 超大圖 → 應 overflow=true`);
    } else {
      pass(`${side} ${row.size}: 超大圖 overflow=true`);
    }
  }
}

console.log("\n--- StatusBar 可印尺寸（designer-print-area-config）---");
for (const row of FRONT_ROWS) {
  pass(`front ${row.size}: ${row.blue.width}×${row.blue.height} cm`);
}
for (const row of BACK_ROWS) {
  pass(`back ${row.size}: ${row.blue.width}×${row.blue.height} cm`);
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
