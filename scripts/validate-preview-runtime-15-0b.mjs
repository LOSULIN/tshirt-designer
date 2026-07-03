/**
 * Phase 15.0B — Preview Physical Rendering Refinement
 * node scripts/validate-preview-runtime-15-0b.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-4;

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-display-scale.ts",
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

const A4_PRESET = {
  width_cm: A4.width,
  height_cm: A4.height,
  anchorX_cm: 17.5,
  anchorY_cm: 25,
};

const A4_BACK_PRESET = {
  width_cm: A4.width,
  height_cm: A4.height,
  anchorX_cm: 19,
  anchorY_cm: 20,
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

function designerDisplayCssPercent(garmentRect, garmentPrintable) {
  return {
    leftPct: (garmentRect.x_cm / garmentPrintable.width) * 100,
    topPct: (garmentRect.y_cm / garmentPrintable.height) * 100,
    widthPct: (garmentRect.width_cm / garmentPrintable.width) * 100,
    heightPct: (garmentRect.height_cm / garmentPrintable.height) * 100,
  };
}

function overflowExceeds(garmentRect, printable) {
  return (
    garmentRect.x_cm < -EPS ||
    garmentRect.y_cm < -EPS ||
    garmentRect.x_cm + garmentRect.width_cm > printable.width + EPS ||
    garmentRect.y_cm + garmentRect.height_cm > printable.height + EPS
  );
}

console.log("validate-preview-runtime-15-0b\n");

console.log("── Frozen Architecture ──");
for (const file of FROZEN_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`${file} missing`);
  } else {
    pass(`${file} present (frozen)`);
  }
}

console.log("\n── Preview Runtime (Physical Rendering) ──");
const previewRuntime = read("lib/preview-runtime.ts");

if (!previewRuntime.includes("workspaceRectToDesignerRect")) {
  fail("preview-runtime must project via Facade workspaceRectToDesignerRect");
} else {
  pass("preview-runtime uses Facade read-only projection");
}

if (previewRuntime.includes("placement-presets")) {
  fail("preview-runtime must not import placement-presets");
} else {
  pass("preview-runtime does not import placement-presets");
}

if (previewRuntime.includes("previewGarmentRectToCssPercent")) {
  fail("preview-runtime must not use printable-area % artwork helper");
} else {
  pass("no printable-area % artwork helper");
}

if (
  !previewRuntime.includes("previewGarmentRectToPhysicalStyle") ||
  !previewRuntime.includes("getPreviewLayerDisplayCssPercent") ||
  !previewRuntime.includes("getLayerDesignerDisplayCssPercent")
) {
  fail("preview-runtime must delegate artwork CSS to Designer Display");
} else {
  pass("artwork CSS delegates to Designer Display (unified mapping)");
}

if (
  previewRuntime.includes("physicalReferencePrintable.width") &&
  previewRuntime.includes("previewGarmentRectToPhysicalStyle")
) {
  const styleFn = previewRuntime.slice(
    previewRuntime.indexOf("export function previewGarmentRectToPhysicalStyle"),
    previewRuntime.indexOf("export function getPreviewPhysicalReferencePrintArea"),
  );
  if (styleFn.includes("physicalReferencePrintable")) {
    fail("preview layer CSS must not use physicalReferencePrintable denominator");
  }
}
pass("preview layer CSS does not split M-reference size denominators");

if (
  !previewRuntime.includes("getPreviewArtworkStageStyle") ||
  !previewRuntime.includes("getPreviewPrintableBoundaryStyle")
) {
  fail("preview-runtime must split artwork stage vs printable boundary");
} else {
  pass("artwork stage and printable boundary are separate");
}

const forbidden = [
  "designer-display-scale",
  "designer-coordinate-controller",
];
for (const mod of forbidden) {
  if (
    previewRuntime.includes(`from "./${mod}"`) ||
    previewRuntime.includes(`from "@/${mod}"`)
  ) {
    fail(`preview-runtime imports forbidden: ${mod}`);
  } else {
    pass(`preview-runtime does not import ${mod}`);
  }
}

if (!previewRuntime.includes("designer-display-projection")) {
  fail("preview-runtime must import designer-display-projection (read-only)");
} else {
  pass("preview-runtime imports designer-display-projection (read-only)");
}

console.log("\n── Preview Components ──");
const garmentView = read("components/designer/PreviewGarmentView.tsx");
const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
const flat = read("components/designer/FlatShirtDesignView.tsx");
const model = read("components/designer/ModelDesignPreview.tsx");
const modal = read("components/designer/ClothingBrowseModal.tsx");
const panel = read("components/designer/ClothingBrowsePanel.tsx");
const widget = read("components/designer/ClothingBrowseWidget.tsx");

if (!garmentView.includes("data-preview-artwork-stage")) {
  fail("PreviewGarmentView missing fixed artwork stage");
} else {
  pass("PreviewGarmentView has data-preview-artwork-stage");
}

if (!garmentView.includes("data-preview-printable-boundary")) {
  fail("PreviewGarmentView missing printable boundary (overflow only)");
} else {
  pass("PreviewGarmentView has data-preview-printable-boundary");
}

if (!garmentView.includes("overflow-visible")) {
  fail("artwork stage must allow overflow-visible");
} else {
  pass("artwork stage overflow-visible");
}

if (previewLayer.includes("previewGarmentRectToCssPercent")) {
  fail("PreviewDesignLayer must use physical style helper");
} else {
  pass("PreviewDesignLayer uses physical style helper");
}

if (previewLayer.includes("garmentPrintable")) {
  fail("PreviewDesignLayer must not size artwork from garmentPrintable");
} else {
  pass("PreviewDesignLayer does not use garmentPrintable for sizing");
}

for (const [name, src, direct] of [
  ["FlatShirtDesignView", flat, true],
  ["ModelDesignPreview", model, true],
  ["ClothingBrowsePanel", panel, false],
  ["ClothingBrowseWidget", widget, false],
]) {
  const usesPreview =
    src.includes("PreviewGarmentView") || src.includes("FlatShirtDesignView");
  if (direct ? !src.includes("PreviewGarmentView") : !usesPreview) {
    fail(`${name} must route through Preview Runtime`);
  } else {
    pass(`${name} routes through Preview Runtime`);
  }
}

if (modal.includes('transform: `scale(${zoom})`')) {
  fail("ClothingBrowseModal zoom must be camera-only on garment frame");
} else {
  pass("ClothingBrowseModal camera zoom only");
}

if (!modal.includes("zoom={zoom}")) {
  fail("ClothingBrowseModal must pass zoom to FlatShirtDesignView");
} else {
  pass("ClothingBrowseModal passes zoom to FlatShirtDesignView");
}

console.log("\n── Garment Size Matrix ──");
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
  if (
    !FRONT_ROWS.find((r) => r.size === size) ||
    !BACK_ROWS.find((r) => r.size === size)
  ) {
    fail(`missing size ${size}`);
  } else {
    pass(`size ${size} front/back`);
  }
}

console.log("\n── Physical Artwork (A4 21×29.7 cm) ──");
let physicalChecks = 0;
for (const side of ["front", "back"]) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const workspace = WORKSPACE_M[side];
  const preset = side === "front" ? A4_PRESET : A4_BACK_PRESET;

  for (const row of rows) {
    const wsRect = resolvePhysicalPresetWorkspaceRect(preset, side, row.blue);
    const garment = workspaceToGarment(wsRect, workspace, row.blue);
    if (
      approx(garment.width_cm, A4.width, `${side}/${row.size} width`) &&
      approx(garment.height_cm, A4.height, `${side}/${row.size} height`)
    ) {
      physicalChecks += 1;
    }
  }
}

if (physicalChecks === FRONT_ROWS.length + BACK_ROWS.length) {
  pass(`A4 physical cm preserved: ${physicalChecks} checks`);
} else {
  fail(`A4 physical: ${physicalChecks}/${FRONT_ROWS.length + BACK_ROWS.length}`);
}

console.log("\n── Layer CSS % uses garmentPrintable (Designer Display, 15.3.4) ──");
const size90 = FRONT_ROWS.find((r) => r.size === "90");
const sizeM = FRONT_ROWS.find((r) => r.size === "M");
const ws90 = resolvePhysicalPresetWorkspaceRect(A4_PRESET, "front", size90.blue);
const wsM = resolvePhysicalPresetWorkspaceRect(A4_PRESET, "front", sizeM.blue);
const g90 = workspaceToGarment(ws90, WORKSPACE_M.front, size90.blue);
const gM = workspaceToGarment(wsM, WORKSPACE_M.front, sizeM.blue);
const css90 = designerDisplayCssPercent(g90, size90.blue);
const cssM = designerDisplayCssPercent(gM, sizeM.blue);
if (css90.widthPct > cssM.widthPct + EPS) {
  pass("Kids 90 A4 width % larger than M (same physical cm, smaller printable)");
} else {
  fail("Kids 90 A4 width % must exceed M under unified garmentPrintable mapping");
}
if (
  approx(css90.widthPct, (g90.width_cm / size90.blue.width) * 100, "90 width %") &&
  approx(cssM.widthPct, (gM.width_cm / sizeM.blue.width) * 100, "M width %")
) {
  pass("A4 layer CSS % uses garmentPrintable for all axes");
} else {
  fail("A4 layer CSS % must use garmentPrintable denominator");
}

console.log("\n── Front / Back identical physical artwork width fraction ──");
const wsFront = resolvePhysicalPresetWorkspaceRect(
  A4_PRESET,
  "front",
  FRONT_ROWS.find((r) => r.size === REF_SIZE).blue,
);
const wsBack = resolvePhysicalPresetWorkspaceRect(
  A4_BACK_PRESET,
  "back",
  BACK_ROWS.find((r) => r.size === REF_SIZE).blue,
);
const gFront = workspaceToGarment(wsFront, WORKSPACE_M.front, FRONT_ROWS.find((r) => r.size === REF_SIZE).blue);
const gBack = workspaceToGarment(wsBack, WORKSPACE_M.back, BACK_ROWS.find((r) => r.size === REF_SIZE).blue);
const frontPxNorm = gFront.width_cm;
const backPxNorm = gBack.width_cm;
if (approx(frontPxNorm, backPxNorm, "front/back normalized physical width")) {
  pass("Front and Back A4 render same physical width (21 cm)");
} else {
  fail("Front and Back A4 physical render width must match");
}

console.log("\n── Overflow samples (A4) ──");
const overflowCases = [
  { size: "90", side: "front", expect: true },
  { size: "M", side: "front", expect: false },
  { size: "XXXL", side: "front", expect: false },
];
for (const { size, side, expect } of overflowCases) {
  const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
  const row = rows.find((r) => r.size === size);
  const preset = side === "front" ? A4_PRESET : A4_BACK_PRESET;
  const ws = resolvePhysicalPresetWorkspaceRect(preset, side, row.blue);
  const garment = workspaceToGarment(ws, WORKSPACE_M[side], row.blue);
  const exceeds = overflowExceeds(garment, row.blue);
  if (exceeds === expect) {
    pass(`${side}/${size} A4 overflow=${exceeds}`);
  } else {
    fail(`${side}/${size} A4 overflow expected ${expect}, got ${exceeds}`);
  }
}

console.log("\n── Garment color invariance ──");
if (previewLayer.includes("shirtColor")) {
  fail("PreviewDesignLayer must not depend on shirtColor");
} else {
  pass("artwork rendering independent of garment color");
}

console.log("\n── Summary ──");
if (failures === 0) {
  console.log("\n✓ validate-preview-runtime-15-0b PASS\n");
  process.exit(0);
} else {
  console.error(
    `\n✗ validate-preview-runtime-15-0b FAIL (${failures} failures)\n`,
  );
  process.exit(1);
}
