/**
 * Phase 72.2 — Proof Submit Runtime Context regression.
 * Run: npx tsx lib/designer-geometry-v2/proof-submit-runtime-context.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createDefaultProofSubmitRuntimeContext,
  normalizeProofSubmitRuntimeContext,
  parseProofSubmitRuntimeContext,
  parseProofSubmitRuntimeContextFromFormData,
  PROOF_RUNTIME_CONTEXT_FORM_FIELD,
  resolveProofSubmitRuntimeContext,
  serializeProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import {
  proofPdfRuntimeForwardsMatch,
  resolveProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
} from "./export-pdf-submit-runtime";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const BRIDGE_PATH = "lib/designer-geometry-v2/proof-submit-runtime-context.ts";

const FORBIDDEN_BRIDGE_IMPORTS = [
  /resolveGeometryRuntimeSnapshot\(/,
  /resolveExportRuntimeSnapshot\(/,
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*product-factory-anchor/,
  /buildGeometryProfile/,
  /buildProductMaster/,
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

function scanBridgeIsolation(): string[] {
  const abs = join(ROOT, BRIDGE_PATH);
  if (!existsSync(abs)) return [`${BRIDGE_PATH} missing`];
  const source = readFileSync(abs, "utf8");
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_BRIDGE_IMPORTS) {
    if (pattern.test(source)) {
      violations.push(`${BRIDGE_PATH} forbidden: ${pattern}`);
    }
  }
  return violations;
}

// --- missing context => V1 ---
const missingForward = resolveProofPdfRuntimeForward({ size: "M" });
assert(
  "missing context => PDF geometryVersion V1",
  missingForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);
assert(
  "missing context => no pipelineContextBySide",
  missingForward.pipelineContextBySide == null,
);

const defaultCtx = createDefaultProofSubmitRuntimeContext();
assert(
  "default context all effective versions V1",
  defaultCtx.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V1 &&
    defaultCtx.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V1 &&
    defaultCtx.effectiveVersions.print === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- dev runtime resolves versions from toggles ---
const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
};

const devPdfOff = resolveProofSubmitRuntimeContext(v2State, {
  productionLocked: false,
});
assert(
  "dev V2 state pdf toggle OFF => effective pdf V1",
  devPdfOff.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V1,
);

const devPdfOn = resolveProofSubmitRuntimeContext(
  {
    ...v2State,
    exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, pdf: true },
  },
  { productionLocked: false },
);
assert(
  "dev V2 state pdf toggle ON => effective pdf V2",
  devPdfOn.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "dev print effective version always V1",
  devPdfOn.effectiveVersions.print === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- production submit => byte compatible ---
const prodClient = resolveProofSubmitRuntimeContext(
  {
    ...v2State,
    exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, pdf: true },
  },
  { productionLocked: true },
);
assert(
  "production client resolve => all V1",
  prodClient.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1 &&
    prodClient.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V1,
);

const prodForward = resolveProofPdfRuntimeForward(
  { size: "M" },
  devPdfOn,
  { productionLocked: true },
);
assert(
  "production forward spoofs client V2 => PDF V1",
  prodForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1 &&
    prodForward.pipelineContextBySide == null,
);

// --- FormData roundtrip ---
const serialized = serializeProofSubmitRuntimeContext(devPdfOn);
assert(
  "serialized context has no snapshot field",
  !serialized.includes("snapshot") && !serialized.includes("artworkStage"),
);

const parsed = parseProofSubmitRuntimeContext(serialized);
assert("parse roundtrip geometryVersion", parsed?.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2);
assert(
  "parse roundtrip effective pdf V2",
  parsed?.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);

const formData = new FormData();
formData.append(PROOF_RUNTIME_CONTEXT_FORM_FIELD, serialized);
const fromForm = parseProofSubmitRuntimeContextFromFormData(formData);
assert(
  "FormData roundtrip effective pdf V2",
  fromForm?.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- server resolves correct per-side PDF context ---
const pdfForward = resolveProofPdfRuntimeForward(
  { size: "M" },
  devPdfOn,
  { productionLocked: false },
);
assert(
  "PDF forward V2 => geometryVersion V2",
  pdfForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "PDF forward V2 => front/back pipeline contexts",
  pdfForward.pipelineContextBySide?.front?.geometryVersion ===
    DESIGNER_GEOMETRY_VERSION.V2 &&
    pdfForward.pipelineContextBySide?.back?.geometryVersion ===
      DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "PDF forward V2 => snapshot present on contexts",
  pdfForward.pipelineContextBySide?.front?.snapshot != null &&
    pdfForward.pipelineContextBySide?.back?.geometry != null,
);

// --- invalid parse => undefined => V1 forward ---
assert(
  "invalid JSON => undefined",
  parseProofSubmitRuntimeContext("{bad") === undefined,
);
const invalidForward = resolveProofPdfRuntimeForward(
  { size: "M" },
  normalizeProofSubmitRuntimeContext(parseProofSubmitRuntimeContext("{bad")),
);
assert(
  "invalid parse normalize => V1 forward",
  invalidForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- bridge isolation ---
const violations = scanBridgeIsolation();
assert("bridge no direct geometry recompute", violations.length === 0);
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
}

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
