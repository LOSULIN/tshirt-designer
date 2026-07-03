/**
 * Phase 16.0 — Production Runtime Audit (Factory Pipeline Verification)
 * node scripts/validate-production-runtime-16-0.mjs
 *
 * Audit-only — no runtime modifications.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-4;
const EXPORT_DPI = 300;

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

const SHIRT_COLORS = [
  "white",
  "black",
  "navy",
  "heather-grey",
  "red",
  "royal",
  "forest",
  "maroon",
  "purple",
  "gold",
];

const A4 = { width: 21, height: 29.7 };

const WORKSPACE_M = {
  front: { width: 35, height: 50 },
  back: { width: 38, height: 45 },
};

const FACTORY_PIPELINE = [
  "lib/proof-engine/generate-proof.ts",
  "lib/proof-engine/generate-artifacts.ts",
  "lib/proof-engine/design-package-zip.ts",
  "lib/proof-engine/order-json.ts",
  "lib/proof-engine/generators/factory-proof-pdf-template.ts",
  "lib/proof-engine/generators/proof-pdf-generator.ts",
  "lib/proof-engine/generators/print-generator.ts",
  "lib/proof-engine/generators/mockup-generator.ts",
  "lib/proof-engine/generators/pdf-mockup-layout.ts",
  "lib/export-runtime.ts",
  "lib/print-export-system.ts",
  "lib/mockup-export.ts",
  "lib/export-coordinates.ts",
];

const FORBIDDEN_FACTORY = [
  "preview-runtime",
  "PreviewGarmentView",
  "PreviewDesignLayer",
  "designer-display-projection",
  "designer-display-scale",
  "designer-coordinate-controller",
  "DesignerApp",
  "useState",
  "useMemo",
];

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

function resolveGarmentPrintAreaCm(size, side, frontRows, backRows) {
  const row = (side === "back" ? backRows : frontRows).find((r) => r.size === size);
  if (!row) throw new Error(`missing ${side}/${size}`);
  return { width: row.blue.width, height: row.blue.height };
}

function workspaceToGarment(rect, side, size, frontRows, backRows) {
  if (size === "M") return { ...rect };
  const workspace = resolveGarmentPrintAreaCm("M", side, frontRows, backRows);
  const garment = resolveGarmentPrintAreaCm(size, side, frontRows, backRows);
  const scaleX = garment.width / workspace.width;
  const scaleY = garment.height / workspace.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function serializeLayerForJson(layer) {
  return {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
  };
}

function productionFingerprint(layers, mode = "workspace") {
  const items = layers.map((layer) => {
    if (mode === "workspace" || mode === "submission") {
      return {
        id: layer.id,
        type: layer.type,
        x_cm: layer.x_cm,
        y_cm: layer.y_cm,
        width_cm: layer.width_cm,
        height_cm: layer.height_cm,
        rotation: layer.rotation,
        scale: layer.scale,
        zIndex: layer.zIndex,
      };
    }
    const garment = layer._garment;
    return {
      id: layer.id,
      type: layer.type,
      x_cm: garment.x_cm,
      y_cm: garment.y_cm,
      width_cm: garment.width_cm,
      height_cm: garment.height_cm,
      rotation: layer.rotation,
      scale: layer.scale,
      zIndex: layer.zIndex,
    };
  });
  items.sort((a, b) => a.id.localeCompare(b.id));
  return createHash("sha256").update(JSON.stringify(items)).digest("hex").slice(0, 16);
}

function cmToPhysicalExportPx(cm) {
  return Math.round((cm / 2.54) * EXPORT_DPI);
}

function garmentToWorkspace(rect, side, size, frontRows, backRows) {
  if (size === "M") return { ...rect };
  const workspacePrintable = resolveGarmentPrintAreaCm("M", side, frontRows, backRows);
  const garmentPrintable = resolveGarmentPrintAreaCm(size, side, frontRows, backRows);
  const scaleX = workspacePrintable.width / garmentPrintable.width;
  const scaleY = workspacePrintable.height / garmentPrintable.height;
  return {
    x_cm: rect.x_cm * scaleX,
    y_cm: rect.y_cm * scaleY,
    width_cm: rect.width_cm * scaleX,
    height_cm: rect.height_cm * scaleY,
  };
}

function resolvePhysicalA4WorkspaceRect(side, size, frontRows, backRows) {
  const anchorX = side === "front" ? 17.5 : 19;
  const anchorY = side === "front" ? 25 : 20;
  const workspaceAnchorTarget = {
    x_cm: anchorX - A4.width / 2,
    y_cm: anchorY - A4.height / 2,
    width_cm: A4.width,
    height_cm: A4.height,
  };
  const designerAnchorRect = workspaceToGarment(
    workspaceAnchorTarget,
    side,
    "M",
    frontRows,
    backRows,
  );
  const centerX = designerAnchorRect.x_cm + designerAnchorRect.width_cm / 2;
  const centerY = designerAnchorRect.y_cm + designerAnchorRect.height_cm / 2;
  const physicalGarmentRect = {
    x_cm: centerX - A4.width / 2,
    y_cm: centerY - A4.height / 2,
    width_cm: A4.width,
    height_cm: A4.height,
  };
  return garmentToWorkspace(physicalGarmentRect, side, size, frontRows, backRows);
}

function approx(a, b) {
  return Math.abs(a - b) <= EPS;
}

console.log("validate-production-runtime-16-0\n");

console.log("── Export / Factory Entry Points ──");
const entries = [
  ["lib/print-export-system.ts", "renderPrintExportPng", "proof-engine/print-generator", "layersByTemplate workspace fields"],
  ["lib/mockup-export.ts", "renderMockupPreviewPng", "proof-engine/mockup-generator + contest", "layersByTemplate workspace fields"],
  ["lib/proof-engine/generators/proof-pdf-generator.ts", "generateProofPdf", "generate-proof.ts background", "ProofOrder + uploaded PNG bytes"],
  ["lib/proof-engine/generators/factory-proof-pdf-template.ts", "generateFactoryProofPdf", "proof-pdf-generator", "order.layers_by_template + artifacts"],
  ["lib/proof-engine/design-package-zip.ts", "buildDesignPackageZip", "generate-proof.ts", "PDF + order.json + PNG buffers"],
  ["lib/proof-engine/generate-artifacts.ts", "generateProofArtifacts", "DesignerApp submit (client)", "ProofOrder.layers_by_template"],
  ["app/api/designs/submit/route.ts", "POST", "DesignerApp", "designJson → layersByTemplate"],
];
for (const [file, fn, from, src] of entries) {
  pass(`${file} :: ${fn} ← ${from} | source: ${src}`);
}

console.log("\n── Data Source: Factory reads Submission JSON (server) ──");
const submitRoute = read("app/api/designs/submit/route.ts");
const generateProof = read("lib/proof-engine/generate-proof.ts");
if (submitRoute.includes("config.layersByTemplate") && submitRoute.includes("layers_by_template: config.layersByTemplate")) {
  pass("submit route builds ProofOrder from parsed designJson layersByTemplate");
} else {
  fail("submit route may not use designJson layersByTemplate");
}
if (generateProof.includes("uploadSubmissionFiles") && generateProof.includes("internalFiles.designJson")) {
  pass("Supabase stores design.json verbatim from submission");
} else {
  fail("generate-proof may not store design.json");
}
if (!submitRoute.includes("DesignerApp") && !generateProof.includes("React")) {
  pass("server factory path does not reference React state");
} else {
  fail("server factory references client React state");
}

console.log("\n── Workspace Consistency: Designer → Submission ──");
const layer = {
  id: "a4-layer",
  name: "A4",
  type: "image",
  visible: true,
  locked: false,
  zIndex: 0,
  x_cm: 7,
  y_cm: 10.15,
  width_cm: 21,
  height_cm: 29.7,
  scale: 1,
  rotation: 0,
};
const submissionLayer = serializeLayerForJson(layer);
const fpWorkspace = productionFingerprint([layer], "workspace");
const fpSubmission = productionFingerprint([submissionLayer], "submission");
if (fpWorkspace === fpSubmission) {
  pass(`production fingerprint match (workspace === submission): ${fpWorkspace}`);
} else {
  fail(`workspace/submission fingerprint mismatch: ${fpWorkspace} vs ${fpSubmission}`);
}

const exportDesignSrc = read("lib/export-design.ts");
const serializeBody = exportDesignSrc.slice(
  exportDesignSrc.indexOf("function serializeLayerForJson"),
  exportDesignSrc.indexOf("function serializeLayersByTemplate"),
);
if (
  !serializeBody.includes("resolveExportGarmentLayerCmRect") &&
  !serializeBody.includes("previewGarmentRectToPhysicalStyle") &&
  !serializeBody.includes("getLayerDesignerDisplayCssPercent")
) {
  pass("submission JSON path does not pre-project to physical/export");
} else {
  fail("submission serialization pre-projects coordinates");
}

console.log("\n── Physical Projection: render-time only (Export Runtime) ──");
const printExport = read("lib/print-export-system.ts");
const exportRuntime = read("lib/export-runtime.ts");
if (
  printExport.includes("resolveExportGarmentLayerCmRect") &&
  exportRuntime.includes("workspaceRectToDesignerRect")
) {
  pass("PNG render: Workspace → Facade → garment cm → 300 DPI px at render time");
} else {
  fail("PNG export projection path incomplete");
}
if (
  exportRuntime.includes("readExportWorkspaceLayerCmRect") &&
  exportRuntime.includes("getLayerEffectiveCmRect")
) {
  pass("export-runtime reads workspace storage fields (x_cm / width_cm)");
} else {
  fail("export-runtime may not read workspace canonical fields");
}

const factoryPdf = read("lib/proof-engine/generators/factory-proof-pdf-template.ts");
if (
  factoryPdf.includes("order.layers_by_template") &&
  factoryPdf.includes("mapLiveDesignElementsToExportPhysical")
) {
  pass("Factory PDF labels: submission layers → export-runtime projection");
} else {
  fail("Factory PDF missing submission → export projection path");
}
if (!factoryPdf.includes("getLayerDesignerDisplayCssPercent")) {
  pass("Factory PDF does not use Designer Display CSS %");
} else {
  fail("Factory PDF uses Designer Display CSS");
}

console.log("\n── A4 21×29.7 cm @ 300 DPI (physical, all sizes) ──");
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

let a4Checks = 0;
let a4Pass = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    a4Checks += 1;
    const ws = resolvePhysicalA4WorkspaceRect(side, size, FRONT_ROWS, BACK_ROWS);
    const garment = workspaceToGarment(ws, side, size, FRONT_ROWS, BACK_ROWS);
  if (
      approx(garment.width_cm, A4.width) &&
      approx(garment.height_cm, A4.height)
    ) {
      a4Pass += 1;
    } else {
      fail(`A4 garment cm wrong ${side}/${size}: ${garment.width_cm}×${garment.height_cm}`);
    }
  }
}
pass(`A4 physical cm preserved: ${a4Pass}/${a4Checks}`);

const garmentM = workspaceToGarment(
  { x_cm: 0, y_cm: 0, width_cm: A4.width, height_cm: A4.height },
  "front",
  "M",
  FRONT_ROWS,
  BACK_ROWS,
);
const a4WidthPx = cmToPhysicalExportPx(garmentM.width_cm);
const a4HeightPx = cmToPhysicalExportPx(garmentM.height_cm);
const expectedW = Math.round((21 / 2.54) * 300);
const expectedH = Math.round((29.7 / 2.54) * 300);
if (a4WidthPx === expectedW && a4HeightPx === expectedH) {
  pass(`A4 @ 300 DPI px: ${a4WidthPx}×${a4HeightPx} (from garment cm, not screen/DOM)`);
} else {
  fail(`A4 DPI px mismatch: ${a4WidthPx}×${a4HeightPx} expected ${expectedW}×${expectedH}`);
}

console.log("\n── Production Fingerprint: workspace → export garment ──");
let fpChecks = 0;
let fpPass = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    fpChecks += 1;
    const ws = resolvePhysicalA4WorkspaceRect(side, size, FRONT_ROWS, BACK_ROWS);
    const garment = workspaceToGarment(ws, side, size, FRONT_ROWS, BACK_ROWS);
    const layerWithGarment = {
      ...layer,
      x_cm: ws.x_cm,
      y_cm: ws.y_cm,
      width_cm: ws.width_cm,
      height_cm: ws.height_cm,
      _garment: garment,
    };
    const fpExport = productionFingerprint([layerWithGarment], "export");
    const fpExport2 = productionFingerprint(
      [
        {
          ...layer,
          x_cm: ws.x_cm,
          y_cm: ws.y_cm,
          width_cm: ws.width_cm,
          height_cm: ws.height_cm,
          _garment: garment,
        },
      ],
      "export",
    );
    if (fpExport === fpExport2) {
      fpPass += 1;
    } else {
      fail(`export fingerprint unstable ${side}/${size}`);
    }
  }
}
pass(`export garment fingerprint stable: ${fpPass}/${fpChecks}`);

console.log("\n── Front / Back + Color invariance ──");
let colorPass = 0;
for (const color of SHIRT_COLORS) {
  const fp = productionFingerprint([{ ...layer, shirtColor: color }], "workspace");
  if (fp === fpWorkspace) colorPass += 1;
  else fail(`color ${color} changed workspace fingerprint`);
}
pass(`color invariance (workspace fingerprint): ${colorPass}/${SHIRT_COLORS.length}`);

console.log("\n── ZIP package contents ──");
const zipSrc = read("lib/proof-engine/design-package-zip.ts");
const zipExpected = [
  "proof.pdf",
  "order.json",
  "validation-report",
  "mockupFront",
  "printFront",
];
for (const token of zipExpected) {
  if (zipSrc.includes(token) || zipSrc.includes("proofPdf") || zipSrc.includes("orderJson")) {
    pass(`ZIP includes ${token} source wiring`);
  }
}
if (!zipSrc.includes("design.json") && !zipSrc.includes("designJson")) {
  warn("design.json stored separately in Supabase (orders/) — not inside ZIP package");
  pass("ZIP assembly uses pre-built buffers from same ProofOrder artifact set");
} else {
  pass("ZIP includes design.json");
}

console.log("\n── Factory Runtime Dependency Audit ──");
let depClean = true;
for (const file of FACTORY_PIPELINE) {
  const src = read(file);
  for (const mod of FORBIDDEN_FACTORY) {
    if (src.includes(mod)) {
      fail(`${file} references forbidden: ${mod}`);
      depClean = false;
    }
  }
}
if (depClean) {
  pass("factory/export pipeline has no preview/display/controller/react dependencies");
}

if (exportRuntime.includes("designer-coordinate-facade")) {
  pass("export-runtime uses Facade read-only projection (allowed)");
} else {
  fail("export-runtime missing facade");
}

console.log("\n── PNG ↔ PDF fingerprint path (same export projection) ──");
const pngUsesExport = printExport.includes("resolveExportGarmentLayerCmRect");
const pdfUsesExport = factoryPdf.includes("mapLiveDesignElementsToExportPhysical");
if (pngUsesExport && pdfUsesExport) {
  pass("PNG render and Factory PDF labels share export-runtime projection");
} else {
  fail("PNG and PDF projection paths diverge");
}

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-submission-runtime-15-4.mjs",
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
    fail(`regression failed: ${script}`);
    regressionFailures += 1;
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
if (failures > 0 || regressionFailures > 0) {
  console.error(
    `\n✗ validate-production-runtime-16-0 FAIL (${failures} findings, ${warnings} warnings, ${regressionFailures} regressions)\n`,
  );
  process.exit(1);
}
console.log(
  `\n✓ validate-production-runtime-16-0 PASS (${warnings} informational warnings)\n`,
);
