/**
 * Step 13.1C — Professional Constraint UX 驗證
 * 執行：node scripts/validate-garment-constraint-ux-13-1c.mjs
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

function parseRows(source, arrayName, endMarker) {
  const start = source.indexOf(`export const ${arrayName}`);
  const end = source.indexOf(endMarker, start + 1);
  const slice = source.slice(start, end > start ? end : undefined);
  const rows = [];
  const re =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)[\s\S]*?recommended:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    rows.push({
      size: m[1],
      blue: { width: Number(m[2]), height: Number(m[3]) },
      recommended: { width: Number(m[4]), height: Number(m[5]) },
    });
  }
  return rows;
}

const configSrc = readFileSync(
  join(root, "lib/designer-print-area-config.ts"),
  "utf8",
);
const FRONT_ROWS = parseRows(
  configSrc,
  "DESIGNER_PRINT_AREA_ROWS",
  "export const DESIGNER_PRINT_AREA_ROWS_BACK",
);
const BACK_ROWS = parseRows(
  configSrc,
  "DESIGNER_PRINT_AREA_ROWS_BACK",
  "export const DESIGNER_PRINT_AREA_SIZE_CODES",
);

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

function formatDim(w, h) {
  return `${Math.round(w)} × ${Math.round(h)} cm`;
}

function buildLabels(side, size, garment, recommended) {
  return {
    current: formatDim(garment.width, garment.height),
    recommended: formatDim(recommended.width, recommended.height),
  };
}

console.log("=== Step 13.1C Professional Constraint UX ===\n");

const labelsSrc = readFileSync(
  join(root, "lib/garment-constraint-ux-labels.ts"),
  "utf8",
);
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

for (const name of [
  "buildConstraintOverlayUxLabels",
  "resolveRecommendedPrintAreaBounds",
  "Current Print Area",
  "Recommended Area",
]) {
  if (!labelsSrc.includes(name)) {
    fail(`garment-constraint-ux-labels 缺少 ${name}`);
  } else {
    pass(`labels API → ${name}`);
  }
}

for (const attr of [
  "data-current-print-area-label",
  "data-recommended-area-label",
  "data-garment-constraint-current-dimension",
  "data-garment-constraint-recommended-dimension",
  "data-garment-constraint-dimension-labels",
  "data-garment-constraint-exclusion-mask-tooltip",
]) {
  if (!vizSrc.includes(attr)) {
    fail(`CurrentGarmentConstraintVisualization 缺少 ${attr}`);
  } else {
    pass(`DOM → ${attr}`);
  }
}

if (!vizSrc.includes("group-hover/overlay") || !vizSrc.includes("hover:bg-zinc-500/35")) {
  fail("缺少 hover 樣式");
} else {
  pass("hover 樣式");
}

if (!canvasSrc.includes("side={side}") || !canvasSrc.includes("CurrentGarmentConstraintVisualization")) {
  fail("DesignCanvas 未傳 side 至 visualization");
} else {
  pass("DesignCanvas 傳 side");
}

const protectedFiles = [
  "lib/designer-workspace.ts",
  "lib/current-garment-print-constraint.ts",
  "lib/placement-presets.ts",
  "lib/layer-overflow.ts",
  "lib/garment-constraint-visualization.ts",
];
for (const file of protectedFiles) {
  const src = readFileSync(join(root, file), "utf8");
  if (src.includes("garment-constraint-ux-labels")) {
    fail(`${file} 不應 import ux-labels`);
  } else {
    pass(`${file} 未修改`);
  }
}

// 14 sizes × front/back label dimensions
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  for (const size of SIZES) {
    const row = rows.find((r) => r.size === size);
    if (!row) {
      fail(`${side} ${size} 缺少 config row`);
      continue;
    }
    const labels = buildLabels(side, size, row.blue, row.recommended);
    pass(
      `${side} ${size}: Current ${labels.current} · Recommended ${labels.recommended}`,
    );
  }
}

// 13.1B regression spot — 90 front masks
function getPrintablePct(ws, g) {
  return {
    widthPct: Math.min(100, (g.width / ws.width) * 100),
    heightPct: Math.min(100, (g.height / ws.height) * 100),
  };
}
const r90 = FRONT_ROWS.find((r) => r.size === "90");
const p90 = getPrintablePct(WORKSPACE_M.front, r90.blue);
if (p90.widthPct < 50 || p90.widthPct > 53) {
  fail(`front 90 printable widthPct 異常: ${p90.widthPct}`);
} else {
  pass(`front 90 printable ${p90.widthPct.toFixed(1)}%×${p90.heightPct.toFixed(1)}%`);
}

console.log(`\n=== 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
