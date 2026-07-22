/**
 * Phase 72.4 — Product Mockup Submit Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/product-mockup-submit-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  proofMockupRuntimeForwardsMatch,
  resolveProofMockupRuntimeForward,
  resolveProofMockupRuntimeForwardFromEffectiveVersion,
  shouldUseProofProductMockupRuntime,
} from "./product-mockup-submit-runtime";
import {
  resolveProductMockupRuntimePlacement,
} from "./product-mockup-runtime";
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
const FORWARD_PATH = "lib/designer-geometry-v2/product-mockup-submit-runtime.ts";
const RENDER_PATH = "lib/designer-geometry-v2/product-mockup-submit-render.ts";
const MOCKUP_GENERATOR_PATH = "lib/proof-engine/generators/mockup-generator.ts";
const CLIENT_PATH = "lib/proof-engine/client.ts";
const GENERATE_ARTIFACTS_PATH = "lib/proof-engine/generate-artifacts.ts";

const FORBIDDEN_ADAPTER_IMPORTS = [
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
const missingForward = resolveProofMockupRuntimeForward(order);
assert(
  "missing runtime context => geometryVersion V1",
  missingForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);
assert(
  "missing runtime context => legacy path (not product runtime)",
  !shouldUseProofProductMockupRuntime(missingForward),
);

// --- production lock => V1 ---
const v2MockupOnContext = resolveProofSubmitRuntimeContext(
  {
    ...createDefaultGeometryRuntimeState(),
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, png: true },
  },
  { productionLocked: false },
);

const prodForward = resolveProofMockupRuntimeForward(order, v2MockupOnContext, {
  productionLocked: true,
});
assert(
  "production lock => V1 forward",
  prodForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1 &&
    !shouldUseProofProductMockupRuntime(prodForward),
);

const prodNormalized = normalizeProofSubmitRuntimeContext(v2MockupOnContext, {
  productionLocked: true,
});
assert(
  "normalize production => effective mockup V1",
  prodNormalized.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- dev V2 mockup toggle ON ---
const submitForward = resolveProofMockupRuntimeForward(order, v2MockupOnContext, {
  productionLocked: false,
});
assert(
  "dev mockup toggle ON => V2 forward",
  submitForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2 &&
    shouldUseProofProductMockupRuntime(submitForward),
);

const downloadForward = resolveProofMockupRuntimeForwardFromEffectiveVersion(
  order,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
assert(
  "submit mockup forward == download mockup forward",
  proofMockupRuntimeForwardsMatch(submitForward, downloadForward),
);

// --- placement delegates ProductMockupRuntime ---
const frontContext = submitForward.pipelineContextBySide?.front;
assert(
  "V2 forward => front pipeline context",
  frontContext?.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

const calibration = JSON.parse(
  readFileSync(join(ROOT, "public/products/UA35001/calibration.json"), "utf8"),
);
const productInput = {
  calibration,
  side: "front" as const,
  mockupVisualScale: 1,
  canvasWidth: 1024,
  canvasHeight: 1536,
};

const submitPlacement = resolveProductMockupRuntimePlacement(
  frontContext,
  productInput,
  "M",
);
const downloadPlacement = resolveProductMockupRuntimePlacement(
  downloadForward.pipelineContextBySide?.front,
  productInput,
  "M",
);
assert(
  "submit/download placement rect match",
  submitPlacement.placementRect?.x === downloadPlacement.placementRect?.x &&
    submitPlacement.placementRect?.y === downloadPlacement.placementRect?.y,
);

// --- wiring ---
const mockupGeneratorSource = readFileSync(
  join(ROOT, MOCKUP_GENERATOR_PATH),
  "utf8",
);
const clientSource = readFileSync(join(ROOT, CLIENT_PATH), "utf8");
const generateArtifactsSource = readFileSync(
  join(ROOT, GENERATE_ARTIFACTS_PATH),
  "utf8",
);
assert(
  "mockup-generator uses resolveProofMockupRuntimeForward",
  mockupGeneratorSource.includes("resolveProofMockupRuntimeForward("),
);
assert(
  "mockup-generator uses renderProofSubmitProductMockupPng",
  mockupGeneratorSource.includes("renderProofSubmitProductMockupPng("),
);
assert(
  "mockup-generator retains legacy renderMockupPreviewPng fallback",
  mockupGeneratorSource.includes("renderMockupPreviewPng("),
);
assert(
  "prepareProofSubmission accepts proofRuntimeContext",
  clientSource.includes("proofRuntimeContext?: ProofSubmitRuntimeContext"),
);
assert(
  "generate-artifacts passes proofRuntimeContext to mockups",
  generateArtifactsSource.includes("proofRuntimeContext,"),
);
assert(
  "generate-artifacts uses resolveProofMockupRuntimeForward for cache fingerprint",
  generateArtifactsSource.includes("resolveProofMockupRuntimeForward("),
);

// --- forward resolver isolation ---
const forwardViolations = scanForbidden(FORWARD_PATH, FORBIDDEN_ADAPTER_IMPORTS);
assert("forward delegate only / no geometry recompute", forwardViolations.length === 0);
if (forwardViolations.length > 0) {
  for (const violation of forwardViolations) {
    console.error(`  ${violation}`);
  }
}

const forwardSource = readFileSync(join(ROOT, FORWARD_PATH), "utf8");
const renderSource = readFileSync(join(ROOT, RENDER_PATH), "utf8");
assert(
  "forward delegates resolveExportPipelineContext",
  forwardSource.includes("resolveExportPipelineContext("),
);
assert(
  "render delegates renderProductMockupOnProduct",
  renderSource.includes("renderProductMockupOnProduct("),
);
assert(
  "render delegates shadow compare via buildProductMockupRuntimeCompareLogForTest",
  renderSource.includes("buildProductMockupRuntimeCompareLogForTest("),
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
