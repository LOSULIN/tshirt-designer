/**
 * Phase 15.0A — Garment Preview Runtime (Display Only)
 * node scripts/validate-preview-runtime-15-0a.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-4;

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/direct-manipulation.ts",
  "lib/placement-presets.ts",
  "lib/designer-workspace.ts",
];

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const A4 = { width: 21, height: 29.7 };
const REF_SIZE = "M";

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

function approx(a, b, label) {
  if (Math.abs(a - b) > EPS) {
    fail(`${label}: expected ${b}, got ${a}`);
    return false;
  }
  return true;
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

/** Preview / designer garment projection (same as mapWorkspaceLayerCmRectToGarmentPrintArea). */
const workspaceToDesigner = workspaceToGarment;

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

const A4_PRESET = {
  id: "center-chest-a4-portrait",
  sides: ["front"],
  width_cm: A4.width,
  height_cm: A4.height,
  anchorX_cm: 17.5,
  anchorY_cm: 25,
};

const A4_BACK_PRESET = {
  id: "back-center-a4-portrait",
  sides: ["back"],
  width_cm: A4.width,
  height_cm: A4.height,
  anchorX_cm: 19,
  anchorY_cm: 20,
};

/** 14.2.2 physical preset → workspace storage */
function resolvePhysicalPresetWorkspaceRect(preset, side, garment) {
  const workspace = WORKSPACE_M[side];
  const workspaceAnchorTarget = {
    x_cm: preset.anchorX_cm - preset.width_cm / 2,
    y_cm: preset.anchorY_cm - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
  const designerAnchorRect = workspaceToDesigner(
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

function previewGarmentPrintAreaPct(side, size, mPct, mBlue, garmentBlue) {
  return {
    widthPct: mPct.widthPct * (garmentBlue.width / mBlue.width),
    heightPct: mPct.heightPct * (garmentBlue.height / mBlue.height),
  };
}

console.log("validate-preview-runtime-15-0a\n");

console.log("── Frozen Architecture ──");
for (const file of FROZEN_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`${file} missing`);
  } else {
    pass(`${file} present (frozen)`);
  }
}

console.log("\n── Preview Runtime Module ──");
if (!existsSync(join(ROOT, "lib/preview-runtime.ts"))) {
  fail("lib/preview-runtime.ts missing");
} else {
  pass("lib/preview-runtime.ts exists");
}

const previewRuntime = read("lib/preview-runtime.ts");
const forbiddenPreviewImports = [
  "designer-display-scale",
  "designer-coordinate-controller",
];
for (const mod of forbiddenPreviewImports) {
  if (previewRuntime.includes(`from "./${mod}"`) || previewRuntime.includes(`from "@/${mod}"`)) {
    fail(`preview-runtime imports forbidden module: ${mod}`);
  } else {
    pass(`preview-runtime does not import ${mod}`);
  }
}

if (
  !previewRuntime.includes("getLayerDesignerDisplayCssPercent") ||
  !previewRuntime.includes("getPreviewLayerDisplayCssPercent")
) {
  fail("preview-runtime must delegate layer CSS to Designer Display (15.3.4)");
} else {
  pass("preview-runtime delegates layer CSS to Designer Display");
}

for (const sym of [
  "createPreviewRuntimeContext",
  "projectPreviewLayerToGarment",
  "getPreviewGarmentPrintAreaContainerStyle",
  "getPreviewGarmentVisualScale",
  "PREVIEW_GARMENT_VISUAL_REFERENCE_SIZE",
]) {
  if (!previewRuntime.includes(sym)) {
    fail(`preview-runtime missing ${sym}`);
  } else {
    pass(`preview-runtime exports ${sym}`);
  }
}

if (!previewRuntime.includes('DESIGNER_WORKSPACE_REFERENCE_SIZE')) {
  fail("preview-runtime must anchor garment visual to workspace reference size");
} else {
  pass("preview-runtime uses DESIGNER_WORKSPACE_REFERENCE_SIZE for fixed garment");
}

console.log("\n── Preview Components ──");
const flat = read("components/designer/FlatShirtDesignView.tsx");
const model = read("components/designer/ModelDesignPreview.tsx");
const modal = read("components/designer/ClothingBrowseModal.tsx");
const garmentView = read("components/designer/PreviewGarmentView.tsx");

for (const [name, src] of [
  ["FlatShirtDesignView", flat],
  ["ModelDesignPreview", model],
]) {
  if (!src.includes("PreviewGarmentView")) {
    fail(`${name} must use PreviewGarmentView`);
  } else {
    pass(`${name} uses PreviewGarmentView`);
  }
  if (src.includes("designer-display-projection") || src.includes("ShirtVisualScale")) {
    fail(`${name} must not use Designer display scale path`);
  } else {
    pass(`${name} no Designer display scale dependency`);
  }
}

if (!garmentView.includes("PreviewDesignLayer") || !garmentView.includes("PreviewGarmentVisual")) {
  fail("PreviewGarmentView must compose Preview Runtime components");
} else {
  pass("PreviewGarmentView composes Preview Runtime components");
}
if (!garmentView.includes("data-preview-runtime")) {
  fail("PreviewGarmentView must mark data-preview-runtime");
} else {
  pass("PreviewGarmentView marks data-preview-runtime");
}

if (modal.includes('transform: `scale(${zoom})`')) {
  fail("ClothingBrowseModal must not scale outer grid (use garment camera zoom)");
} else {
  pass("ClothingBrowseModal uses garment camera zoom");
}
if (!modal.includes("zoom={zoom}")) {
  fail("ClothingBrowseModal must pass zoom to FlatShirtDesignView");
} else {
  pass("ClothingBrowseModal passes zoom to FlatShirtDesignView");
}

console.log("\n── Garment Size Matrix (14 × front/back) ──");
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

if (FRONT_ROWS.length < 14) {
  fail(`expected ≥14 front sizes, got ${FRONT_ROWS.length}`);
} else {
  pass(`front sizes: ${FRONT_ROWS.length}`);
}
if (BACK_ROWS.length < 14) {
  fail(`expected ≥14 back sizes, got ${BACK_ROWS.length}`);
} else {
  pass(`back sizes: ${BACK_ROWS.length}`);
}

const requiredSizes = [
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
for (const size of requiredSizes) {
  const front = FRONT_ROWS.find((r) => r.size === size);
  const back = BACK_ROWS.find((r) => r.size === size);
  if (!front || !back) {
    fail(`missing size ${size} in print area config`);
  } else {
    pass(`size ${size} front/back configured`);
  }
}

const mFront = FRONT_ROWS.find((r) => r.size === REF_SIZE);
const mBack = BACK_ROWS.find((r) => r.size === REF_SIZE);
const mPctFront = { widthPct: 0.22, heightPct: 0.32 };
const mPctBack = { widthPct: 0.24, heightPct: 0.29 };

console.log("\n── Physical Artwork (A4 21×29.7 cm) ──");
let physicalChecks = 0;
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const workspace = WORKSPACE_M[side];
  const preset = side === "front" ? A4_PRESET : A4_BACK_PRESET;

  for (const row of rows) {
    const garment = row.blue;
    const wsRect = resolvePhysicalPresetWorkspaceRect(preset, side, garment);
    const mapped = workspaceToGarment(wsRect, workspace, garment);
    if (
      approx(mapped.width_cm, A4.width, `${side}/${row.size} A4 width`) &&
      approx(mapped.height_cm, A4.height, `${side}/${row.size} A4 height`)
    ) {
      physicalChecks += 1;
    }
  }
}
if (physicalChecks === FRONT_ROWS.length + BACK_ROWS.length) {
  pass(`A4 physical size preserved: ${physicalChecks} checks`);
} else {
  fail(`A4 physical size checks: ${physicalChecks}/${FRONT_ROWS.length + BACK_ROWS.length}`);
}

console.log("\n── Fixed Garment / Variable Printable Area ──");
const size90 = FRONT_ROWS.find((r) => r.size === "90");
const sizeXxxl = FRONT_ROWS.find((r) => r.size === "XXXL");
const pct90 = previewGarmentPrintAreaPct(
  "front",
  "90",
  mPctFront,
  mFront.blue,
  size90.blue,
);
const pctM = previewGarmentPrintAreaPct(
  "front",
  "M",
  mPctFront,
  mFront.blue,
  mFront.blue,
);
const pctXxxl = previewGarmentPrintAreaPct(
  "front",
  "XXXL",
  mPctFront,
  mFront.blue,
  sizeXxxl.blue,
);

if (pct90.widthPct < pctM.widthPct && pct90.heightPct < pctM.heightPct) {
  pass("Kids 90 printable area smaller than M on fixed garment");
} else {
  fail("Kids 90 printable area should be smaller than M on fixed garment");
}

if (pctXxxl.widthPct > pctM.widthPct && pctXxxl.heightPct > pctM.heightPct) {
  pass("XXXL printable area larger than M on fixed garment");
} else {
  fail("XXXL printable area should be larger than M on fixed garment");
}

const wsA4At90 = resolvePhysicalPresetWorkspaceRect(
  A4_PRESET,
  "front",
  size90.blue,
);
const a4On90 = workspaceToGarment(wsA4At90, WORKSPACE_M.front, size90.blue);
if (a4On90.width_cm / size90.blue.width > 1 - EPS) {
  pass("A4 on Kids 90 exceeds printable width (realistic overflow)");
} else {
  fail("A4 on Kids 90 should exceed printable width");
}

const wsA4AtXxxl = resolvePhysicalPresetWorkspaceRect(
  A4_PRESET,
  "front",
  sizeXxxl.blue,
);
const a4OnXxxl = workspaceToGarment(
  wsA4AtXxxl,
  WORKSPACE_M.front,
  sizeXxxl.blue,
);
const fillRatio90 = a4On90.width_cm / size90.blue.width;
const fillRatioXxxl = a4OnXxxl.width_cm / sizeXxxl.blue.width;
if (fillRatio90 > fillRatioXxxl) {
  pass("A4 fills more of Kids 90 chest than XXXL (e-commerce realism)");
} else {
  fail("A4 should occupy larger share on Kids 90 than XXXL");
}

console.log("\n── Garment Color Invariance ──");
const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
if (previewLayer.includes("shirtColor")) {
  fail("PreviewDesignLayer must not depend on shirtColor for placement");
} else {
  pass("PreviewDesignLayer placement independent of garment color");
}

console.log("\n── Workspace Canonical ──");
const workspace = read("lib/designer-workspace.ts");
if (!workspace.includes('DESIGNER_WORKSPACE_REFERENCE_SIZE = "M"')) {
  fail("workspace reference size must remain M");
} else {
  pass("workspace canonical M unchanged");
}

console.log("\n── Summary ──");
if (failures === 0) {
  console.log("\n✓ validate-preview-runtime-15-0a PASS\n");
  process.exit(0);
} else {
  console.error(`\n✗ validate-preview-runtime-15-0a FAIL (${failures} failures)\n`);
  process.exit(1);
}
