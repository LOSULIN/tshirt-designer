/**
 * Phase 71.3 — ZIP Bundle Export Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/export-zip-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProductExportInput } from "@/lib/export/product-export";
import {
  buildZipExportRuntimeCompareLog,
  resolveZipExportPipelineContext,
  resolveZipExportRuntimeInput,
} from "./export-zip-runtime";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import { resolveEffectiveExportGeometryVersion } from "./export-runtime-snapshot";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/export-zip-runtime.ts";
const SIDES = ["front", "back"] as const;

const FORBIDDEN_ADAPTER_IMPORTS = [
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*product-factory-anchor/,
  /resolveGeometryRuntimeSnapshot\(/,
  /resolveExportRuntimeSnapshot\(/,
  /resolveGeometryRuntimePhotoBridge\(/,
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

function scanAdapterIsolation(): string[] {
  const abs = join(ROOT, ADAPTER_PATH);
  if (!existsSync(abs)) return [`${ADAPTER_PATH} missing`];
  const source = readFileSync(abs, "utf8");
  const violations: string[] = [];
  for (const pattern of FORBIDDEN_ADAPTER_IMPORTS) {
    if (pattern.test(source)) {
      violations.push(`${ADAPTER_PATH} forbidden: ${pattern}`);
    }
  }
  return violations;
}

function sampleInput(side: (typeof SIDES)[number]): ProductExportInput {
  return {
    layers: [],
    side,
    size: "M",
    shirtColor: "white",
  };
}

for (const side of SIDES) {
  const input = sampleInput(side);

  const v1Context = resolveZipExportPipelineContext(
    input,
    DESIGNER_GEOMETRY_VERSION.V1,
  );
  assert(
    `V1 ${side} zip context.geometryVersion == V1`,
    v1Context.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
  );
  assert(`V1 ${side} snapshot undefined`, v1Context.snapshot === undefined);
  assert(`V1 ${side} photoBridge undefined`, v1Context.photoBridge === undefined);

  const v2Context = resolveZipExportPipelineContext(
    input,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  assert(
    `V2 ${side} zip context.geometryVersion == V2`,
    v2Context.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
  );
  assert(`V2 ${side} snapshot defined`, v2Context.snapshot != null);
  assert(`V2 ${side} photoBridge defined`, v2Context.photoBridge != null);

  const resolvedV1 = resolveZipExportRuntimeInput(input, v1Context);
  assert(
    `V1 ${side} resolved input carries pipelineContext`,
    resolvedV1.pipelineContext === v1Context,
  );
  assert(
    `V1 ${side} resolved geometryVersion == V1`,
    resolvedV1.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
  );

  const resolvedV2 = resolveZipExportRuntimeInput(input, v2Context);
  assert(
    `V2 ${side} resolved input carries pipelineContext`,
    resolvedV2.pipelineContext === v2Context,
  );

  const compareLog = buildZipExportRuntimeCompareLog(
    input,
    v1Context,
    v2Context,
  );
  assert(
    `V2 ${side} compare geometryVersionChanged`,
    compareLog.geometryVersionChanged,
  );
  assert(
    `V2 ${side} compare visualCompensationDeltaY != 0`,
    compareLog.visualCompensationDeltaY !== 0,
  );
}

// --- zip surface effective version (74.3 policy) ---
const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
};

assert(
  "dev V2 + preview on => zip effective V2 (exportRuntime.zip ignored)",
  resolveEffectiveExportGeometryVersion(v2State, "zip") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

const previewOffState = {
  ...v2State,
  preview: { designer: false, resultPanel: false },
};
assert(
  "dev V2 + preview off => zip effective V2 (policy)",
  resolveEffectiveExportGeometryVersion(previewOffState, "zip") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

const devZipOn = {
  ...v2State,
  exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, zip: true },
};
assert(
  "dev V2 + exportRuntime.zip ON => zip still V2 when preview on (toggle inert)",
  resolveEffectiveExportGeometryVersion(devZipOn, "zip") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

assert(
  "production locked => zip effective V2",
  resolveEffectiveExportGeometryVersion(devZipOn, "zip", {
    productionLocked: true,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- delegate-only adapter ---
const violations = scanAdapterIsolation();
assert("Adapter no geometry recompute", violations.length === 0);
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
}

// --- legacy input without context defaults to V2 (Phase 78) ---
const legacyResolved = resolveZipExportRuntimeInput(sampleInput("front"));
assert(
  "legacy input without context → V2 geometryVersion",
  legacyResolved.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- adapter delegates buildProductExportFiles ---
const adapterSource = readFileSync(join(ROOT, ADAPTER_PATH), "utf8");
assert(
  "adapter delegates buildProductExportFiles",
  adapterSource.includes("buildProductExportFiles("),
);
assert(
  "adapter delegates downloadProductExportBundle",
  adapterSource.includes("downloadProductExportBundle("),
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
