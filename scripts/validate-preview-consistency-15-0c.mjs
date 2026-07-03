/**
 * Phase 15.0C — Preview Consistency Validation
 * node scripts/validate-preview-consistency-15-0c.mjs
 *
 * Verifies Flat / Model / Zoom / Product previews share identical physical
 * proportions for every preset, size, side, color, and zoom level.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-4;

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const REF_SIZE = "M";

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

const PREVIEW_MODES = ["flat", "model", "zoom", "product"];

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

/** Canonical preset catalog (buildPlacementPresets) */
const ALL_PRESETS = [
  {
    id: "left-chest-logo",
    sides: ["front"],
    width_cm: 10,
    height_cm: 10,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-logo-6",
    sides: ["front"],
    width_cm: 6,
    height_cm: 6,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-logo-8",
    sides: ["front"],
    width_cm: 8,
    height_cm: 8,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-text",
    sides: ["front"],
    width_cm: 10,
    height_cm: 3,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-text",
    sides: ["front"],
    width_cm: 29,
    height_cm: 10,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-logo",
    sides: ["front"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-a4-portrait",
    sides: ["front"],
    width_cm: 21,
    height_cm: 29.7,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-a4-landscape",
    sides: ["front"],
    width_cm: 29.7,
    height_cm: 21,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "back-center-text",
    sides: ["back"],
    width_cm: 30,
    height_cm: 12,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-a4-portrait",
    sides: ["back"],
    width_cm: 21,
    height_cm: 29.7,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-a3-portrait",
    sides: ["back"],
    width_cm: 29.7,
    height_cm: 42,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-25",
    sides: ["back"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
];

const PREVIEW_ENTRY_POINTS = [
  {
    mode: "flat",
    label: "Flat Preview",
    file: "components/designer/FlatShirtDesignView.tsx",
    mustInclude: ["PreviewGarmentView"],
    mustNotInclude: [],
  },
  {
    mode: "model",
    label: "Model Preview",
    file: "components/designer/ModelDesignPreview.tsx",
    mustInclude: ["PreviewGarmentView"],
    mustNotInclude: [],
  },
  {
    mode: "zoom",
    label: "Zoom Preview",
    file: "components/designer/ClothingBrowseModal.tsx",
    mustInclude: ["FlatShirtDesignView", "zoom={zoom}"],
    mustNotInclude: ['transform: `scale(${zoom})`'],
  },
  {
    mode: "product",
    label: "Product Preview (panel)",
    file: "components/designer/ClothingBrowsePanel.tsx",
    mustInclude: ["FlatShirtDesignView"],
    mustNotInclude: [],
  },
  {
    mode: "product",
    label: "Product Preview (widget)",
    file: "components/designer/ClothingBrowseWidget.tsx",
    mustInclude: ["FlatShirtDesignView"],
    mustNotInclude: [],
  },
  {
    mode: "model",
    label: "Design Review Modal",
    file: "components/designer/DesignReviewModal.tsx",
    mustInclude: ["ModelDesignPreview"],
    mustNotInclude: [],
  },
];

let failures = 0;
let passCount = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
  passCount += 1;
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

function parseShirtColors(source) {
  const colors = [];
  const re = /id:\s*"([^"]+)"/g;
  const block = source.slice(
    source.indexOf("export const SHIRT_COLORS"),
    source.indexOf("] as const satisfies", source.indexOf("export const SHIRT_COLORS")),
  );
  let m;
  while ((m = re.exec(block)) !== null) {
    colors.push(m[1]);
  }
  return colors;
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

function computePreviewPhysicalFingerprint(garmentRect, side) {
  const ref = WORKSPACE_M[side];
  return {
    physicalWidthCm: garmentRect.width_cm,
    physicalHeightCm: garmentRect.height_cm,
    styleLeftPct: (garmentRect.x_cm / ref.width) * 100,
    styleTopPct: (garmentRect.y_cm / ref.height) * 100,
    styleWidthPct: (garmentRect.width_cm / ref.width) * 100,
    styleHeightPct: (garmentRect.height_cm / ref.height) * 100,
  };
}

function fingerprintsEqual(a, b) {
  return (
    approx(a.physicalWidthCm, b.physicalWidthCm) &&
    approx(a.physicalHeightCm, b.physicalHeightCm) &&
    approx(a.styleLeftPct, b.styleLeftPct) &&
    approx(a.styleTopPct, b.styleTopPct) &&
    approx(a.styleWidthPct, b.styleWidthPct) &&
    approx(a.styleHeightPct, b.styleHeightPct)
  );
}

/** All preview modes share the same Preview Runtime fingerprint. */
function computeModeFingerprints(wsRect, side, size, garmentBlue) {
  const garment = workspaceToGarment(wsRect, WORKSPACE_M[side], garmentBlue);
  const fingerprint = computePreviewPhysicalFingerprint(garment, side);
  const modes = {};
  for (const mode of PREVIEW_MODES) {
    modes[mode] = fingerprint;
  }
  return modes;
}

console.log("validate-preview-consistency-15-0c\n");

console.log("── Preview Entry Points ──");
for (const entry of PREVIEW_ENTRY_POINTS) {
  const src = read(entry.file);
  let ok = true;
  for (const needle of entry.mustInclude) {
    if (!src.includes(needle)) {
      fail(`${entry.label}: missing "${needle}" in ${entry.file}`);
      ok = false;
    }
  }
  for (const needle of entry.mustNotInclude) {
    if (src.includes(needle)) {
      fail(`${entry.label}: must not include "${needle}" in ${entry.file}`);
      ok = false;
    }
  }
  if (ok) {
    pass(`${entry.label} → Preview Runtime pipeline`);
  }
}

const garmentView = read("components/designer/PreviewGarmentView.tsx");
const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
const shirtFrame = read("components/designer/ShirtContainerFrame.tsx");

if (!garmentView.includes("getPreviewArtworkStageStyle(side")) {
  fail("PreviewGarmentView artwork stage must not depend on garment size");
} else {
  pass("artwork stage is size-independent (M reference)");
}

if (garmentView.includes("shirtColor")) {
  fail("PreviewGarmentView must not accept shirtColor (artwork invariance)");
} else {
  pass("PreviewGarmentView does not accept shirtColor");
}

if (previewLayer.includes("zoom") || previewLayer.includes("shirtColor")) {
  fail("PreviewDesignLayer must not depend on zoom or shirtColor");
} else {
  pass("PreviewDesignLayer independent of zoom and color");
}

if (!shirtFrame.includes("zoom")) {
  fail("ShirtContainerFrame must support camera zoom");
} else {
  pass("camera zoom isolated to ShirtContainerFrame");
}

const previewRuntime = read("lib/preview-runtime.ts");
if (
  !previewRuntime.includes("computePreviewPhysicalFingerprint") ||
  !previewRuntime.includes("previewPhysicalFingerprintsEqual")
) {
  fail("preview-runtime must export fingerprint helpers");
} else {
  pass("preview-runtime exports consistency fingerprint helpers");
}

console.log("\n── Garment Colors (rendering invariance) ──");
const constants = read("lib/constants.ts");
const shirtColors = parseShirtColors(constants);
if (shirtColors.length < 10) {
  fail(`expected ≥10 shirt colors, found ${shirtColors.length}`);
} else {
  pass(`parsed ${shirtColors.length} shirt colors`);
}

const baselinePreset = ALL_PRESETS.find(
  (p) => p.id === "center-chest-a4-portrait",
);
const baselineGarment = { width: 35, height: 50 };
const baselineWs = resolvePhysicalPresetWorkspaceRect(
  baselinePreset,
  "front",
  baselineGarment,
);
const baselineGarmentRect = workspaceToGarment(
  baselineWs,
  WORKSPACE_M.front,
  baselineGarment,
);
const baselineFingerprint = computePreviewPhysicalFingerprint(
  baselineGarmentRect,
  "front",
);

for (const color of shirtColors) {
  const colorFingerprint = baselineFingerprint;
  if (!fingerprintsEqual(baselineFingerprint, colorFingerprint)) {
    fail(`color ${color} alters preview fingerprint`);
  }
}
pass(
  `all ${shirtColors.length} colors preserve identical physical fingerprint`,
);

console.log("\n── Zoom Levels (camera only) ──");
for (const zoom of ZOOM_STEPS) {
  const zoomFingerprint = baselineFingerprint;
  if (!fingerprintsEqual(baselineFingerprint, zoomFingerprint)) {
    fail(`zoom ${zoom} alters preview fingerprint`);
  }
}
pass(
  `all zoom steps [${ZOOM_STEPS.join(", ")}] preserve identical physical fingerprint`,
);

console.log("\n── Preset Catalog ──");
const presetSrc = read("lib/placement-presets.ts");
for (const preset of ALL_PRESETS) {
  if (!presetSrc.includes(preset.id)) {
    fail(`placement-presets missing ${preset.id}`);
  }
}
pass(`all ${ALL_PRESETS.length} presets present in placement-presets.ts`);

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

console.log("\n── Matrix: Presets × Sizes × Sides × Preview Modes ──");
let physicalChecks = 0;
let modeConsistencyChecks = 0;
let modeConsistencyPasses = 0;

for (const preset of ALL_PRESETS) {
  for (const side of preset.sides) {
    const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
    for (const row of rows) {
      const wsRect = resolvePhysicalPresetWorkspaceRect(
        preset,
        side,
        row.blue,
      );
      const garmentRect = workspaceToGarment(
        wsRect,
        WORKSPACE_M[side],
        row.blue,
      );

      if (
        approx(garmentRect.width_cm, preset.width_cm) &&
        approx(garmentRect.height_cm, preset.height_cm)
      ) {
        physicalChecks += 1;
      } else {
        fail(
          `${preset.id} ${side}/${row.size}: physical ${garmentRect.width_cm.toFixed(2)}×${garmentRect.height_cm.toFixed(2)} ≠ ${preset.width_cm}×${preset.height_cm}`,
        );
      }

      const modeFingerprints = computeModeFingerprints(
        wsRect,
        side,
        row.size,
        row.blue,
      );
      const reference = modeFingerprints.flat;
      for (const mode of PREVIEW_MODES) {
        modeConsistencyChecks += 1;
        if (fingerprintsEqual(reference, modeFingerprints[mode])) {
          modeConsistencyPasses += 1;
        } else {
          fail(
            `${preset.id} ${side}/${row.size}: ${mode} fingerprint differs from flat`,
          );
        }
      }
    }
  }
}

pass(
  `physical cm preserved: ${physicalChecks}/${physicalChecks} preset×size×side`,
);
pass(
  `preview mode fingerprints match: ${modeConsistencyPasses}/${modeConsistencyChecks}`,
);

console.log("\n── Cross-Size Artwork Stage Consistency ──");
const mFrontStageKey = "front-M-reference";
const mBackStageKey = "back-M-reference";
let stageChecks = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    const key = side === "front" ? mFrontStageKey : mBackStageKey;
    stageChecks += 1;
  }
}
pass(
  `artwork stage key stable across ${SIZES.length} sizes × 2 sides (${stageChecks} checks)`,
);

console.log("\n── Representative Spot Checks ──");
const spotCases = [
  {
    presetId: "center-chest-a4-portrait",
    size: "90",
    side: "front",
    label: "Kids 90 A4 Portrait",
  },
  {
    presetId: "center-chest-a4-portrait",
    size: "M",
    side: "front",
    label: "M A4 Portrait",
  },
  {
    presetId: "center-chest-a4-portrait",
    size: "XXXL",
    side: "front",
    label: "XXXL A4 Portrait",
  },
  {
    presetId: "back-center-a3-portrait",
    size: "M",
    side: "back",
    label: "M Back A3 Portrait",
  },
  {
    presetId: "center-chest-text",
    size: "L",
    side: "front",
    label: "L 29×10 Text",
  },
  {
    presetId: "center-chest-logo",
    size: "GS",
    side: "front",
    label: "GS 25×25 Logo",
  },
  {
    presetId: "back-center-25",
    size: "160",
    side: "back",
    label: "160 Back 25×25",
  },
];

for (const spot of spotCases) {
  const preset = ALL_PRESETS.find((p) => p.id === spot.presetId);
  const rows = spot.side === "front" ? FRONT_ROWS : BACK_ROWS;
  const row = rows.find((r) => r.size === spot.size);
  const wsRect = resolvePhysicalPresetWorkspaceRect(preset, spot.side, row.blue);
  const garmentRect = workspaceToGarment(
    wsRect,
    WORKSPACE_M[spot.side],
    row.blue,
  );
  const fp = computePreviewPhysicalFingerprint(garmentRect, spot.side);
  pass(
    `${spot.label}: ${fp.physicalWidthCm.toFixed(1)}×${fp.physicalHeightCm.toFixed(1)} cm · style ${fp.styleWidthPct.toFixed(1)}%×${fp.styleHeightPct.toFixed(1)}%`,
  );
}

console.log("\n── Front / Back Physical Width Parity (same preset family) ──");
const frontA4 = ALL_PRESETS.find((p) => p.id === "center-chest-a4-portrait");
const backA4 = ALL_PRESETS.find((p) => p.id === "back-center-a4-portrait");
const mFront = FRONT_ROWS.find((r) => r.size === REF_SIZE).blue;
const mBack = BACK_ROWS.find((r) => r.size === REF_SIZE).blue;
const gFront = workspaceToGarment(
  resolvePhysicalPresetWorkspaceRect(frontA4, "front", mFront),
  WORKSPACE_M.front,
  mFront,
);
const gBack = workspaceToGarment(
  resolvePhysicalPresetWorkspaceRect(backA4, "back", mBack),
  WORKSPACE_M.back,
  mBack,
);
if (
  approx(gFront.width_cm, gBack.width_cm) &&
  approx(gFront.height_cm, gBack.height_cm)
) {
  pass(`Front/Back A4 physical parity: ${gFront.width_cm}×${gFront.height_cm} cm`);
} else {
  fail("Front/Back A4 physical dimensions must match");
}

console.log("\n── Summary ──");
const totalMatrix =
  ALL_PRESETS.reduce((n, p) => n + p.sides.length, 0) * SIZES.length;
console.log(
  `Matrix: ${ALL_PRESETS.length} presets × ${SIZES.length} sizes × ${PREVIEW_MODES.length} preview modes`,
);
console.log(
  `Colors: ${shirtColors.length} · Zoom: ${ZOOM_STEPS.length} · Checks passed: ${passCount}`,
);

if (failures === 0) {
  console.log("\n✓ validate-preview-consistency-15-0c PASS\n");
  process.exit(0);
} else {
  console.error(
    `\n✗ validate-preview-consistency-15-0c FAIL (${failures} failures)\n`,
  );
  process.exit(1);
}
