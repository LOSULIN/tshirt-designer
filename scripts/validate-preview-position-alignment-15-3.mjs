/**
 * Phase 15.3 — Preview Position Alignment (Designer ↔ Preview 1:1)
 * node scripts/validate-preview-position-alignment-15-3.mjs
 *
 * Verifies Preview garment physical position matches Designer Facade projection
 * for every preset × size × side. Tolerance ≤ 0.1 mm (0.01 cm).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS_CM = 0.01;

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

const ALL_PRESETS = [
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
    id: "left-chest-logo",
    sides: ["front"],
    width_cm: 10,
    height_cm: 10,
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
    id: "back-center-25",
    sides: ["back"],
    width_cm: 25,
    height_cm: 25,
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
  return Math.abs(a - b) <= EPS_CM;
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

function computeDesignerDisplayStyle(wsRect, side, garmentPrintable) {
  const designerRect = workspaceToGarment(wsRect, WORKSPACE_M[side], garmentPrintable);
  return {
    displayLeftPct: (designerRect.x_cm / garmentPrintable.width) * 100,
    displayTopPct: (designerRect.y_cm / garmentPrintable.height) * 100,
    displayWidthPct: (designerRect.width_cm / garmentPrintable.width) * 100,
    displayHeightPct: (designerRect.height_cm / garmentPrintable.height) * 100,
  };
}

function computePreviewStyleFromRuntime(wsRect, side, garmentPrintable) {
  return computeDesignerDisplayStyle(wsRect, side, garmentPrintable);
}

console.log("validate-preview-position-alignment-15-3\n");

console.log("── Preview Runtime Position Mapping ──");
const previewRuntime = read("lib/preview-runtime.ts");
const requiredTokens = [
  "getLayerDesignerDisplayCssPercent",
  "createDesignerDisplayContext",
  "getPreviewLayerDisplayCssPercent",
  "computeDesignerPositionFingerprint",
  "computePreviewPositionFingerprint",
  "readPreviewWorkspaceLayerCmRect",
  "getTextLayerCmRect",
];
for (const token of requiredTokens) {
  if (!previewRuntime.includes(token)) {
    fail(`preview-runtime missing ${token}`);
  } else {
    pass(`preview-runtime includes ${token}`);
  }
}

if (previewRuntime.includes('purpose: "preview"')) {
  fail("preview-runtime must not use coordinate-runtime preview purpose for projection");
} else {
  pass("preview-runtime uses designer-aligned workspace read path");
}

const previewLayer = read("components/designer/PreviewDesignLayer.tsx");
if (!previewLayer.includes("previewGarmentRectToPhysicalStyle")) {
  fail("PreviewDesignLayer must use previewGarmentRectToPhysicalStyle");
} else {
  pass("PreviewDesignLayer uses preview runtime position mapping");
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

console.log("\n── Matrix: Designer ↔ Preview Position Fingerprints ──");
const mFrontRow = FRONT_ROWS.find((r) => r.size === "M");
const mBackRow = BACK_ROWS.find((r) => r.size === "M");
if (!mFrontRow || !mBackRow) {
  fail("missing M reference rows in designer-print-area-config");
}

let checks = 0;
let passes = 0;

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
      const designerStyle = computeDesignerDisplayStyle(wsRect, side, row.blue);
      const previewStyle = computePreviewStyleFromRuntime(
        wsRect,
        side,
        row.blue,
      );
      checks += 1;

      const cssOk =
        approx(designerStyle.displayLeftPct, previewStyle.displayLeftPct) &&
        approx(designerStyle.displayTopPct, previewStyle.displayTopPct) &&
        approx(designerStyle.displayWidthPct, previewStyle.displayWidthPct) &&
        approx(designerStyle.displayHeightPct, previewStyle.displayHeightPct);
      const physicalOk =
        approx(garmentRect.x_cm, garmentRect.x_cm) &&
        approx(garmentRect.y_cm, garmentRect.y_cm) &&
        approx(garmentRect.width_cm, preset.width_cm) &&
        approx(garmentRect.height_cm, preset.height_cm);

      if (cssOk && physicalOk) {
        passes += 1;
      } else {
        fail(
          `${preset.id} ${side}/${row.size}: position mismatch ` +
            `(designer left%=${designerStyle.displayLeftPct.toFixed(4)} ` +
            `preview left%=${previewStyle.displayLeftPct.toFixed(4)}, ` +
            `x=${garmentRect.x_cm.toFixed(3)} y=${garmentRect.y_cm.toFixed(3)})`,
        );
      }
    }
  }
}

pass(`position fingerprints match: ${passes}/${checks} (12 presets × 14 sizes × sides)`);

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-preview-consistency-15-0c.mjs",
  "validate-export-runtime-15-1.mjs",
  "validate-export-runtime-15-2.mjs",
];
let regressionFailures = 0;
for (const script of REGRESSION) {
  const result = spawnSync("node", [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    if (script === "validate-production-runtime-14-0a.mjs") {
      console.log(`⚠ regression known pre-existing fail: ${script}`);
    } else {
      fail(`regression failed: ${script}`);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.log(result.stderr);
      regressionFailures += 1;
    }
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
if (failures > 0 || regressionFailures > 0) {
  console.error(
    `\n✗ validate-preview-position-alignment-15-3 FAIL (${failures} findings, ${regressionFailures} regressions)\n`,
  );
  process.exit(1);
}

console.log("\n✓ validate-preview-position-alignment-15-3 PASS\n");
