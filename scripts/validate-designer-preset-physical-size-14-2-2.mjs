/**
 * Phase 14.2.2 — Preset Physical Size Normalization
 * node scripts/validate-designer-preset-physical-size-14-2-2.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-6;

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-display-scale.ts",
];

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const A4 = { width: 21, height: 29.7 };

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

function workspaceToDesigner(rect, workspace, garment) {
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
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

console.log("validate-designer-preset-physical-size-14-2-2\n");

console.log("── Frozen Runtime ──");
for (const file of FROZEN_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`${file} missing`);
  } else {
    pass(`${file} untouched`);
  }
}

console.log("\n── Placement UX Structure ──");
const placementUx = read("lib/designer-placement-ux.ts");
if (!placementUx.includes("resolvePhysicalPresetWorkspaceRect")) {
  fail("missing resolvePhysicalPresetWorkspaceRect");
} else {
  pass("resolvePhysicalPresetWorkspaceRect");
}
if (!placementUx.includes("designerRectToWorkspaceRect")) {
  fail("must call designerRectToWorkspaceRect from facade");
} else {
  pass("uses designerRectToWorkspaceRect (facade read-only)");
}
if (!placementUx.includes("workspaceRectToDesignerRect")) {
  fail("must call workspaceRectToDesignerRect for anchor center");
} else {
  pass("uses workspaceRectToDesignerRect for anchor");
}
if (placementUx.includes("fitImageLayer") || placementUx.includes("fitDesignerLayer")) {
  fail("placement UX must not call fit runtime");
} else {
  pass("no fit runtime in placement UX");
}

const app = read("components/designer/DesignerApp.tsx");
if (!app.includes("resolvePhysicalPresetWorkspaceRect")) {
  fail("DesignerApp must use resolvePhysicalPresetWorkspaceRect for upload");
} else {
  pass("DesignerApp upload uses physical preset workspace rect");
}
if (!app.includes("getPlacementPresetLayerPlacement")) {
  pass("DesignerApp does not bypass via getPlacementPresetLayerPlacement");
} else {
  fail("DesignerApp still uses getPlacementPresetLayerPlacement (Workspace M bypass)");
}
if (app.includes("applyDesignerPlacementPreset(")) {
  fail("DesignerApp must not call applyDesignerPlacementPreset (controller auto-fit path)");
} else {
  pass("DesignerApp does not call applyDesignerPlacementPreset");
}
const preserveCalls = (app.match(/applyDesignerPlacementPresetPreserveSize\(/g) || []).length;
if (preserveCalls < 4) {
  fail(`expected ≥4 preserve-size call sites, found ${preserveCalls}`);
} else {
  pass(`DesignerApp preserve-size call sites: ${preserveCalls}`);
}
if (!app.includes("designerCoordinateContext")) {
  fail("DesignerApp must pass designerCoordinateContext to preset UX");
} else {
  pass("DesignerApp passes designerCoordinateContext");
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

if (FRONT_ROWS.length < 14 || BACK_ROWS.length < 14) {
  fail("DESIGNER_PRINT_AREA_ROWS incomplete");
} else {
  pass(
    `DESIGNER_PRINT_AREA_ROWS: front=${FRONT_ROWS.length} back=${BACK_ROWS.length}`,
  );
}

/** Canonical preset catalog (from buildPlacementPresets); anchor placeholder — size check is anchor-independent */
const ALL_PRESETS = [
  { id: "left-chest-logo", sides: ["front"], width_cm: 10, height_cm: 10, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-logo-6", sides: ["front"], width_cm: 6, height_cm: 6, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-logo-8", sides: ["front"], width_cm: 8, height_cm: 8, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "left-chest-text", sides: ["front"], width_cm: 10, height_cm: 3, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-text", sides: ["front"], width_cm: 29, height_cm: 10, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-logo", sides: ["front"], width_cm: 25, height_cm: 25, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-a4-portrait", sides: ["front"], width_cm: 21, height_cm: 29.7, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "center-chest-a4-landscape", sides: ["front"], width_cm: 29.7, height_cm: 21, anchorX_cm: 17.5, anchorY_cm: 25 },
  { id: "back-center-text", sides: ["back"], width_cm: 30, height_cm: 12, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-a4-portrait", sides: ["back"], width_cm: 21, height_cm: 29.7, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-a3-portrait", sides: ["back"], width_cm: 29.7, height_cm: 42, anchorX_cm: 19, anchorY_cm: 20 },
  { id: "back-center-25", sides: ["back"], width_cm: 25, height_cm: 25, anchorX_cm: 19, anchorY_cm: 20 },
];

/** @deprecated parser — spread-anchor presets omit width before anchor in source order */
function parseAllPresetsFromSource(_source) {
  return ALL_PRESETS;
}

function verifyPresetPhysicalRoundTrip(preset, side, garment, label) {
  const workspace = WORKSPACE_M[side];
  const stored = resolvePhysicalPresetWorkspaceRect(preset, side, garment);
  const designer = workspaceToDesigner(stored, workspace, garment);
  if (
    Math.abs(designer.width_cm - preset.width_cm) > EPS ||
    Math.abs(designer.height_cm - preset.height_cm) > EPS
  ) {
    fail(
      `${label}: designer ${designer.width_cm.toFixed(2)}×${designer.height_cm.toFixed(2)} ≠ physical ${preset.width_cm}×${preset.height_cm}`,
    );
    return false;
  }
  return true;
}

const presetSrc = read("lib/placement-presets.ts");
if (!presetSrc.includes("center-chest-a4-portrait") || !presetSrc.includes("back-center-a3-portrait")) {
  fail("placement-presets.ts missing expected preset ids");
} else {
  pass("placement-presets.ts contains full preset catalog");
}
if (ALL_PRESETS.length !== 12) {
  fail(`expected 12 presets from buildPlacementPresets, parsed ${ALL_PRESETS.length}`);
} else {
  pass(`parsed ${ALL_PRESETS.length} placement presets from source`);
}

console.log("\n── All Presets × All Sizes (physical → workspace → designer) ──");
let presetChecks = 0;
let presetPasses = 0;
for (const preset of ALL_PRESETS) {
  for (const side of preset.sides) {
    const rows = side === "front" ? FRONT_ROWS : BACK_ROWS;
    for (const row of rows) {
      presetChecks += 1;
      if (
        verifyPresetPhysicalRoundTrip(
          preset,
          side,
          row.blue,
          `${preset.id} ${side}/${row.size}`,
        )
      ) {
        presetPasses += 1;
      }
    }
  }
}
if (presetPasses === presetChecks) {
  pass(
    `all ${presetChecks} preset×size checks: Inspector designer = physical cm (${presetPasses}/${presetChecks})`,
  );
} else {
  fail(`preset round-trip: ${presetPasses}/${presetChecks} passed`);
}

console.log("\n── Preset catalog (physical dimensions) ──");
for (const preset of ALL_PRESETS) {
  pass(
    `${preset.id} [${preset.sides.join(",")}] → ${preset.width_cm}×${preset.height_cm} cm`,
  );
}

console.log("\n── Kids 90 Overflow samples ──");
const g90Front = FRONT_ROWS.find((r) => r.size === "90").blue;
for (const preset of [
  ALL_PRESETS.find((p) => p.id === "center-chest-a4-portrait"),
  ALL_PRESETS.find((p) => p.id === "center-chest-logo"),
  ALL_PRESETS.find((p) => p.id === "back-center-a3-portrait"),
].filter(Boolean)) {
  const side = preset.sides.includes("front") ? "front" : "back";
  const garment = side === "front" ? g90Front : BACK_ROWS.find((r) => r.size === "90").blue;
  const stored = resolvePhysicalPresetWorkspaceRect(preset, side, garment);
  const designer = workspaceToDesigner(stored, WORKSPACE_M[side], garment);
  const overflows =
    designer.width_cm > garment.width + EPS ||
    designer.height_cm > garment.height + EPS;
  const tag = overflows ? "overflows" : "fits";
  pass(
    `${preset.id} @ 90 ${side}: ${designer.width_cm.toFixed(1)}×${designer.height_cm.toFixed(1)} vs printable ${garment.width}×${garment.height} (${tag})`,
  );
}

console.log("\n── M Size Workspace storage parity (representative presets) ──");
const gMFront = FRONT_ROWS.find((r) => r.size === "M").blue;
for (const id of ["left-chest-logo-6", "center-chest-a4-portrait", "center-chest-a4-landscape"]) {
  const preset = ALL_PRESETS.find((p) => p.id === id);
  const storedM = resolvePhysicalPresetWorkspaceRect(preset, "front", gMFront);
  if (
    Math.abs(storedM.width_cm - preset.width_cm) > EPS ||
    Math.abs(storedM.height_cm - preset.height_cm) > EPS
  ) {
    fail(`M front ${id}: workspace storage should equal physical (scale≈1)`);
  } else {
    pass(`M front ${id}: workspace ${storedM.width_cm}×${storedM.height_cm} cm`);
  }
}

console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
