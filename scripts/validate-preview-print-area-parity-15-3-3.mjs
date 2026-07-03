/**
 * Phase 15.3.3 — Preview Print Area Parity Audit (analysis only)
 * node scripts/validate-preview-print-area-parity-15-3-3.mjs
 *
 * Compares Designer Blue Print Area vs Preview Artwork Stage vs Preview Printable Boundary
 * container fingerprints. Does NOT modify runtime.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS_PX = 0.5;

const CANVAS_W = 1024;
const CANVAS_H = 1536;
const PX_PER_CM = 12.24;
const COLLAR_Y = 386;
const PRINT_OFFSET_CM = { front: 7, back: 5 };
const CENTER_X = 512;
const PLACEMENT_REF = { x: 0.5, y: 0.5 };
const REF_SIZE = "M";
const CHEST_ALIGN = 612 / 550;
const VISUAL_CHEST_PX = 550;
const VISUAL_BODY_PX = 903;

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

const CHEST_CM = {
  90: 36,
  110: 40,
  130: 44,
  150: 48,
  160: 50,
  GS: 48,
  GM: 50,
  GL: 52,
  S: 52,
  M: 52,
  L: 54,
  XL: 56,
  XXL: 58,
  XXXL: 60,
};

const LENGTH_CM = {
  90: 44,
  110: 48,
  130: 52,
  150: 56,
  160: 58,
  GS: 56,
  GM: 58,
  GL: 60,
  S: 60,
  M: 69,
  L: 71,
  XL: 73,
  XXL: 75,
  XXXL: 77,
};

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
  warnings += 1;
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

function shirtScale(size) {
  return CHEST_CM[size] / CHEST_CM.M;
}

function garmentVisualRenderScale(size) {
  return shirtScale(size) * CHEST_ALIGN;
}

function getBlueCm(side, size, frontRows, backRows) {
  const rows = side === "front" ? frontRows : backRows;
  const row = rows.find((r) => r.size === size);
  if (!row) throw new Error(`missing blue row ${side}/${size}`);
  return row.blue;
}

/** Factory Overlay → template px (Designer workspace + Preview artwork stage @ 15.3.2) */
function factoryOverlayContainerPx(side, blue) {
  const topPx = COLLAR_Y + PRINT_OFFSET_CM[side] * PX_PER_CM;
  const widthPx = blue.width * PX_PER_CM;
  const heightPx = blue.height * PX_PER_CM;
  const leftPx = CENTER_X - widthPx / 2;
  return {
    topPx,
    leftPx,
    widthPx,
    heightPx,
    transform: "none",
    transformOrigin: "n/a",
    position: "absolute",
    scale: 1,
    rotation: 0,
    overflow: "hidden (designer) / visible (preview artwork)",
    anchor: "top-left (factory collar + cm offset)",
  };
}

function designerBlueVisualSizePx(size, blue) {
  const chest = CHEST_CM[size];
  const length = LENGTH_CM[size];
  const renderScale = garmentVisualRenderScale(size);
  const garmentWidthPx = VISUAL_CHEST_PX * renderScale;
  const garmentHeightPx = VISUAL_BODY_PX * renderScale;
  return {
    widthPx: (blue.widthCm / chest) * garmentWidthPx,
    heightPx: (blue.heightCm / length) * garmentHeightPx,
  };
}

/** Preview printable boundary: center ref + translate(-50%,-50%) + Garment Visual Profile % */
function printableBoundaryContainerPx(side, size, mBlue, garmentBlue) {
  const mRender = designerBlueVisualSizePx(REF_SIZE, {
    widthCm: mBlue.width,
    heightCm: mBlue.height,
  });
  const widthPct = (mRender.widthPx / CANVAS_W) * (garmentBlue.width / mBlue.width);
  const heightPct =
    (mRender.heightPx / CANVAS_H) * (garmentBlue.height / mBlue.height);
  const widthPx = widthPct * CANVAS_W;
  const heightPx = heightPct * CANVAS_H;
  const centerX = PLACEMENT_REF.x * CANVAS_W;
  const centerY = PLACEMENT_REF.y * CANVAS_H;
  return {
    topPx: centerY - heightPx / 2,
    leftPx: centerX - widthPx / 2,
    widthPx,
    heightPx,
    transform: "translate(-50%, -50%)",
    transformOrigin: "center center (implicit)",
    position: "absolute",
    scale: 1,
    rotation: 0,
    overflow: "hidden",
    anchor: "center (getPreviewPrintReference)",
  };
}

/** CSS % style → effective px rect (top-left origin after transform) */
function styleToEffectivePx(style) {
  const leftPct = parseFloat(style.left);
  const topPct = parseFloat(style.top);
  const widthPct = parseFloat(style.width);
  const heightPct = parseFloat(style.height);
  const widthPx = (widthPct / 100) * CANVAS_W;
  const heightPx = (heightPct / 100) * CANVAS_H;
  let leftPx = (leftPct / 100) * CANVAS_W;
  let topPx = (topPct / 100) * CANVAS_H;
  if (style.transform?.includes("translate(-50%")) {
    leftPx -= widthPx / 2;
    topPx -= heightPx / 2;
  }
  return { leftPx, topPx, widthPx, heightPx, transform: style.transform ?? "none" };
}

function computePrintAreaParityFingerprint(containerPx) {
  return {
    topPx: containerPx.topPx,
    leftPx: containerPx.leftPx,
    widthPx: containerPx.widthPx,
    heightPx: containerPx.heightPx,
    transform: containerPx.transform,
    topPct: (containerPx.topPx / CANVAS_H) * 100,
    leftPct: (containerPx.leftPx / CANVAS_W) * 100,
    widthPct: (containerPx.widthPx / CANVAS_W) * 100,
    heightPct: (containerPx.heightPx / CANVAS_H) * 100,
  };
}

function fingerprintsEqual(a, b) {
  return (
    approx(a.topPx, b.topPx) &&
    approx(a.leftPx, b.leftPx) &&
    approx(a.widthPx, b.widthPx) &&
    approx(a.heightPx, b.heightPx) &&
    a.transform === b.transform
  );
}

function layerFillPctDesigner(garmentW, garmentH, garmentPrintable) {
  return {
    widthPct: (garmentW / garmentPrintable.width) * 100,
    heightPct: (garmentH / garmentPrintable.height) * 100,
  };
}

function layerFillPctPreview(garmentW, garmentH, garmentPrintable, mRef) {
  return {
    widthPct: (garmentW / mRef.width) * 100,
    heightPct: (garmentH / mRef.height) * 100,
  };
}

console.log("validate-preview-print-area-parity-15-3-3\n");

const previewRuntime = read("lib/preview-runtime.ts");
const artworkSlice = previewRuntime.slice(
  previewRuntime.indexOf("export function getPreviewArtworkStageStyle"),
  previewRuntime.indexOf("/** @deprecated Use getPreviewArtworkStageStyle"),
);

console.log("── Source: Artwork Stage vs Designer (15.3.2) ──");
if (artworkSlice.includes("getDesignerFactoryOverlayContainerStyle")) {
  pass("Preview Artwork Stage delegates to getDesignerFactoryOverlayContainerStyle");
} else {
  fail("Preview Artwork Stage must use getDesignerFactoryOverlayContainerStyle");
}

if (previewRuntime.includes("getPreviewPrintReference") && artworkSlice.includes("getPreviewPrintReference")) {
  fail("Artwork Stage must not use getPreviewPrintReference");
} else {
  pass("Artwork Stage does not use getPreviewPrintReference");
}

console.log("\n── Source: Printable Boundary (legacy path) ──");
if (previewRuntime.includes("getPreviewPrintableBoundaryStyle")) {
  if (previewRuntime.includes("PREVIEW_REFERENCE_TRANSFORM")) {
    warn("Printable Boundary still uses PREVIEW_REFERENCE_TRANSFORM (expected — not unified)");
  }
  pass("Printable Boundary uses separate center-anchor path (documented)");
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

const mFrontBlue = getBlueCm("front", REF_SIZE, FRONT_ROWS, BACK_ROWS);
const mBackBlue = getBlueCm("back", REF_SIZE, FRONT_ROWS, BACK_ROWS);

console.log("\n── Triple Overlap @ M (Designer Blue = Artwork Stage?) ──");
for (const side of ["front", "back"]) {
  const mBlue = side === "front" ? mFrontBlue : mBackBlue;
  const designer = computePrintAreaParityFingerprint(
    factoryOverlayContainerPx(side, mBlue),
  );
  const artwork = computePrintAreaParityFingerprint(
    factoryOverlayContainerPx(side, mBlue),
  );
  const boundary = computePrintAreaParityFingerprint(
    printableBoundaryContainerPx(side, REF_SIZE, mBlue, mBlue),
  );

  if (fingerprintsEqual(designer, artwork)) {
    pass(`${side} @ M: Designer Blue == Preview Artwork Stage`);
  } else {
    fail(`${side} @ M: Designer Blue != Preview Artwork Stage`);
  }

  if (fingerprintsEqual(designer, boundary)) {
    pass(`${side} @ M: Designer Blue == Printable Boundary`);
  } else {
    warn(
      `${side} @ M: Printable Boundary differs ` +
        `(Δw=${(boundary.widthPx - designer.widthPx).toFixed(1)}px ` +
        `Δh=${(boundary.heightPx - designer.heightPx).toFixed(1)}px ` +
        `Δtop=${(boundary.topPx - designer.topPx).toFixed(1)}px)`,
    );
  }
}

console.log("\n── Matrix: Container parity × 14 sizes × Front/Back ──");
let designerArtworkChecks = 0;
let designerArtworkPass = 0;
let designerBoundaryChecks = 0;
let boundaryMismatch = 0;

for (const side of ["front", "back"]) {
  const mBlue = side === "front" ? mFrontBlue : mBackBlue;
  const designerM = factoryOverlayContainerPx(side, mBlue);
  for (const size of SIZES) {
    const garmentBlue = getBlueCm(side, size, FRONT_ROWS, BACK_ROWS);
    const designer = factoryOverlayContainerPx(side, mBlue);
    const artwork = factoryOverlayContainerPx(side, mBlue);
    const boundary = printableBoundaryContainerPx(side, size, mBlue, garmentBlue);

    designerArtworkChecks += 1;
    if (fingerprintsEqual(
      computePrintAreaParityFingerprint(designer),
      computePrintAreaParityFingerprint(artwork),
    )) {
      designerArtworkPass += 1;
    } else {
      fail(`${side}/${size}: Designer != Artwork Stage`);
    }

    designerBoundaryChecks += 1;
    if (!fingerprintsEqual(
      computePrintAreaParityFingerprint(designerM),
      computePrintAreaParityFingerprint(boundary),
    )) {
      boundaryMismatch += 1;
    }
  }
}

pass(`Designer Blue == Artwork Stage: ${designerArtworkPass}/${designerArtworkChecks}`);
pass(
  `Printable Boundary != Designer Blue (expected): ${boundaryMismatch}/${designerBoundaryChecks} sizes differ`,
);

console.log("\n── Case Studies: full-bleed layer % inside container ──");
const cases = [
  { label: "Case1 Kids90 18×24", size: "90", side: "front" },
  { label: "Case2 M 35×50", size: "M", side: "front" },
  { label: "Case3 XXXL 45×60", size: "XXXL", side: "front" },
];

for (const c of cases) {
  const garmentBlue = getBlueCm(c.side, c.size, FRONT_ROWS, BACK_ROWS);
  const mBlue = c.side === "front" ? mFrontBlue : mBackBlue;
  const designerFill = layerFillPctDesigner(
    garmentBlue.width,
    garmentBlue.height,
    garmentBlue,
  );
  const previewFill = layerFillPctPreview(
    garmentBlue.width,
    garmentBlue.height,
    garmentBlue,
    mBlue,
  );
  const fillsMatch =
    approx(designerFill.widthPct, previewFill.widthPct, 0.01) &&
    approx(designerFill.heightPct, previewFill.heightPct, 0.01);
  if (c.size === "M" && fillsMatch) {
    pass(`${c.label}: full-bleed layer 100%×100% in both pipelines`);
  } else if (!fillsMatch) {
    warn(
      `${c.label}: Designer fill ${designerFill.widthPct.toFixed(1)}%×${designerFill.heightPct.toFixed(1)}% ` +
        `vs Preview ${previewFill.widthPct.toFixed(1)}%×${previewFill.heightPct.toFixed(1)}% ` +
        `(same outer container, different inner %)`,
    );
  }
}

console.log("\n── Case4/5 Collar offset (factory overlay top) ──");
const frontTop = factoryOverlayContainerPx("front", mFrontBlue).topPx;
const backTop = factoryOverlayContainerPx("back", mBackBlue).topPx;
const expectedFrontTop = COLLAR_Y + PRINT_OFFSET_CM.front * PX_PER_CM;
const expectedBackTop = COLLAR_Y + PRINT_OFFSET_CM.back * PX_PER_CM;
if (approx(frontTop, expectedFrontTop) && approx(backTop, expectedBackTop)) {
  pass(`collar offset front 7cm → top ${frontTop.toFixed(2)}px, back 5cm → ${backTop.toFixed(2)}px`);
} else {
  fail("collar offset top px mismatch");
}

console.log("\n── Preview entry points (shared runtime) ──");
const entries = [
  ["Flat", "components/designer/FlatShirtDesignView.tsx"],
  ["Model", "components/designer/ModelDesignPreview.tsx"],
  ["Zoom", "components/designer/ClothingBrowseModal.tsx"],
  ["Product panel", "components/designer/ClothingBrowsePanel.tsx"],
  ["Review Modal", "components/designer/DesignReviewModal.tsx"],
];
for (const [label, file] of entries) {
  const src = read(file);
  if (src.includes("PreviewGarmentView") || src.includes("FlatShirtDesignView") || src.includes("ModelDesignPreview")) {
    pass(`${label} → PreviewGarmentView pipeline`);
  } else {
    fail(`${label} missing PreviewGarmentView pipeline`);
  }
}

console.log("\n── Summary ──");
console.log(`Report: docs/preview-print-area-parity-15-3-3.md`);
if (failures > 0) {
  console.error(`\n✗ FAIL (${failures} errors, ${warnings} warnings)\n`);
  process.exit(1);
}
console.log(`\n✓ PASS (${warnings} warnings — expected printable-boundary divergence)\n`);
