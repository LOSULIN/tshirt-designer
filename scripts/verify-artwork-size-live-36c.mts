/**
 * Phase 36C Live Runtime Verification
 * Uses actual Coordinate + Export Runtime (not UI simulation).
 *
 * node --import tsx scripts/verify-artwork-size-live-36c.mts
 */

import { getLayerEffectiveCmRect } from "../lib/design-cm";
import { resolveLayerCmRect } from "../lib/coordinate-runtime";
import {
  createDesignerCoordinateContext,
  projectLayerPatchToWorkspace,
  workspaceRectToDesignerRect,
  toDesignerCssPercentFromWorkspace,
} from "../lib/designer-coordinate-facade";
import {
  getDesignerBluePrintArea,
  getDesignerBackBluePrintArea,
} from "../lib/designer-print-area-config";
import { resolveExportGarmentLayerCmRect } from "../lib/export-runtime";
import {
  applyDesignerPlacementPresetPreserveSize,
  resolvePhysicalPresetWorkspaceRect,
} from "../lib/designer-placement-ux";
import {
  getPlacementPresetById,
  type PlacementPresetId,
} from "../lib/placement-presets";
import { createDefaultShapeLayer } from "../lib/shape-layer";
import { createDesignerDefaultTextLayer } from "../lib/designer-coordinate-controller";
import type { DesignLayer, ImageDesignLayer, ShapeDesignLayer } from "../lib/types";

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
] as const;

const SIDE = "front" as const;
const TOLERANCE = 0.51;

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`  ✅ ${msg}`);
}

function applyArtworkSizePatch<T extends DesignLayer>(
  layer: T,
  patch: { width_cm?: number; height_cm?: number },
  size: string,
): T {
  const ctx = createDesignerCoordinateContext(SIDE, size);
  const workspacePatch = projectLayerPatchToWorkspace(patch, ctx);
  return {
    ...layer,
    ...(workspacePatch.width_cm !== undefined
      ? { width_cm: workspacePatch.width_cm }
      : {}),
    ...(workspacePatch.height_cm !== undefined
      ? { height_cm: workspacePatch.height_cm }
      : {}),
    ...(layer.type === "text" ? { keepRatio: false as const } : {}),
  } as T;
}

function getGarmentPrintable(size: string) {
  const blue = getDesignerBluePrintArea(size);
  return { width: blue.widthCm, height: blue.heightCm };
}

function renderCssPercent(layer: DesignLayer, size: string) {
  const ctx = createDesignerCoordinateContext(SIDE, size);
  const rect = resolveLayerCmRect(layer, { purpose: "designer" });
  const style = toDesignerCssPercentFromWorkspace(rect, ctx);
  return {
    widthPct: Number.parseFloat(style.width),
    heightPct: Number.parseFloat(style.height),
  };
}

function exportGarmentCm(layer: DesignLayer, size: string) {
  const rect = resolveExportGarmentLayerCmRect(layer, SIDE, size);
  return { width: rect.width_cm, height: rect.height_cm };
}

function designerDisplayCm(layer: DesignLayer, size: string) {
  const ctx = createDesignerCoordinateContext(SIDE, size);
  const rect = workspaceRectToDesignerRect(
    resolveLayerCmRect(layer, { purpose: "designer" }),
    ctx,
  );
  return {
    width: Math.round(rect.width_cm),
    height: Math.round(rect.height_cm),
  };
}

function makeImageLayer(size: string): ImageDesignLayer {
  const ctx = createDesignerCoordinateContext(SIDE, size);
  const garment = getGarmentPrintable(size);
  const workspace = projectLayerPatchToWorkspace(
    { width_cm: 10, height_cm: 10 },
    ctx,
  );
  return {
    id: "img-test",
    name: "Image",
    type: "image",
    visible: true,
    locked: false,
    zIndex: 1,
    x_cm: 5,
    y_cm: 6,
    width_cm: workspace.width_cm!,
    height_cm: workspace.height_cm!,
    scale: 1,
    rotation: 0,
    keepRatio: true,
    image: {
      originalBlob: new Blob(),
      originalUrl: "",
      previewUrl: "",
      previewWidth: 100,
      previewHeight: 100,
      naturalWidth: 400,
      naturalHeight: 300,
      imagePixelWidth: 400,
      imagePixelHeight: 300,
      mimeType: "image/png",
      fileName: "test.png",
    },
  };
}

function assertFullBleed(
  label: string,
  layer: DesignLayer,
  size: string,
  targetW: number,
  targetH: number,
) {
  const css = renderCssPercent(layer, size);
  const exportCm = exportGarmentCm(layer, size);
  const display = designerDisplayCm(layer, size);

  if (Math.abs(css.widthPct - 100) > TOLERANCE) {
    fail(`${label} @ ${size}: CSS width ${css.widthPct}% (expected 100%)`);
  }
  if (Math.abs(css.heightPct - 100) > TOLERANCE) {
    fail(`${label} @ ${size}: CSS height ${css.heightPct}% (expected 100%)`);
  }
  if (Math.abs(exportCm.width - targetW) > TOLERANCE) {
    fail(
      `${label} @ ${size}: Export width ${exportCm.width} (expected ${targetW})`,
    );
  }
  if (Math.abs(exportCm.height - targetH) > TOLERANCE) {
    fail(
      `${label} @ ${size}: Export height ${exportCm.height} (expected ${targetH})`,
    );
  }
  if (display.width !== targetW || display.height !== targetH) {
    fail(
      `${label} @ ${size}: Display ${display.width}×${display.height} (expected ${targetW}×${targetH})`,
    );
  }
}

console.log("=== Phase 36C Live Runtime Verification ===\n");

console.log("① Rectangle — all sizes full printable");
for (const size of SIZES) {
  const garment = getGarmentPrintable(size);
  const ctx = createDesignerCoordinateContext(SIDE, size);
  let layer = createDefaultShapeLayer(
    "rectangle",
    [],
    ctx.garmentPrintArea,
  ) as ShapeDesignLayer;
  layer = applyArtworkSizePatch(
    layer,
    { width_cm: garment.width, height_cm: garment.height },
    size,
  ) as ShapeDesignLayer;
  assertFullBleed("Rectangle", layer, size, garment.width, garment.height);
}
ok(`Rectangle 14/14 sizes — canvas CSS 100% + export matches garment`);

console.log("\n② Image — all sizes full printable");
for (const size of SIZES) {
  const garment = getGarmentPrintable(size);
  let layer = makeImageLayer(size);
  layer = applyArtworkSizePatch(
    layer,
    { width_cm: garment.width, height_cm: garment.height },
    size,
  ) as ImageDesignLayer;
  assertFullBleed("Image", layer, size, garment.width, garment.height);
}
ok(`Image 14/14 sizes — canvas CSS 100% + export matches garment`);

console.log("\n③ Text — all sizes full printable");
for (const size of SIZES) {
  const garment = getGarmentPrintable(size);
  const ctx = createDesignerCoordinateContext(SIDE, size);
  let layer = createDesignerDefaultTextLayer([], ctx);
  layer = applyArtworkSizePatch(
    layer,
    { width_cm: garment.width, height_cm: garment.height },
    size,
  );
  assertFullBleed("Text", layer, size, garment.width, garment.height);
}
ok(`Text 14/14 sizes — canvas CSS 100% + export matches garment`);

console.log("\n④⑤⑥ Presets A5 / A4 / A3 then Artwork Size override (size M)");
const presetTests: { id: PlacementPresetId; w: number; h: number }[] = [
  { id: "front-a5-portrait", w: 15, h: 21 },
  { id: "front-a5-landscape", w: 21, h: 15 },
  { id: "center-chest-a4-portrait", w: 21, h: 29.7 },
  { id: "back-center-a3-portrait", w: 29.7, h: 42 },
];

for (const presetTest of presetTests) {
  const preset = getPlacementPresetById(presetTest.id, "M");
  if (!preset) fail(`Missing preset ${presetTest.id}`);
  const ctx = createDesignerCoordinateContext(
    preset.sides[0] ?? "front",
    "M",
  );
  let layer = makeImageLayer("M");
  layer = applyDesignerPlacementPresetPreserveSize(
    layer,
    preset,
    ctx,
  ) as ImageDesignLayer;
  const beforeOverrideX = layer.x_cm;
  const beforeOverrideY = layer.y_cm;
  const afterPreset = designerDisplayCm(layer, "M");
  if (
    Math.abs(afterPreset.width - presetTest.w) > 0.51 ||
    Math.abs(afterPreset.height - presetTest.h) > 0.51
  ) {
    fail(
      `Preset ${presetTest.id}: got ${afterPreset.width}×${afterPreset.height}`,
    );
  }
  layer = applyArtworkSizePatch(layer, { width_cm: 20, height_cm: 10 }, "M");
  if (layer.x_cm !== beforeOverrideX || layer.y_cm !== beforeOverrideY) {
    fail(`Preset ${presetTest.id}: position drift after Artwork Size`);
  }
  const afterOverride = designerDisplayCm(layer, "M");
  if (afterOverride.width !== 20 || afterOverride.height !== 10) {
    fail(
      `Preset ${presetTest.id}: override ${afterOverride.width}×${afterOverride.height}`,
    );
  }
  const exportCm = exportGarmentCm(layer, "M");
  if (exportCm.width !== 20 || exportCm.height !== 10) {
    fail(`Preset ${presetTest.id}: export ${exportCm.width}×${exportCm.height}`);
  }
  ok(
    `${presetTest.id}: preset ${presetTest.w}×${presetTest.h} → override 20×10, position preserved, export一致`,
  );
}

console.log("\n⑦⑧ Product Download / Factory Proof export dimensions (M, 20×10)");
const mLayer = applyArtworkSizePatch(
  makeImageLayer("M"),
  { width_cm: 20, height_cm: 10 },
  "M",
);
const exportM = exportGarmentCm(mLayer, "M");
const cssM = renderCssPercent(mLayer, "M");
if (exportM.width !== 20 || exportM.height !== 10) {
  fail(`Product export size mismatch: ${exportM.width}×${exportM.height}`);
}
ok(`Export garment rect 20×10 cm (Product Download / Proof 同源)`);
ok(`Canvas CSS ${cssM.widthPct.toFixed(1)}%×${cssM.heightPct.toFixed(1)}% @ M`);

console.log("\n⑨ Size matrix summary (Rectangle full printable)");
console.log(
  "Size | Garment | Artwork Size (UI) | Export | CSS% | Match",
);
console.log("-----|---------|-------------------|--------|------|------");
for (const size of SIZES) {
  const garment = getGarmentPrintable(size);
  const ctx = createDesignerCoordinateContext(SIDE, size);
  let layer = createDefaultShapeLayer(
    "rectangle",
    [],
    ctx.garmentPrintArea,
  ) as ShapeDesignLayer;
  layer = applyArtworkSizePatch(
    layer,
    { width_cm: garment.width, height_cm: garment.height },
    size,
  ) as ShapeDesignLayer;
  const display = designerDisplayCm(layer, size);
  const exportCm = exportGarmentCm(layer, size);
  const css = renderCssPercent(layer, size);
  const match =
    Math.abs(css.widthPct - 100) < TOLERANCE &&
    Math.abs(css.heightPct - 100) < TOLERANCE &&
    Math.abs(exportCm.width - garment.width) < TOLERANCE &&
    Math.abs(exportCm.height - garment.height) < TOLERANCE;
  console.log(
    `${size.padEnd(4)} | ${garment.width}×${String(garment.height).padEnd(7)} | ${display.width}×${display.height}`.padEnd(22) +
      ` | ${exportCm.width}×${exportCm.height}`.padEnd(8) +
      ` | ${css.widthPct.toFixed(0)}%×${css.heightPct.toFixed(0)}%`.padEnd(10) +
      ` | ${match ? "✅" : "❌"}`,
  );
  if (!match) fail(`Size ${size} matrix row failed`);
}

console.log("\n=== ALL LIVE RUNTIME CHECKS PASSED ===\n");
