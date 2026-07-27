/**
 * Phase 78 — Runtime Default V2 regression.
 * Run: npx tsx lib/designer-geometry-v2/runtime-default-v2.regression.ts
 */
import {
  ACTIVE_DESIGNER_GEOMETRY_VERSION,
  DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import {
  createDefaultGeometryRuntimeState,
  resolveEffectiveGeometryVersion,
} from "./geometry-runtime-state";
import {
  resolveProofPdfRuntimeForward,
  resolveProofPdfRuntimeForwardFromEffectiveVersion,
} from "./export-pdf-submit-runtime";
import {
  resolveProofMockupRuntimeForward,
  resolveProofMockupRuntimeForwardFromEffectiveVersion,
} from "./product-mockup-submit-runtime";
import {
  createDefaultProofSubmitRuntimeContext,
  normalizeProofSubmitRuntimeContext,
  resolveProofSubmitRuntimeContext,
} from "./proof-submit-runtime-context";
import {
  resolveArtworkRuntimeForwardFromEffectiveVersion,
  resolveProductMockupRuntimeForwardFromEffectiveVersion,
} from "./runtime-download-forward";
import { resolveRuntimePolicyEffectiveGeometryVersion } from "./runtime-effective-version-policy";

const DOWNLOAD_INPUT = { side: "front" as const, size: "M" as const };
const ORDER = { size: "M" as const };
const SURFACES = [
  "designer",
  "resultPanel",
  "png",
  "zip",
  "pdf",
] as const;

let pass = true;

function assert(label: string, condition: boolean): void {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    console.log(`PASS: ${label}`);
  }
}

const defaultState = createDefaultGeometryRuntimeState();
assert(
  "createDefaultGeometryRuntimeState => V2",
  defaultState.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "ACTIVE_DESIGNER_GEOMETRY_VERSION => V2",
  ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V2,
);

const policyVersion = resolveRuntimePolicyEffectiveGeometryVersion(defaultState);
assert("default policy => V2", policyVersion === DESIGNER_GEOMETRY_VERSION.V2);

for (const surface of SURFACES) {
  assert(
    `${surface} effective => V2`,
    resolveEffectiveGeometryVersion(defaultState, surface) ===
      DESIGNER_GEOMETRY_VERSION.V2,
  );
}

assert(
  "production policy => V2",
  resolveRuntimePolicyEffectiveGeometryVersion(defaultState, {
    productionLocked: true,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);

for (const surface of SURFACES) {
  assert(
    `production ${surface} effective => V2`,
    resolveEffectiveGeometryVersion(defaultState, surface, {
      productionLocked: true,
    }) === DESIGNER_GEOMETRY_VERSION.V2,
  );
}

const submitContext = resolveProofSubmitRuntimeContext(defaultState, {
  productionLocked: true,
});
assert(
  "submit pdf effective => V2",
  submitContext.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "submit mockup effective => V2",
  submitContext.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2,
);

const defaultSubmit = createDefaultProofSubmitRuntimeContext();
assert(
  "default proof submit context => V2",
  defaultSubmit.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2 &&
    defaultSubmit.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2 &&
    defaultSubmit.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2,
);

const normalizedProd = normalizeProofSubmitRuntimeContext(
  resolveProofSubmitRuntimeContext(defaultState, { productionLocked: false }),
  { productionLocked: true },
);
assert(
  "normalize production preserves V2",
  normalizedProd.effectiveVersions.pdf === DESIGNER_GEOMETRY_VERSION.V2 &&
    normalizedProd.effectiveVersions.mockup === DESIGNER_GEOMETRY_VERSION.V2,
);

const downloadMockup = resolveProductMockupRuntimeForwardFromEffectiveVersion(
  DOWNLOAD_INPUT,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: true },
);
const downloadArtwork = resolveArtworkRuntimeForwardFromEffectiveVersion(
  DOWNLOAD_INPUT,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: true },
);
assert(
  "download mockup forward => V2",
  downloadMockup.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);
assert(
  "download artwork forward => V2",
  downloadArtwork.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

const submitPdf = resolveProofPdfRuntimeForward(ORDER, submitContext, {
  productionLocked: true,
});
const submitMockup = resolveProofMockupRuntimeForward(ORDER, submitContext, {
  productionLocked: true,
});
assert("submit pdf forward => V2", submitPdf.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2);
assert(
  "submit mockup forward => V2",
  submitMockup.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

const legacyState = {
  ...defaultState,
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
};
assert(
  "debug legacy V1 state => V1 policy",
  resolveRuntimePolicyEffectiveGeometryVersion(legacyState) ===
    DESIGNER_GEOMETRY_VERSION.V1,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"}`);
process.exit(pass ? 0 : 1);
