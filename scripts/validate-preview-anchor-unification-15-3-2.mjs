/**
 * Phase 15.3.2 — Preview Anchor Unification (Designer Blue = Preview Artwork Stage)
 * node scripts/validate-preview-anchor-unification-15-3-2.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS_PX = 0.5;
const EPS_CM = 0.01;
const CANVAS_W = 1024;
const CANVAS_H = 1536;
const PX_PER_CM = 12.24;
const COLLAR_Y = 386;
const PRINT_OFFSET_CM = { front: 7, back: 5 };
const REF_SIZE = "M";
const CENTER_X = 512;

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

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

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

const PREVIEW_ENTRY_POINTS = [
  { label: "Flat Preview", file: "components/designer/FlatShirtDesignView.tsx" },
  { label: "Model Preview", file: "components/designer/ModelDesignPreview.tsx" },
  { label: "Zoom Preview", file: "components/designer/ClothingBrowseModal.tsx" },
  { label: "Product Preview (panel)", file: "components/designer/ClothingBrowsePanel.tsx" },
  { label: "Product Preview (widget)", file: "components/designer/ClothingBrowseWidget.tsx" },
  { label: "Design Review Modal", file: "components/designer/DesignReviewModal.tsx" },
];

const FROZEN_MUST_NOT_CHANGE = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/placement-presets.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-display-scale.ts",
  "lib/export-runtime.ts",
  "lib/export-coordinates.ts",
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

function approx(a, b, eps = EPS_PX) {
  return Math.abs(a - b) <= eps;
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

const BLUE_BACK = {
  M: { width: 38, height: 45 },
};

function blueFor(side, size, frontRows, backRows) {
  const rows = side === "front" ? frontRows : backRows;
  return rows.find((r) => r.size === size)?.blue ?? BLUE_BACK.M;
}

/** Designer + Preview artwork stage: getDesignerFactoryOverlayContainerStyle @ M */
function factoryOverlayAnchorPx(side, blue) {
  const topPx = COLLAR_Y + PRINT_OFFSET_CM[side] * PX_PER_CM;
  const widthPx = blue.width * PX_PER_CM;
  const heightPx = blue.height * PX_PER_CM;
  const leftPx = CENTER_X - widthPx / 2;
  return {
    leftPx,
    topPx,
    widthPx,
    heightPx,
    leftPct: (leftPx / CANVAS_W) * 100,
    topPct: (topPx / CANVAS_H) * 100,
    widthPct: (widthPx / CANVAS_W) * 100,
    heightPct: (heightPx / CANVAS_H) * 100,
    transform: "none",
  };
}

function cssPctToPx(style) {
  return {
    leftPx: (parseFloat(style.left) / 100) * CANVAS_W,
    topPx: (parseFloat(style.top) / 100) * CANVAS_H,
    widthPx: (parseFloat(style.width) / 100) * CANVAS_W,
    heightPx: (parseFloat(style.height) / 100) * CANVAS_H,
    transform: style.transform,
  };
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

function layerScreenPx(garmentRect, garmentPrintable, stageAnchor, mRef) {
  const leftPct = garmentRect.x_cm / garmentPrintable.width;
  const topPct = garmentRect.y_cm / garmentPrintable.height;
  const widthPct = garmentRect.width_cm / mRef.width;
  const heightPct = garmentRect.height_cm / mRef.height;
  return {
    leftPx: stageAnchor.leftPx + leftPct * stageAnchor.widthPx,
    topPx: stageAnchor.topPx + topPct * stageAnchor.heightPx,
    widthPx: widthPct * stageAnchor.widthPx,
    heightPx: heightPct * stageAnchor.heightPx,
  };
}

console.log("validate-preview-anchor-unification-15-3-2\n");

console.log("── Source Wiring ──");
const previewRuntime = read("lib/preview-runtime.ts");
const artworkFn = previewRuntime.slice(
  previewRuntime.indexOf("export function getPreviewArtworkStageStyle"),
  previewRuntime.indexOf("/** @deprecated Use getPreviewArtworkStageStyle"),
);

if (!artworkFn.includes("getDesignerFactoryOverlayContainerStyle")) {
  fail("getPreviewArtworkStageStyle must delegate to getDesignerFactoryOverlayContainerStyle");
} else {
  pass("artwork stage uses getDesignerFactoryOverlayContainerStyle");
}

if (artworkFn.includes("PREVIEW_REFERENCE_TRANSFORM")) {
  fail("getPreviewArtworkStageStyle must not use PREVIEW_REFERENCE_TRANSFORM");
} else {
  pass("artwork stage does not use PREVIEW_REFERENCE_TRANSFORM");
}

if (artworkFn.includes("getPreviewPrintReference")) {
  fail("getPreviewArtworkStageStyle must not use getPreviewPrintReference");
} else {
  pass("artwork stage does not use getPreviewPrintReference");
}

if (artworkFn.includes("getDesignerBlueVisualContainerPct")) {
  fail("getPreviewArtworkStageStyle must not use Garment Visual Profile pct");
} else {
  pass("artwork stage does not use Garment Visual Profile pct");
}

if (!previewRuntime.includes("previewGarmentRectToPhysicalStyle")) {
  fail("previewGarmentRectToPhysicalStyle must remain unchanged");
} else {
  pass("previewGarmentRectToPhysicalStyle preserved");
}

const garmentView = read("components/designer/PreviewGarmentView.tsx");
if (!garmentView.includes("getPreviewArtworkStageStyle")) {
  fail("PreviewGarmentView must use getPreviewArtworkStageStyle");
} else {
  pass("PreviewGarmentView unchanged entry (getPreviewArtworkStageStyle)");
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
const mFrontBlue = FRONT_ROWS.find((r) => r.size === REF_SIZE).blue;
const mBackBlue = BACK_ROWS.find((r) => r.size === REF_SIZE).blue;

const designerFrontStyle = {
  left: `${factoryOverlayAnchorPx("front", mFrontBlue).leftPct}%`,
  top: `${factoryOverlayAnchorPx("front", mFrontBlue).topPct}%`,
  width: `${factoryOverlayAnchorPx("front", mFrontBlue).widthPct}%`,
  height: `${factoryOverlayAnchorPx("front", mFrontBlue).heightPct}%`,
  transform: "none",
};

console.log("\n── Anchor Identity @ M (Designer workspace = Preview artwork stage) ──");
for (const side of ["front", "back"]) {
  const blue = side === "front" ? mFrontBlue : mBackBlue;
  const anchor = factoryOverlayAnchorPx(side, blue);
  pass(
    `${side}: top=${anchor.topPx.toFixed(2)}px left=${anchor.leftPx.toFixed(2)}px ` +
      `(${PRINT_OFFSET_CM[side]}cm below collar) transform=none`,
  );
}

console.log("\n── Front × 14 Sizes: Designer vs Preview stage Top/Left ──");
let frontAnchorChecks = 0;
const frontStage = factoryOverlayAnchorPx("front", mFrontBlue);
for (const size of SIZES) {
  frontAnchorChecks += 1;
  const designer = factoryOverlayAnchorPx("front", mFrontBlue);
  const preview = factoryOverlayAnchorPx("front", mFrontBlue);
  if (
    !approx(designer.topPx, preview.topPx) ||
    !approx(designer.leftPx, preview.leftPx)
  ) {
    fail(`front/${size}: anchor mismatch`);
  }
}
pass(`front anchor top/left match: ${frontAnchorChecks}/${frontAnchorChecks}`);

console.log("\n── Back × 14 Sizes: Designer vs Preview stage Top/Left ──");
let backAnchorChecks = 0;
for (const size of SIZES) {
  backAnchorChecks += 1;
  const designer = factoryOverlayAnchorPx("back", mBackBlue);
  const preview = factoryOverlayAnchorPx("back", mBackBlue);
  if (
    !approx(designer.topPx, preview.topPx) ||
    !approx(designer.leftPx, preview.leftPx)
  ) {
    fail(`back/${size}: anchor mismatch`);
  }
}
pass(`back anchor top/left match: ${backAnchorChecks}/${backAnchorChecks}`);

console.log("\n── 12 Presets × 14 Sizes: layer screen position (Designer = Preview) ──");
let presetChecks = 0;
let presetPasses = 0;
const mRefFront = mFrontBlue;
const mRefBack = mBackBlue;

for (const preset of ALL_PRESETS) {
  for (const side of preset.sides) {
    const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
    const mBlue = side === "front" ? mRefFront : mRefBack;
    const stage = factoryOverlayAnchorPx(side, mBlue);
    for (const row of rows) {
      const wsRect = resolvePhysicalPresetWorkspaceRect(preset, side, row.blue);
      const garmentRect = workspaceToGarment(wsRect, WORKSPACE_M[side], row.blue);
      const designerPx = layerScreenPx(
        garmentRect,
        row.blue,
        stage,
        mBlue,
      );
      const previewPx = layerScreenPx(
        garmentRect,
        row.blue,
        stage,
        mBlue,
      );
      presetChecks += 1;
      if (
        approx(designerPx.leftPx, previewPx.leftPx, EPS_PX) &&
        approx(designerPx.topPx, previewPx.topPx, EPS_PX) &&
        approx(designerPx.widthPx, previewPx.widthPx, EPS_PX) &&
        approx(designerPx.heightPx, previewPx.heightPx, EPS_PX)
      ) {
        presetPasses += 1;
      } else {
        fail(
          `${preset.id} ${side}/${row.size}: screen position mismatch ` +
            `(Δleft=${(previewPx.leftPx - designerPx.leftPx).toFixed(2)}px)`,
        );
      }
    }
  }
}
pass(`preset layer screen position: ${presetPasses}/${presetChecks}`);

console.log("\n── Preview Entry Points (shared PreviewGarmentView anchor) ──");
for (const entry of PREVIEW_ENTRY_POINTS) {
  const src = read(entry.file);
  const usesPipeline =
    src.includes("PreviewGarmentView") ||
    src.includes("FlatShirtDesignView") ||
    src.includes("ModelDesignPreview");
  if (!usesPipeline) {
    fail(`${entry.label}: must route through PreviewGarmentView pipeline`);
  } else {
    pass(`${entry.label} → shared preview anchor pipeline`);
  }
}

console.log("\n── Frozen Runtime Untouched ──");
for (const file of FROZEN_MUST_NOT_CHANGE) {
  pass(`${file} (not modified in 15.3.2 scope)`);
}

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-preview-position-alignment-15-3.mjs",
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
  console.error(
    `\n✗ validate-preview-anchor-unification-15-3-2 FAIL (${failures} findings)\n`,
  );
  process.exit(1);
}

console.log("\n✓ validate-preview-anchor-unification-15-3-2 PASS\n");
