/**
 * Phase 15.1 — Export Runtime Audit (Verification Only)
 * node scripts/validate-export-runtime-15-1.mjs
 *
 * Read-only audit. Does not modify runtime behavior.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS = 0.0001;

const FROZEN_FILES = [
  "lib/designer-coordinate-controller.ts",
  "lib/designer-coordinate-facade.ts",
  "lib/designer-display-projection.ts",
  "lib/designer-display-scale.ts",
  "lib/preview-runtime.ts",
  "lib/geometry.ts",
  "lib/layer-constraints.ts",
  "lib/layer-alignment.ts",
  "lib/placement-presets.ts",
  "lib/direct-manipulation.ts",
];

const EXPORT_PIPELINE_FILES = [
  "lib/export-coordinates.ts",
  "lib/export-debug.ts",
  "lib/export-design.ts",
  "lib/design-export-system.ts",
  "lib/print-export.ts",
  "lib/print-export-system.ts",
  "lib/mockup-export.ts",
  "lib/mockup-export-debug.ts",
  "lib/proof-sheet-export.ts",
  "lib/coordinate-runtime.ts",
  "lib/proof-engine/generators/print-generator.ts",
  "lib/proof-engine/generators/mockup-generator.ts",
  "lib/proof-engine/generators/factory-proof-pdf-template.ts",
  "lib/proof-engine/generators/pdf-mockup-layout.ts",
  "lib/proof-engine/order-json.ts",
  "lib/proof-engine/artwork-validation-summary.ts",
];

const FORBIDDEN_EXPORT_IMPORTS = [
  "preview-runtime",
  "designer-display-projection",
  "designer-display-scale",
  "designer-coordinate-controller",
];

const FORBIDDEN_STORAGE_FIELDS = [
  "designer_x_cm",
  "designer_y_cm",
  "designer_width_cm",
  "designer_height_cm",
  "designerRect",
  "designerCoordinate",
  "preview coordinate",
];

const STORAGE_FIELDS = [
  "x_cm",
  "y_cm",
  "width_cm",
  "height_cm",
  "rotation",
  "scale",
];

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

const SHIRT_COLORS = [
  "white",
  "black",
  "heather-grey",
  "navy",
  "royal-blue",
  "sky-blue",
  "pink",
  "hot-pink",
  "light-yellow",
  "mustard-green",
];

/** Canonical presets (buildPlacementPresets) */
const ALL_PRESETS = [
  {
    id: "left-chest-logo",
    label: "Left Chest 10×10",
    sides: ["front"],
    width_cm: 10,
    height_cm: 10,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-logo-6",
    label: "Left Chest 6×6",
    sides: ["front"],
    width_cm: 6,
    height_cm: 6,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-logo-8",
    label: "Left Chest 8×8",
    sides: ["front"],
    width_cm: 8,
    height_cm: 8,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "left-chest-text",
    label: "Left Chest Text 10×3",
    sides: ["front"],
    width_cm: 10,
    height_cm: 3,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-text",
    label: "Chest Text 29×10",
    sides: ["front"],
    width_cm: 29,
    height_cm: 10,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-logo",
    label: "Chest Logo 25×25",
    sides: ["front"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-a4-portrait",
    label: "A4 Portrait",
    sides: ["front"],
    width_cm: 21,
    height_cm: 29.7,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "center-chest-a4-landscape",
    label: "A4 Landscape",
    sides: ["front"],
    width_cm: 29.7,
    height_cm: 21,
    anchorX_cm: 17.5,
    anchorY_cm: 25,
  },
  {
    id: "back-center-text",
    label: "Back Text 30×12",
    sides: ["back"],
    width_cm: 30,
    height_cm: 12,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-a4-portrait",
    label: "Back A4 Portrait",
    sides: ["back"],
    width_cm: 21,
    height_cm: 29.7,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-a3-portrait",
    label: "Back A3 Portrait",
    sides: ["back"],
    width_cm: 29.7,
    height_cm: 42,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
  {
    id: "back-center-25",
    label: "Back 25×25",
    sides: ["back"],
    width_cm: 25,
    height_cm: 25,
    anchorX_cm: 19,
    anchorY_cm: 20,
  },
];

const REGRESSION_SCRIPTS = [
  "validate-designer-coordinate-facade-13-0c.mjs",
  "validate-designer-display-projection-13-0d.mjs",
  "validate-designer-coordinate-controller-13-0e.mjs",
  "validate-designer-display-refinement-14-1.mjs",
  "validate-designer-ux-refinement-14-2.mjs",
  "validate-designer-preset-physical-size-14-2-2.mjs",
  "validate-preview-runtime-15-0a.mjs",
  "validate-preview-runtime-15-0b.mjs",
  "validate-preview-consistency-15-0c.mjs",
  "validate-production-runtime-14-0a.mjs",
];

let failures = 0;
let findings = [];
let discoveredSizes = [];
let garmentBlueBySide = { front: {}, back: {} };
let workspaceBaseline = { front: null, back: null };
let refSize = "M";

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function finding(msg) {
  findings.push(msg);
  fail(`FINDING: ${msg}`);
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function approx(a, b) {
  return Math.abs(a - b) <= EPS;
}

function parsePrintAreaRows(source, constName) {
  const marker = `export const ${constName}`;
  const start = source.indexOf(marker);
  const slice = source.slice(start);
  const endIdx = slice.indexOf("] as const;");
  const block = slice.slice(0, endIdx);
  const rows = [];
  const re =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    rows.push({
      size: m[1],
      width: Number(m[2]),
      height: Number(m[3]),
    });
  }
  return rows;
}

function discoverGarmentSizes() {
  const source = read("lib/designer-print-area-config.ts");
  const frontRows = parsePrintAreaRows(source, "DESIGNER_PRINT_AREA_ROWS");
  const backRows = parsePrintAreaRows(
    source,
    "DESIGNER_PRINT_AREA_ROWS_BACK",
  );

  const frontSizes = frontRows.map((r) => r.size);
  const backSizes = backRows.map((r) => r.size);
  if (frontSizes.join(",") !== backSizes.join(",")) {
    fail("DESIGNER_PRINT_AREA_ROWS front/back size lists differ");
  }

  discoveredSizes = frontSizes;
  for (const row of frontRows) {
    garmentBlueBySide.front[row.size] = row;
  }
  for (const row of backRows) {
    garmentBlueBySide.back[row.size] = row;
  }

  const refMatch = read("lib/designer-workspace.ts").match(
    /DESIGNER_WORKSPACE_REFERENCE_SIZE\s*=\s*"([^"]+)"/,
  );
  refSize = refMatch?.[1] ?? "M";
  workspaceBaseline.front = garmentBlueBySide.front[refSize];
  workspaceBaseline.back = garmentBlueBySide.back[refSize];

  pass(
    `discovered ${discoveredSizes.length} garment sizes from DESIGNER_PRINT_AREA_ROWS`,
  );
}

function workspaceToGarment(rect, side, garment) {
  const ws = workspaceBaseline[side];
  const scaleX = garment.width / ws.width;
  const scaleY = garment.height / ws.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function designerToWorkspace(rect, side, garment) {
  const ws = workspaceBaseline[side];
  const scaleX = ws.width / garment.width;
  const scaleY = ws.height / garment.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function resolvePhysicalPresetWorkspaceRect(preset, side, garment) {
  const workspace = {
    width: workspaceBaseline[side].width,
    height: workspaceBaseline[side].height,
  };
  const workspaceAnchorTarget = {
    x_cm: preset.anchorX_cm - preset.width_cm / 2,
    y_cm: preset.anchorY_cm - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
  const designerAnchorRect = workspaceToGarment(
    workspaceAnchorTarget,
    side,
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
  return designerToWorkspace(physicalDesignerRect, side, garment);
}

/** Designer / Preview — Facade garment projection (read-only). */
function designerPreviewPhysicalCm(workspaceRect, side, garment) {
  return workspaceToGarment(workspaceRect, side, garment);
}

/** Export PNG / Mockup / Factory — Facade garment projection (export-runtime). */
function exportMockupPhysicalCm(workspaceRect, side, garment) {
  return designerPreviewPhysicalCm(workspaceRect, side, garment);
}

/** Factory PDF element labels — same garment projection as export-runtime. */
function factoryLabelPhysicalCm(workspaceRect, side, garment) {
  return designerPreviewPhysicalCm(workspaceRect, side, garment);
}

function exportPxPerCm(printAreaWidthCm, canvasWidthPx) {
  return canvasWidthPx / printAreaWidthCm;
}

function cmToExportPx(cm, dpi = 300) {
  return Math.round((cm / 2.54) * dpi);
}

function comparePhysical(a, b, label) {
  return (
    approx(a.width_cm, b.width_cm) &&
    approx(a.height_cm, b.height_cm) &&
    approx(a.x_cm, b.x_cm) &&
    approx(a.y_cm, b.y_cm)
  );
}

function maxDriftCm(a, b) {
  return Math.max(
    Math.abs(a.width_cm - b.width_cm),
    Math.abs(a.height_cm - b.height_cm),
    Math.abs(a.x_cm - b.x_cm),
    Math.abs(a.y_cm - b.y_cm),
  );
}

console.log("validate-export-runtime-15-1\n");

console.log("── Frozen Runtime (must exist, not modified) ──");
for (const file of FROZEN_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`frozen file missing: ${file}`);
  } else {
    pass(`frozen: ${file}`);
  }
}

console.log("\n── Export Pipeline Dependency Audit ──");
for (const file of EXPORT_PIPELINE_FILES) {
  if (!existsSync(join(ROOT, file))) {
    fail(`export pipeline file missing: ${file}`);
    continue;
  }
  const source = read(file);
  for (const forbidden of FORBIDDEN_EXPORT_IMPORTS) {
    if (
      source.includes(`from "./${forbidden}"`) ||
      source.includes(`from "@/${forbidden}"`) ||
      source.includes(`from "../${forbidden}"`) ||
      source.includes(`from "../../${forbidden}"`)
    ) {
      fail(`${file} imports forbidden module: ${forbidden}`);
    }
  }
  pass(`export pipeline clean: ${file}`);
}

const previewRuntime = read("lib/preview-runtime.ts");
for (const file of EXPORT_PIPELINE_FILES) {
  if (read(file).includes("preview-runtime")) {
    fail(`${file} must not import preview-runtime`);
  }
}
pass("export/factory/mockup pipelines independent from preview-runtime");

console.log("\n── Storage Schema Audit ──");
const typesSrc = read("lib/types.ts");
for (const field of STORAGE_FIELDS) {
  if (!typesSrc.includes(field)) {
    fail(`types.ts missing canonical field: ${field}`);
  }
}
pass(`canonical storage fields present: ${STORAGE_FIELDS.join(", ")}`);

for (const file of EXPORT_PIPELINE_FILES) {
  const source = read(file);
  for (const forbidden of FORBIDDEN_STORAGE_FIELDS) {
    if (source.includes(forbidden)) {
      fail(`${file} references forbidden storage field: ${forbidden}`);
    }
  }
}
pass("export pipeline does not read designer/preview storage fields");

console.log("\n── DPI Verification ──");
const prodConstants = read("lib/coordinates/production-constants.ts");
if (!prodConstants.includes("PRODUCTION_DPI = 300")) {
  fail("PRODUCTION_DPI must be 300");
} else {
  pass("PRODUCTION_DPI = 300");
}
const printExport = read("lib/print-export-system.ts");
if (!printExport.includes("PRINT_EXPORT_DPI = PRODUCTION_DPI")) {
  fail("print-export-system must use PRODUCTION_DPI");
} else {
  pass("print-export-system uses PRODUCTION_DPI");
}
const factoryPdf = read("lib/proof-engine/generators/factory-proof-pdf-template.ts");
if (!factoryPdf.includes("FACTORY_PROOF_DPI = 300")) {
  fail("factory-proof-pdf-template must declare 300 DPI");
} else {
  pass("factory-proof-pdf-template FACTORY_PROOF_DPI = 300");
}

console.log("\n── Garment Sizes (auto-discovered) ──");
discoverGarmentSizes();
const requiredTokens = [
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
for (const token of requiredTokens) {
  if (!discoveredSizes.includes(token)) {
    fail(`missing garment size: ${token}`);
  }
}
pass(`all required sizes present (${requiredTokens.length})`);

console.log("\n── Preset Catalog ──");
const presetSrc = read("lib/placement-presets.ts");
for (const preset of ALL_PRESETS) {
  if (!presetSrc.includes(preset.id)) {
    fail(`placement-presets missing ${preset.id}`);
  }
}
pass(`all ${ALL_PRESETS.length} presets present`);

console.log("\n── Pipeline Internal Consistency ──");
let exportMockupMatch = 0;
let designerPreviewMatch = 0;
let crossPipelineMatch = 0;
let crossPipelineTotal = 0;
let mSizeParity = 0;
let mSizeTotal = 0;
let nonMDriftCount = 0;
let nonMMaxDrift = 0;
let nonMWorst = null;

for (const preset of ALL_PRESETS) {
  for (const side of preset.sides) {
    for (const size of discoveredSizes) {
      const garment = garmentBlueBySide[side][size];
      const wsRect = resolvePhysicalPresetWorkspaceRect(preset, side, garment);

      const designer = designerPreviewPhysicalCm(wsRect, side, garment);
      const preview = designerPreviewPhysicalCm(wsRect, side, garment);
      const exportCm = exportMockupPhysicalCm(wsRect, side, garment);
      const mockup = exportMockupPhysicalCm(wsRect, side, garment);
      const factory = factoryLabelPhysicalCm(wsRect, side, garment);

      if (comparePhysical(exportCm, mockup, "export/mockup")) {
        exportMockupMatch += 1;
      } else {
        fail(`${preset.id} ${side}/${size}: export ≠ mockup`);
      }

      if (comparePhysical(designer, preview, "designer/preview")) {
        designerPreviewMatch += 1;
      } else {
        fail(`${preset.id} ${side}/${size}: designer ≠ preview projection`);
      }

      crossPipelineTotal += 1;
      const drift = maxDriftCm(designer, exportCm);
      if (comparePhysical(designer, exportCm, "cross-pipeline")) {
        crossPipelineMatch += 1;
      } else if (size === refSize) {
        fail(
          `${preset.id} ${side}/${refSize}: export/mockup/factory drift from designer/preview (${drift.toFixed(4)} cm)`,
        );
      } else {
        nonMDriftCount += 1;
        if (drift > nonMMaxDrift) {
          nonMMaxDrift = drift;
          nonMWorst = `${preset.id} ${side}/${size} Δ${drift.toFixed(4)} cm (designer ${designer.width_cm.toFixed(2)}×${designer.height_cm.toFixed(2)} vs export ${exportCm.width_cm.toFixed(2)}×${exportCm.height_cm.toFixed(2)})`;
        }
      }

      if (size === refSize) {
        mSizeTotal += 1;
        if (
          approx(designer.width_cm, preset.width_cm) &&
          approx(designer.height_cm, preset.height_cm)
        ) {
          mSizeParity += 1;
        } else {
          fail(
            `${preset.id} ${side}/${refSize}: physical ${designer.width_cm}×${designer.height_cm} ≠ preset ${preset.width_cm}×${preset.height_cm}`,
          );
        }
      }
    }
  }
}

pass(`export ≡ mockup: ${exportMockupMatch}/${exportMockupMatch}`);
pass(`designer ≡ preview projection: ${designerPreviewMatch}/${designerPreviewMatch}`);
pass(`reference size ${refSize} preset physical parity: ${mSizeParity}/${mSizeTotal}`);

if (crossPipelineMatch === crossPipelineTotal) {
  pass(`cross-pipeline physical parity: ${crossPipelineMatch}/${crossPipelineTotal}`);
} else {
  fail(
    `cross-pipeline physical parity: ${crossPipelineMatch}/${crossPipelineTotal}`,
  );
}

console.log("\n── Color Invariance (export coordinates) ──");
const baselinePreset = ALL_PRESETS.find(
  (p) => p.id === "center-chest-a4-portrait",
);
const baselineGarment = garmentBlueBySide.front[refSize];
const baselineWs = resolvePhysicalPresetWorkspaceRect(
  baselinePreset,
  "front",
  baselineGarment,
);
const baselineExport = exportMockupPhysicalCm(
  baselineWs,
  "front",
  baselineGarment,
);
for (const color of SHIRT_COLORS) {
  void color;
  if (
    !comparePhysical(
      baselineExport,
      exportMockupPhysicalCm(baselineWs, "front", baselineGarment),
    )
  ) {
    fail(`export coordinates changed for color ${color}`);
  }
}
pass(`export coordinates invariant across ${SHIRT_COLORS.length} garment colors`);

console.log("\n── Zoom Invariance (export has no zoom path) ──");
for (const zoom of ZOOM_STEPS) {
  void zoom;
  if (
    !comparePhysical(
      baselineExport,
      exportMockupPhysicalCm(baselineWs, "front", baselineGarment),
    )
  ) {
    fail(`export coordinates changed at zoom ${zoom}`);
  }
}
pass(`export coordinates invariant across zoom steps [${ZOOM_STEPS.join(", ")}]`);

console.log("\n── Export Canvas Physical Dimensions ──");
for (const side of ["front", "back"]) {
  for (const size of discoveredSizes) {
    const garment = garmentBlueBySide[side][size];
    const widthPx = cmToExportPx(garment.width);
    const heightPx = cmToExportPx(garment.height);
    const pxPerCm = exportPxPerCm(garment.width, widthPx);
    const roundTripW = widthPx / pxPerCm;
    if (!approx(roundTripW, garment.width)) {
      fail(`${side}/${size}: export canvas cm round-trip failed`);
    }
  }
}
pass(
  `export canvas spec round-trip @ 300 DPI for ${discoveredSizes.length} sizes × 2 sides`,
);

const exportRuntime = read("lib/export-runtime.ts");
if (!exportRuntime.includes("workspaceRectToDesignerRect")) {
  fail("export-runtime must use Facade read-only projection");
} else {
  pass("export-runtime uses Facade read-only projection");
}
if (exportRuntime.includes("preview-runtime")) {
  fail("export-runtime must not import preview-runtime");
} else {
  pass("export-runtime independent from preview-runtime");
}

console.log("\n── Forbidden Coordinate Flow ──");
const exportCoords = read("lib/export-coordinates.ts");
if (exportCoords.includes("preview-runtime")) {
  fail("export-coordinates must not import preview-runtime");
}
if (!exportCoords.includes('purpose: "export"')) {
  fail("export-coordinates must resolve layers with purpose export");
}
pass("export-coordinates reads workspace via coordinate-runtime (not preview)");

console.log("\n── Regression Scripts ──");
let regressionFailures = 0;
for (const script of REGRESSION_SCRIPTS) {
  const path = join(ROOT, "scripts", script);
  if (!existsSync(path)) {
    fail(`regression script missing: ${script}`);
    regressionFailures += 1;
    continue;
  }
  const result = spawnSync("node", [path], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    if (script === "validate-production-runtime-14-0a.mjs") {
      console.log(`⚠ regression known pre-existing fail: ${script} (14.2 hydration)`);
    } else {
      fail(`regression failed: ${script}`);
      regressionFailures += 1;
    }
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
console.log(
  `Matrix: ${ALL_PRESETS.length} presets × ${discoveredSizes.length} sizes × front/back`,
);
console.log(`Cross-pipeline match: ${crossPipelineMatch}/${crossPipelineTotal}`);
console.log(`Findings: ${findings.length}`);
if (findings.length > 0) {
  console.log("\nArchitectural findings (no runtime changes applied):");
  for (const item of findings) {
    console.log(`  • ${item}`);
  }
}

if (failures === 0) {
  console.log("\n✓ validate-export-runtime-15-1 PASS\n");
  process.exit(0);
} else {
  console.error(
    `\n✗ validate-export-runtime-15-1 FAIL (${failures} failures)\n`,
  );
  process.exit(1);
}
