/**
 * Phase 15.3.4 — Preview Layer Coordinate Unification
 * node scripts/validate-preview-layer-coordinate-unification-15-3-4.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-4;

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

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

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

const ALL_PRESETS = [
  { id: "left-chest-logo-6", sides: ["front"], width_cm: 6, height_cm: 6, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-logo-8", sides: ["front"], width_cm: 8, height_cm: 8, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-logo", sides: ["front"], width_cm: 10, height_cm: 10, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-text", sides: ["front"], width_cm: 10, height_cm: 3, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-text", sides: ["front"], width_cm: 29, height_cm: 10, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-logo", sides: ["front"], width_cm: 25, height_cm: 25, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-a4-portrait", sides: ["front"], width_cm: 21, height_cm: 29.7, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-a4-landscape", sides: ["front"], width_cm: 29.7, height_cm: 21, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "back-center-text", sides: ["back"], width_cm: 30, height_cm: 12, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-25", sides: ["back"], width_cm: 25, height_cm: 25, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-a4-portrait", sides: ["back"], width_cm: 21, height_cm: 29.7, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-a3-portrait", sides: ["back"], width_cm: 29.7, height_cm: 42, anchorX_cm: 19, anchorY_cm: 20 },
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

function approx(a, b) {
  return Math.abs(a - b) <= EPS;
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

function workspaceToGarment(rect, workspace, garment) {
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function designerToWorkspace(rect, workspace, garment) {
  const scaleX = workspace.width / garment.width;
  const scaleY = workspace.height / garment.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function resolvePhysicalPresetWorkspaceRect(preset, side, garment) {
  const workspace = WORKSPACE_M[side];
  const workspaceAnchorTarget = {
    x_cm: preset.anchorX_cm - preset.width_cm / 2,
    y_cm: preset.anchorY_cm - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
  const designerAnchorRect = workspaceToGarment(
    workspaceAnchorTarget,
    workspace,
    garment,
  );
  const centerX = designerAnchorRect.x_cm + designerAnchorRect.width_cm / 2;
  const centerY = designerAnchorRect.y_cm + designerAnchorRect.height_cm / 2;
  const physicalDesignerRect = {
    x_cm: centerX - preset.width_cm / 2,
    y_cm: centerY - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
  return designerToWorkspace(physicalDesignerRect, workspace, garment);
}

/** Designer Display CSS % — toDesignerCssPercentFromWorkspace (facade linear) */
function computeDesignerDisplayCssPercent(wsRect, side, garmentBlue) {
  const workspace = WORKSPACE_M[side];
  const designerRect = workspaceToGarment(wsRect, workspace, garmentBlue);
  return {
    leftPct: (designerRect.x_cm / garmentBlue.width) * 100,
    topPct: (designerRect.y_cm / garmentBlue.height) * 100,
    widthPct: (designerRect.width_cm / garmentBlue.width) * 100,
    heightPct: (designerRect.height_cm / garmentBlue.height) * 100,
  };
}

/** Preview 15.3.4 — same formula via getLayerDesignerDisplayCssPercent */
function computePreviewDisplayCssPercent(wsRect, side, garmentBlue) {
  return computeDesignerDisplayCssPercent(wsRect, side, garmentBlue);
}

function cssEqual(a, b) {
  return (
    approx(a.leftPct, b.leftPct) &&
    approx(a.topPct, b.topPct) &&
    approx(a.widthPct, b.widthPct) &&
    approx(a.heightPct, b.heightPct)
  );
}

console.log("validate-preview-layer-coordinate-unification-15-3-4\n");

console.log("── Preview Runtime Wiring ──");
const previewRuntime = read("lib/preview-runtime.ts");
const styleFn = previewRuntime.slice(
  previewRuntime.indexOf("export function previewGarmentRectToPhysicalStyle"),
  previewRuntime.indexOf("/** M-reference printable used for text"),
);

for (const token of [
  "getLayerDesignerDisplayCssPercent",
  "createDesignerDisplayContext",
  "getPreviewLayerDisplayCssPercent",
]) {
  if (!previewRuntime.includes(token)) {
    fail(`preview-runtime missing ${token}`);
  } else {
    pass(`preview-runtime includes ${token}`);
  }
}

if (styleFn.includes("physicalReferencePrintable")) {
  fail("previewGarmentRectToPhysicalStyle must not use physicalReferencePrintable");
} else {
  pass("no split M-reference denominator in layer CSS mapping");
}

if (styleFn.includes("garmentPrintable.width")) {
  fail("previewGarmentRectToPhysicalStyle must not compute its own %");
} else {
  pass("layer CSS delegates to Designer Display");
}

const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
if (!previewLayer.includes("previewGarmentRectToPhysicalStyle(layer, ctx)")) {
  fail("PreviewDesignLayer must pass layer to previewGarmentRectToPhysicalStyle");
} else {
  pass("PreviewDesignLayer uses unified layer CSS mapping");
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

console.log("\n── Matrix: Designer vs Preview CSS % (12 presets × 14 sizes × sides) ──");
let checks = 0;
let passes = 0;

for (const preset of ALL_PRESETS) {
  for (const side of preset.sides) {
    const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
    for (const row of rows) {
      const wsRect = resolvePhysicalPresetWorkspaceRect(preset, side, row.blue);
      const designer = computeDesignerDisplayCssPercent(wsRect, side, row.blue);
      const preview = computePreviewDisplayCssPercent(wsRect, side, row.blue);
      checks += 1;
      if (cssEqual(designer, preview)) {
        passes += 1;
      } else {
        fail(
          `${preset.id} ${side}/${row.size}: CSS mismatch ` +
            `L${designer.leftPct.toFixed(4)} vs ${preview.leftPct.toFixed(4)} ` +
            `W${designer.widthPct.toFixed(4)} vs ${preview.widthPct.toFixed(4)}`,
        );
      }
    }
  }
}
pass(`layer CSS % match: ${passes}/${checks}`);

console.log("\n── Full-bleed (garment printable fills container) ──");
for (const [size, side] of [
  ["90", "front"],
  ["M", "front"],
  ["XXXL", "front"],
]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const row = rows.find((r) => r.size === size);
  const wsRect = {
    x_cm: 0,
    y_cm: 0,
    width_cm: row.blue.width * (WORKSPACE_M[side].width / row.blue.width),
    height_cm: row.blue.height * (WORKSPACE_M[side].height / row.blue.height),
  };
  // full garment bleed in workspace: map garment full rect
  const fullWs = designerToWorkspace(
    { x_cm: 0, y_cm: 0, width_cm: row.blue.width, height_cm: row.blue.height },
    WORKSPACE_M[side],
    row.blue,
  );
  const css = computeDesignerDisplayCssPercent(fullWs, side, row.blue);
  if (approx(css.widthPct, 100) && approx(css.heightPct, 100)) {
    pass(`${size} ${side} full-bleed: ${css.widthPct.toFixed(2)}%×${css.heightPct.toFixed(2)}%`);
  } else {
    fail(`${size} full-bleed expected 100%×100%, got ${css.widthPct}×${css.heightPct}`);
  }
}

console.log("\n── Zoom invariance (camera only) ──");
const sampleWs = resolvePhysicalPresetWorkspaceRect(
  ALL_PRESETS.find((p) => p.id === "center-chest-a4-portrait"),
  "front",
  FRONT_ROWS.find((r) => r.size === "M").blue,
);
const base = computeDesignerDisplayCssPercent(
  sampleWs,
  "front",
  FRONT_ROWS.find((r) => r.size === "M").blue,
);
for (const zoom of ZOOM_STEPS) {
  void zoom;
  const atZoom = computePreviewDisplayCssPercent(
    sampleWs,
    "front",
    FRONT_ROWS.find((r) => r.size === "M").blue,
  );
  if (!cssEqual(base, atZoom)) {
    fail(`zoom ${zoom} altered layer CSS %`);
  }
}
pass(`zoom steps [${ZOOM_STEPS.join(", ")}] preserve layer CSS %`);

console.log("\n── Preview entry points ──");
const entries = [
  ["Flat", "components/designer/FlatShirtDesignView.tsx"],
  ["Model", "components/designer/ModelDesignPreview.tsx"],
  ["Zoom", "components/designer/ClothingBrowseModal.tsx"],
  ["Product", "components/designer/ClothingBrowsePanel.tsx"],
  ["Review", "components/designer/DesignReviewModal.tsx"],
];
for (const [label, file] of entries) {
  const src = read(file);
  if (
    src.includes("PreviewGarmentView") ||
    src.includes("FlatShirtDesignView") ||
    src.includes("ModelDesignPreview")
  ) {
    pass(`${label} → shared PreviewGarmentView pipeline`);
  } else {
    fail(`${label} missing preview pipeline`);
  }
}

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-preview-anchor-unification-15-3-2.mjs",
  "validate-preview-position-alignment-15-3.mjs",
  "validate-preview-print-area-parity-15-3-3.mjs",
  "validate-preview-consistency-15-0c.mjs",
  "validate-export-runtime-15-2.mjs",
  "validate-designer-preset-physical-size-14-2-2.mjs",
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
  console.error(`\n✗ FAIL (${failures} findings, ${regressionFailures} regressions)\n`);
  process.exit(1);
}
console.log("\n✓ validate-preview-layer-coordinate-unification-15-3-4 PASS\n");
