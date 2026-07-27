/**
 * Phase 73.1 — Runtime Forward Canonicalization regression.
 * Run: npx tsx lib/designer-geometry-v2/runtime-forward-canonicalization.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveArtworkRuntimeForwardFromEffectiveVersion,
  resolveEffectiveDownloadGeometryVersion,
  resolveLegacyInlineDownloadPipelineContext,
  resolveProductMockupRuntimeForwardFromEffectiveVersion,
  resolveZipRuntimeForwardFromEffectiveVersion,
  runtimeDownloadForwardsMatch,
} from "./runtime-download-forward";
import { resolveProofMockupRuntimeForwardFromEffectiveVersion } from "./product-mockup-submit-runtime";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const GEOMETRY_EXPORT_PATH = "lib/designer-geometry-v2/geometry-runtime-export.ts";
const DOWNLOAD_FORWARD_PATH = "lib/designer-geometry-v2/runtime-download-forward.ts";

const APPROVED_FORWARD_MODULES = [
  "lib/designer-geometry-v2/runtime-download-forward.ts",
  "lib/designer-geometry-v2/export-pdf-runtime.ts",
  "lib/designer-geometry-v2/export-zip-runtime.ts",
  "lib/designer-geometry-v2/export-pdf-submit-runtime.ts",
  "lib/designer-geometry-v2/product-mockup-submit-runtime.ts",
  "lib/designer-geometry-v2/export-pipeline-context.ts",
];

const RUNTIME_ENTRY_SCAN_PATHS = [
  "lib/designer-geometry-v2/geometry-runtime-export.ts",
  "lib/designer-geometry-v2/geometry-runtime-export-pdf.server.ts",
  "lib/proof-engine/generators/mockup-generator.ts",
  "lib/proof-engine/generate-proof.ts",
];

const FORBIDDEN_FORWARD_IMPORTS = [
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

const input = { side: "front" as const, size: "M" as const };

function assertForwardMatchesLegacy(
  label: string,
  forward: ReturnType<typeof resolveArtworkRuntimeForwardFromEffectiveVersion>,
  surface: "png" | "zip",
): void {
  const legacy = resolveLegacyInlineDownloadPipelineContext(
    input,
    DESIGNER_GEOMETRY_VERSION.V2,
    surface,
    { productionLocked: false },
  );
  assert(
    `${label} forward == previous inline path`,
    runtimeDownloadForwardsMatch(forward, {
      geometryVersion: legacy.geometryVersion,
      pipelineContext: legacy,
    }),
  );
}

// --- Artwork forward == inline ---
const artworkForward = resolveArtworkRuntimeForwardFromEffectiveVersion(
  input,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
assertForwardMatchesLegacy("Artwork", artworkForward, "png");

// --- Mockup forward == inline ---
const mockupForward = resolveProductMockupRuntimeForwardFromEffectiveVersion(
  input,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
assertForwardMatchesLegacy("Mockup", mockupForward, "png");

// --- ZIP forward == inline ---
const zipForward = resolveZipRuntimeForwardFromEffectiveVersion(
  input,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
assertForwardMatchesLegacy("ZIP", zipForward, "zip");

// --- Artwork == Mockup (same png surface) ---
assert(
  "Artwork forward == Mockup forward (png surface)",
  runtimeDownloadForwardsMatch(artworkForward, mockupForward),
);

// --- Submit mockup download parity ---
const submitMockupForward = resolveProofMockupRuntimeForwardFromEffectiveVersion(
  { size: "M" },
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: false },
);
const submitFrontContext =
  submitMockupForward.pipelineContextBySide?.front;
assert(
  "Download mockup forward == submit mockup forward (front)",
  submitFrontContext != null &&
    runtimeDownloadForwardsMatch(mockupForward, {
      geometryVersion: submitMockupForward.geometryVersion,
      pipelineContext: submitFrontContext,
    }),
);

// --- Production lock (Phase 78: no V1 override) ---
assert(
  "production lock => V2 effective version",
  resolveEffectiveDownloadGeometryVersion(DESIGNER_GEOMETRY_VERSION.V2, {
    productionLocked: true,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);
const prodForward = resolveArtworkRuntimeForwardFromEffectiveVersion(
  input,
  DESIGNER_GEOMETRY_VERSION.V2,
  { productionLocked: true },
);
assert(
  "production lock => V2 pipeline context",
  prodForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- Dev V2 effective version (74.3 policy) ---
assert(
  "dev V2 effective version => V2 forward",
  artworkForward.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- geometry-runtime-export orchestration only ---
const geometryExportSource = readFileSync(
  join(ROOT, GEOMETRY_EXPORT_PATH),
  "utf8",
);
assert(
  "geometry-runtime-export has no resolveExportPipelineContext",
  !geometryExportSource.includes("resolveExportPipelineContext("),
);
assert(
  "geometry-runtime-export uses resolveArtworkRuntimeForwardFromEffectiveVersion",
  geometryExportSource.includes(
    "resolveArtworkRuntimeForwardFromEffectiveVersion(",
  ),
);
assert(
  "geometry-runtime-export uses resolveProductMockupRuntimeForwardFromEffectiveVersion",
  geometryExportSource.includes(
    "resolveProductMockupRuntimeForwardFromEffectiveVersion(",
  ),
);
assert(
  "geometry-runtime-export uses resolveZipRuntimeForwardFromEffectiveVersion",
  geometryExportSource.includes("resolveZipRuntimeForwardFromEffectiveVersion("),
);

// --- forward module delegate only ---
const forwardViolations = scanForbidden(
  DOWNLOAD_FORWARD_PATH,
  FORBIDDEN_FORWARD_IMPORTS,
);
assert("download forward delegate only / no geometry recompute", forwardViolations.length === 0);
if (forwardViolations.length > 0) {
  for (const violation of forwardViolations) {
    console.error(`  ${violation}`);
  }
}

const forwardSource = readFileSync(join(ROOT, DOWNLOAD_FORWARD_PATH), "utf8");
assert(
  "download forward delegates resolveExportPipelineContext",
  forwardSource.includes("resolveExportPipelineContext("),
);
assert(
  "download forward delegates resolveZipExportPipelineContext",
  forwardSource.includes("resolveZipExportPipelineContext("),
);

// --- runtime entry scan: no direct pipeline context outside approved modules ---
for (const entryPath of RUNTIME_ENTRY_SCAN_PATHS) {
  const source = readFileSync(join(ROOT, entryPath), "utf8");
  const isApproved = APPROVED_FORWARD_MODULES.includes(entryPath);
  if (!isApproved && source.includes("resolveExportPipelineContext(")) {
    assert(`${entryPath} does not call resolveExportPipelineContext directly`, false);
  } else {
    assert(`${entryPath} runtime entry uses forward only`, true);
  }
}

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
