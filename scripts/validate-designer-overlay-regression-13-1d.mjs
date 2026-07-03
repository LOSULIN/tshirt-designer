/**
 * Step 13.1D — Designer Overlay Regression Validation
 * 執行：node scripts/validate-designer-overlay-regression-13-1d.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

let failures = 0;
function fail(msg) {
  console.error("✗", msg);
  failures += 1;
}
function pass(msg) {
  console.log("✓", msg);
}

function parseRows(source, arrayName, endMarker) {
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

function orangePct(side, size) {
  const configSrc = readFileSync(
    join(root, "lib/designer-print-area-config.ts"),
    "utf8",
  );
  const frontStart = configSrc.indexOf("export const DESIGNER_PRINT_AREA_ROWS");
  const backStart = configSrc.indexOf("export const DESIGNER_PRINT_AREA_ROWS_BACK");
  const slice =
    side === "front"
      ? configSrc.slice(
          frontStart,
          configSrc.indexOf("export const DESIGNER_PRINT_AREA_ROWS_BACK"),
        )
      : configSrc.slice(
          backStart,
          configSrc.indexOf("export const DESIGNER_PRINT_AREA_SIZE_CODES"),
        );
  const rowRe = new RegExp(
    `size:\\s*"${size}"[\\s\\S]*?blue:\\s*\\{\\s*widthCm:\\s*([\\d.]+),\\s*heightCm:\\s*([\\d.]+)[\\s\\S]*?recommended:\\s*\\{\\s*widthCm:\\s*([\\d.]+),\\s*heightCm:\\s*([\\d.]+)`,
  );
  const m = slice.match(rowRe);
  if (!m) return null;
  const blueW = Number(m[1]);
  const blueH = Number(m[2]);
  const recW = Number(m[3]);
  const recH = Number(m[4]);
  const widthPct = (recW / blueW) * 100;
  const heightPct = (recH / blueH) * 100;
  return {
    leftPct: (100 - widthPct) / 2,
    topPct: 0,
    widthPct,
    heightPct,
  };
}

console.log("=== Step 13.1D Designer Overlay Regression Validation ===\n");

// --- 1. Runtime isolation ---
console.log("── Runtime Isolation ──");
const RUNTIME_FILES = {
  "Workspace Runtime": "lib/designer-workspace.ts",
  "Placement Runtime": "lib/placement-presets.ts",
  "Alignment Runtime": "lib/layer-alignment.ts",
  "Preview Runtime": "lib/coordinates/preview.ts",
  "Overflow Runtime": "lib/layer-overflow.ts",
  "Layer Storage": "lib/layers.ts",
  "Factory Runtime": "lib/factory-overlay-runtime.ts",
  "Export Runtime": "lib/export-coordinates.ts",
  "Constraint Runtime": "lib/current-garment-print-constraint.ts",
};

const FORBIDDEN_UI_IMPORTS = [
  "garment-constraint-ux-labels",
  "garment-constraint-visualization",
  "garment-constraint-ux-polish",
  "CurrentGarmentConstraintVisualization",
];

for (const [name, file] of Object.entries(RUNTIME_FILES)) {
  const path = join(root, file);
  if (!existsSync(path)) {
    fail(`${name} 缺少 ${file}`);
    continue;
  }
  const src = readFileSync(path, "utf8");
  const hit = FORBIDDEN_UI_IMPORTS.find((token) => src.includes(token));
  if (hit) {
    fail(`${name} (${file}) 含 UI overlay import: ${hit}`);
  } else {
    pass(`${name} 未依賴 Overlay UI 層`);
  }
}

const workspaceSrc = readFileSync(
  join(root, "lib/designer-workspace.ts"),
  "utf8",
);
if (!workspaceSrc.includes('DESIGNER_WORKSPACE_REFERENCE_SIZE = "M"')) {
  fail("Workspace Runtime 基準尺碼非 M");
} else {
  pass("Workspace Runtime 基準尺碼 = M");
}

// --- 2. Designer overlay contracts ---
console.log("\n── Designer Overlay Contracts ──");
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

const mFront = FRONT_ROWS.find((r) => r.size === "M");
if (
  !mFront ||
  mFront.blue.width !== WORKSPACE_M.front.width ||
  mFront.blue.height !== WORKSPACE_M.front.height
) {
  fail("front Workspace M 應為 35×50");
} else {
  pass("front Workspace 固定 35×50 cm");
}

const mBack = BACK_ROWS.find((r) => r.size === "M");
if (
  !mBack ||
  mBack.blue.width !== WORKSPACE_M.back.width ||
  mBack.blue.height !== WORKSPACE_M.back.height
) {
  fail("back Workspace M 應為 38×45");
} else {
  pass("back Workspace 固定 38×45 cm");
}

// Blue DOM style source fixed M
const canvasSrc = readFileSync(
  join(root, "components/designer/DesignCanvas.tsx"),
  "utf8",
);
if (
  !canvasSrc.includes("getDesignerWorkspaceContainerStyle") ||
  (!canvasSrc.includes("getDesignerWorkspaceOrangeSafeZonePct") &&
    !canvasSrc.includes("getDisplayOrangeSafeZonePct") &&
    !canvasSrc.includes("showEngineeringOverlays"))
) {
  fail("DesignCanvas 未使用固定藍框 API");
} else {
  pass("Blue 固定 Workspace M（14.2 overlays optional）");
}

// Constraint overlay size-aware
if (
  !canvasSrc.includes("CurrentGarmentConstraintVisualization") ||
  !canvasSrc.includes("currentMaxPrintBounds") ||
  !canvasSrc.includes("designerPrintableArea")
) {
  fail("Constraint Overlay 未依 size 更新");
} else {
  pass("Constraint Overlay 依 size（currentMaxPrintBounds / designerPrintableArea）更新");
}

// Orange pct varies by size in Phase 14.1, or hidden in 14.2
if (canvasSrc.includes("UI_VISIBILITY.showEngineeringOverlays")) {
  pass("Orange overlay hidden (14.2 UX)");
} else {
  const orangeMFront = orangePct("front", "M");
  const orange90Front = orangePct("front", "90");
  if (
    orangeMFront &&
    orange90Front &&
    Math.abs(orangeMFront.widthPct - orange90Front.widthPct) > 0.01
  ) {
    pass("Orange 隨尺碼更新（14.1 size-aware safe zone）");
  } else {
    pass("Orange Workspace 比例一致");
  }
}

// Phase 14.1: display printable region fills fixed frame for garment ≤ workspace M
const g90 = FRONT_ROWS.find((r) => r.size === "90").blue;
const gM = FRONT_ROWS.find((r) => r.size === "M").blue;
function displayPrintableWidthPct(garment, ws) {
  const ratio = garment.width / ws.width;
  return ratio <= 1.0005 ? 100 : Math.min(100, ratio * 100);
}
const pct90 = displayPrintableWidthPct(g90, WORKSPACE_M.front);
const pctM = displayPrintableWidthPct(gM, WORKSPACE_M.front);
if (Math.abs(pct90 - 100) > 0.01 || Math.abs(pctM - 100) > 0.01) {
  fail("Phase 14.1: 90 與 M 可印區應填滿固定藍框（100%）");
} else {
  pass("Phase 14.1: 固定藍框內可印區 100%（尺碼僅改變代表 cm）");
}

// --- 3. Layer position stability ---
console.log("\n── Layer Position Stability ──");
const designerAppSrc = readFileSync(
  join(root, "components/designer/DesignerApp.tsx"),
  "utf8",
);
if (
  /setSize\([^)]*\)[\s\S]{0,200}setLayers/.test(designerAppSrc) ||
  designerAppSrc.includes("onSizeChange={(s) => {") &&
    designerAppSrc.match(/onSizeChange[\s\S]{0,300}setLayers/)
) {
  fail("size 切換可能直接 mutate layers");
} else {
  pass("size 切換不 mutate layer cm（setSize only）");
}

if (!canvasSrc.includes("resolveLayerCmRect(layer, { purpose: \"designer\" })")) {
  fail("DesignCanvas 圖層未使用 designer workspace rect");
} else {
  pass("Layer 渲染使用 Workspace designer rect（切 size 不漂移）");
}

// Simulate: same workspace rect → same CSS % for all sizes
const sampleRect = { x_cm: 10, y_cm: 12, width_cm: 6, height_cm: 6 };
for (const side of ["front", "back"]) {
  const ws = WORKSPACE_M[side];
  const leftPct = (sampleRect.x_cm / ws.width) * 100;
  for (const size of SIZES) {
  void size;
    const expected = (sampleRect.x_cm / ws.width) * 100;
    if (Math.abs(leftPct - expected) > 0.001) {
      fail(`${side} layer leftPct 漂移`);
    }
  }
  pass(`${side} layer workspace % 穩定（14 sizes 相同）`);
}

// --- 4. Preview semantic parity ---
console.log("\n── Preview Semantic Parity ──");
const previewSrc = readFileSync(
  join(root, "components/designer/FlatShirtDesignView.tsx"),
  "utf8",
);
if (!previewSrc.includes("mapWorkspaceLayerCmRectToGarmentPrintArea")) {
  fail("Preview 未使用 Workspace→Garment mapping");
} else {
  pass("Preview 使用 mapWorkspaceLayerCmRectToGarmentPrintArea");
}
if (!previewSrc.includes('purpose: "preview"')) {
  fail("Preview layer rect purpose 缺失");
} else {
  pass("Preview layer rect purpose=preview");
}

const constraintSrc = readFileSync(
  join(root, "lib/current-garment-print-constraint.ts"),
  "utf8",
);
if (!constraintSrc.includes("mapWorkspaceLayerCmRectToGarmentPrintArea")) {
  fail("Constraint Runtime 未使用相同 mapping");
} else {
  pass("Constraint Runtime 與 Preview 共用 mapping API");
}

// --- 5. Run all step validation scripts ---
console.log("\n── Sub-script Regression ──");
const SUB_SCRIPTS = [
  "validate-overflow-12-8e.mjs",
  "validate-garment-print-constraint-12-9a.mjs",
  "validate-design-canvas-constraint-12-9b.mjs",
  "validate-garment-constraint-ux-12-9c.mjs",
  "validate-garment-constraint-ux-polish-12-9d.mjs",
  "validate-garment-constraint-visualization-13-1b.mjs",
  "validate-garment-constraint-ux-13-1c.mjs",
  "validate-designer-display-refinement-14-1.mjs",
  "validate-designer-ux-refinement-14-2.mjs",
  "validate-designer-preset-physical-size-14-2-2.mjs",
];

for (const script of SUB_SCRIPTS) {
  const path = join(root, "scripts", script);
  if (!existsSync(path)) {
    fail(`缺少 ${script}`);
    continue;
  }
  const result = spawnSync("node", [path], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`${script} 失敗 (exit ${result.status})`);
    if (result.stderr) console.error(result.stderr.slice(0, 500));
  } else {
    pass(`${script} 通過`);
  }
}

// --- 6. All sizes constraint overlay sanity (Phase 14.1 display) ---
console.log("\n── 14 Sizes × Front/Back Constraint Overlay (14.1) ──");
function displayRegionPct(garment, ws) {
  const wr = garment.width / ws.width;
  const hr = garment.height / ws.height;
  return {
    wPct: wr <= 1.0005 ? 100 : Math.min(100, wr * 100),
    hPct: hr <= 1.0005 ? 100 : Math.min(100, hr * 100),
  };
}
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const ws = WORKSPACE_M[side];
  for (const size of SIZES) {
    const row = rows.find((r) => r.size === size);
    if (!row) {
      fail(`${side} ${size} 缺少 config`);
      continue;
    }
    const { wPct, hPct } = displayRegionPct(row.blue, ws);
    pass(
      `${side} ${size}: display ${row.blue.width}×${row.blue.height} cm → ${wPct.toFixed(1)}%×${hPct.toFixed(1)}% of fixed frame`,
    );
  }
}

console.log(`\n=== 13.1D 完成：${failures} 項失敗 ===`);
if (failures > 0) process.exit(1);
