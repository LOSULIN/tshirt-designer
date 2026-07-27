/**
 * Phase 74.3 — Runtime Effective Version Policy regression.
 * Run: npx tsx lib/designer-geometry-v2/runtime-effective-version-policy.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveEffectiveGeometryVersion } from "./geometry-runtime-state";
import {
  resolveProofMockupRuntimeForward,
  resolveProofMockupRuntimeForwardFromEffectiveVersion,
} from "./product-mockup-submit-runtime";
import {
  resolveProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
} from "./export-pdf-submit-runtime";
import {
  createDefaultProofSubmitRuntimeContext,
  normalizeProofSubmitRuntimeContext,
  resolveProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import {
  resolveArtworkRuntimeForwardFromEffectiveVersion,
  resolveProductMockupRuntimeForwardFromEffectiveVersion,
  resolveZipRuntimeForwardFromEffectiveVersion,
} from "./runtime-download-forward";
import {
  resolveRuntimePolicyEffectiveGeometryVersion,
} from "./runtime-effective-version-policy";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const POLICY_PATH = "lib/designer-geometry-v2/runtime-effective-version-policy.ts";
const SUBMIT_CONTEXT_PATH =
  "lib/designer-geometry-v2/proof-submit-runtime-context.ts";
const GEOMETRY_STATE_PATH = "lib/designer-geometry-v2/geometry-runtime-state.ts";

const FORBIDDEN_POLICY_IMPORTS = [
  /resolveGeometryRuntimeSnapshot\(/,
  /resolveExportRuntimeSnapshot\(/,
  /resolveExportPipelineContext\(/,
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*product-factory-anchor/,
  /buildGeometryProfile/,
  /buildProductMaster/,
];

const USER_FACING_SURFACES = [
  "designer",
  "resultPanel",
  "png",
  "zip",
  "pdf",
] as const;

const DOWNLOAD_INPUT = { side: "front" as const, size: "M" as const };
const ORDER = { size: "M" as const };

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

const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES },
};

const policyVersion = resolveRuntimePolicyEffectiveGeometryVersion(v2State, {
  productionLocked: false,
});
assert(
  "default V2 state + preview on => policy V2",
  policyVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

for (const surface of USER_FACING_SURFACES) {
  const previewVersion = resolveEffectiveGeometryVersion(v2State, surface, {
    productionLocked: false,
  });
  assert(
    `preview/download surface ${surface} == policy V2`,
    previewVersion === policyVersion,
  );
}

const submitContext = resolveProofSubmitRuntimeContext(v2State, {
  productionLocked: false,
});
assert(
  "submit pdf effective == policy V2",
  submitContext.effectiveVersions.pdf === policyVersion,
);
assert(
  "submit mockup effective == policy V2",
  submitContext.effectiveVersions.mockup === policyVersion,
);
assert(
  "submit pdf effective == preview designer",
  submitContext.effectiveVersions.pdf ===
    resolveEffectiveGeometryVersion(v2State, "designer", {
      productionLocked: false,
    }),
);
assert(
  "submit mockup effective == download png",
  submitContext.effectiveVersions.mockup ===
    resolveEffectiveGeometryVersion(v2State, "png", {
      productionLocked: false,
    }),
);

// exportRuntime off must not block user-facing V2 when preview is on (74.2 fix)
const exportOffState = {
  ...v2State,
  exportRuntime: { png: false, zip: false, pdf: false, email: false },
};
assert(
  "exportRuntime off + preview on => policy still V2",
  resolveRuntimePolicyEffectiveGeometryVersion(exportOffState, {
    productionLocked: false,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "exportRuntime off => submit mockup/pdf V2",
  resolveProofSubmitRuntimeContext(exportOffState, { productionLocked: false })
    .effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2 &&
    resolveProofSubmitRuntimeContext(exportOffState, { productionLocked: false })
      .effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);

// preview off => still V2 (Phase 78: policy follows state.geometryVersion)
const previewOffState = {
  ...v2State,
  preview: { designer: false, resultPanel: false },
};
const previewOffPolicy = resolveRuntimePolicyEffectiveGeometryVersion(
  previewOffState,
  { productionLocked: false },
);
assert("preview off => policy V2", previewOffPolicy === DESIGNER_GEOMETRY_VERSION.V2);
assert(
  "preview off => submit V2",
  resolveProofSubmitRuntimeContext(previewOffState, { productionLocked: false })
    .effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);

// production lock — no longer forces V1 (Phase 78)
assert(
  "production lock => policy V2",
  resolveRuntimePolicyEffectiveGeometryVersion(v2State, {
    productionLocked: true,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);
const prodSubmit = resolveProofSubmitRuntimeContext(v2State, {
  productionLocked: true,
});
assert(
  "production lock => submit all V2",
  prodSubmit.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2 &&
    prodSubmit.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2,
);
const prodNormalized = normalizeProofSubmitRuntimeContext(
  resolveProofSubmitRuntimeContext(v2State, { productionLocked: false }),
  { productionLocked: true },
);
assert(
  "normalize production => submit V2",
  prodNormalized.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2,
);

// missing runtime context => V2 forwards (default state)
const missingPdf = resolveProofPdfRuntimeForward(ORDER);
const missingMockup = resolveProofMockupRuntimeForward(ORDER);
assert(
  "missing context => submit pdf V2",
  missingPdf.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "missing context => submit mockup V2",
  missingMockup.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

// download forwards use effective version from caller — parity when version matches policy
const downloadMockupForward = resolveProductMockupRuntimeForwardFromEffectiveVersion(
  DOWNLOAD_INPUT,
  policyVersion,
  { productionLocked: false },
);
const submitMockupForward = resolveProofMockupRuntimeForwardFromEffectiveVersion(
  ORDER,
  policyVersion,
  { productionLocked: false },
);
assert(
  "download/submit mockup forward same version",
  downloadMockupForward.geometryVersion === submitMockupForward.geometryVersion,
);

const downloadPdfForward = resolveProofPdfRuntimeForwardFromEffectiveVersion(
  ORDER,
  policyVersion,
  { productionLocked: false },
);
const submitPdfForward = resolveProofPdfRuntimeForward(ORDER, submitContext, {
  productionLocked: false,
});
assert(
  "download/submit pdf forward same version",
  downloadPdfForward.geometryVersion === submitPdfForward.geometryVersion,
);

// wiring
const submitSource = readFileSync(join(ROOT, SUBMIT_CONTEXT_PATH), "utf8");
const stateSource = readFileSync(join(ROOT, GEOMETRY_STATE_PATH), "utf8");
assert(
  "proof-submit-runtime-context uses resolveRuntimePolicyEffectiveGeometryVersion",
  submitSource.includes("resolveRuntimePolicyEffectiveGeometryVersion("),
);
assert(
  "geometry-runtime-state delegates user-facing to policy",
  stateSource.includes("resolveRuntimePolicyEffectiveGeometryVersion("),
);

const policyViolations = scanForbidden(POLICY_PATH, FORBIDDEN_POLICY_IMPORTS);
assert("policy delegate only / no geometry recompute", policyViolations.length === 0);

// email unchanged — still gated by exportRuntime.email
const emailOff = resolveEffectiveGeometryVersion(
  { ...v2State, exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, email: false } },
  "email",
  { productionLocked: false },
);
assert("email surface still uses exportRuntime.email gate", emailOff === DESIGNER_GEOMETRY_VERSION.V1);

// default context V2 (Phase 78)
const defaultCtx = createDefaultProofSubmitRuntimeContext();
assert(
  "default geometry state => submit V2",
  defaultCtx.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
