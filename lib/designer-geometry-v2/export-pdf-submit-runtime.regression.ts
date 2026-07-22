/**
 * Phase 72.3 — PDF Submit Runtime Cutover regression.
 * Run: npx tsx lib/designer-geometry-v2/export-pdf-submit-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyProofPdfRuntimeForward,
  proofPdfRuntimeForwardsMatch,
  resolveProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
} from "./export-pdf-submit-runtime";
import { resolvePdfExportRuntimeLayout } from "./export-pdf-runtime";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import {
  normalizeProofSubmitRuntimeContext,
  resolveProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const CUTOVER_PATH = "lib/designer-geometry-v2/export-pdf-submit-runtime.ts";
const GENERATE_PROOF_PATH = "lib/proof-engine/generate-proof.ts";
const GEOMETRY_EXPORT_PATH = "lib/designer-geometry-v2/geometry-runtime-export-pdf.server.ts";

const FORBIDDEN_CUTOVER_IMPORTS = [
  /resolveGeometryRuntimeSnapshot\(/,
  /resolveExportRuntimeSnapshot\(/,
  /resolveGeometryRuntimePhotoBridge\(/,
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*product-factory-anchor/,
  /buildGeometryProfile/,
  /buildProductMaster/,
  /resolveDesignerPreviewLayout\(/,
];

let pass = true;
const checks: string[] = [];

function assert(label: string, condition: boolean): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    checks.push(`PASS: ${label}`);
    console.log(`PASS: ${label}`);
  }
}

function scanForbidden(sourcePath: string, patterns: RegExp[]): string[] {
  const abs = join(ROOT, sourcePath);
  if (!existsSync(abs)) return [`${sourcePath} missing`];
  const source = readFileSync(abs, "utf8");
  const violations: string[] = [];
  for (const pattern of patterns) {
    if (pattern.test(source)) {
      violations.push(`${sourcePath} forbidden: ${pattern}`);
    }
  }
  return violations;
}

const order = { size: "M" as const };

// --- missing runtime context => V1 ---
const missingForward = resolveProofPdfRuntimeForward(order);
assert(
  "missing runtime context => geometryVersion V1",
  missingForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);
assert(
  "missing runtime context => no pipelineContextBySide",
  missingForward.pipelineContextBySide == null,
);

// --- production lock => V1 ---
const v2PdfOnContext = resolveProofSubmitRuntimeContext(
  {
    ...createDefaultGeometryRuntimeState(),
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, pdf: true },
  },
  { productionLocked: false },
);

const prodForward = resolveProofPdfRuntimeForward(order, v2PdfOnContext, {
  productionLocked: true,
});
assert(
  "production lock => V1 forward",
  prodForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1 &&
    prodForward.pipelineContextBySide == null,
);

const prodNormalized = normalizeProofSubmitRuntimeContext(v2PdfOnContext, {
  productionLocked: true,
});
assert(
  "normalize production => effective pdf V1",
  prodNormalized.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- submit PDF == download PDF (same pipelineContext) ---
const submitForward = resolveProofPdfRuntimeForward(order, v2PdfOnContext, {
  productionLocked: false,
});
const downloadForward = resolveProofPdfRuntimeForwardFromEffectiveVersion(
  order,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
assert(
  "submit forward == download forward (V2 pdf toggle ON)",
  proofPdfRuntimeForwardsMatch(submitForward, downloadForward),
);
assert(
  "submit/download V2 => front snapshot artworkStage",
  submitForward.pipelineContextBySide?.front?.geometry?.artworkStage.top ===
    downloadForward.pipelineContextBySide?.front?.geometry?.artworkStage.top,
);

// --- placement via export-pdf-runtime (delegate only) ---
const frontLayoutSubmit = resolvePdfExportRuntimeLayout(
  "front",
  submitForward.pipelineContextBySide?.front,
);
const frontLayoutDownload = resolvePdfExportRuntimeLayout(
  "front",
  downloadForward.pipelineContextBySide?.front,
);
assert(
  "submit/download layout printArea.top match",
  frontLayoutSubmit.printArea.topPx === frontLayoutDownload.printArea.topPx,
);
assert(
  "submit/download layout collarBottomPx match",
  frontLayoutSubmit.collarBottomPx === frontLayoutDownload.collarBottomPx,
);

// --- applyProofPdfRuntimeForward wires generateProofPdf input ---
const applied = applyProofPdfRuntimeForward(
  {
    order: {
      order_id: "test",
      gender: "child-male",
      active_side: "front",
      shirt_color: "white",
      size: "M",
      layers_by_template: {},
    },
    version: 1,
  },
  submitForward,
);
assert(
  "apply forward sets geometryVersion",
  applied.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "apply forward sets pipelineContextBySide.front",
  applied.pipelineContextBySide?.front?.geometryVersion ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

// --- wiring: generate-proof uses export-pdf-submit-runtime ---
const generateProofSource = readFileSync(join(ROOT, GENERATE_PROOF_PATH), "utf8");
assert(
  "generateProofDocuments uses resolveProofPdfRuntimeForward",
  generateProofSource.includes("resolveProofPdfRuntimeForward("),
);
assert(
  "generateProofDocuments uses maybeLogProofSubmitPdfRuntimeCompare",
  generateProofSource.includes("maybeLogProofSubmitPdfRuntimeCompare("),
);
assert(
  "generateProofDocuments does not call resolveProofSubmitPdfRuntimeForward directly from proof-submit-runtime-context",
  !generateProofSource.includes('from "@/lib/designer-geometry-v2/proof-submit-runtime-context"') ||
    !generateProofSource.includes("resolveProofSubmitPdfRuntimeForward"),
);

const geometryExportSource = readFileSync(join(ROOT, GEOMETRY_EXPORT_PATH), "utf8");
const clientExportSource = readFileSync(
  join(ROOT, "lib/designer-geometry-v2/geometry-runtime-export.ts"),
  "utf8",
);
assert(
  "download PDF uses resolveProofPdfRuntimeForwardFromEffectiveVersion",
  geometryExportSource.includes(
    "resolveProofPdfRuntimeForwardFromEffectiveVersion(",
  ),
);
assert(
  "download PDF uses applyProofPdfRuntimeForward",
  geometryExportSource.includes("applyProofPdfRuntimeForward("),
);
assert(
  "client geometry-runtime-export does not import generateProofPdf",
  !clientExportSource.includes("generateProofPdf"),
);

// --- cutover module isolation ---
const violations = scanForbidden(CUTOVER_PATH, FORBIDDEN_CUTOVER_IMPORTS);
assert("cutover no geometry recompute / no designer-layout", violations.length === 0);
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
}

const cutoverSource = readFileSync(join(ROOT, CUTOVER_PATH), "utf8");
assert(
  "cutover delegates resolvePdfExportPipelineContext",
  cutoverSource.includes("resolvePdfExportPipelineContext("),
);
assert(
  "cutover delegates normalizeProofSubmitRuntimeContext",
  cutoverSource.includes("normalizeProofSubmitRuntimeContext("),
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
