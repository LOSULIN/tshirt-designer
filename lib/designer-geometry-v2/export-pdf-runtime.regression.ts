/**
 * Phase 71.4 — PDF Export Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/export-pdf-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveProductPreviewVisualCompensationPdfOffsetY } from "@/lib/presentation/visual-compensation";
import {
  buildPdfExportRuntimeCompareLog,
  resolvePdfExportPipelineContext,
  resolvePdfExportRuntimeLayout,
  resolvePdfExportRuntimePresentationOffsetY,
} from "./export-pdf-runtime";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import { resolveEffectiveExportGeometryVersion } from "./export-runtime-snapshot";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/export-pdf-runtime.ts";
const TEMPLATE_PATH = "lib/proof-engine/generators/factory-proof-pdf-template.ts";
const SIDES = ["front", "back"] as const;
const REFERENCE_HEIGHT_PT = 420;

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

for (const side of SIDES) {
  const v1Context = resolvePdfExportPipelineContext({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  });
  assert(
    `V1 ${side} pdf context.geometryVersion == V1`,
    v1Context.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
  );
  assert(
    `V1 ${side} pdf context has no snapshot`,
    v1Context.snapshot == null && v1Context.geometry == null,
  );

  const v1RuntimeLayout = resolvePdfExportRuntimeLayout(side, v1Context);
  const v1RuntimeLayoutNoContext = resolvePdfExportRuntimeLayout(side);
  assert(
    `V1 ${side} PDF layout with context == without context`,
    v1RuntimeLayout.printArea.leftPx ===
      v1RuntimeLayoutNoContext.printArea.leftPx &&
      v1RuntimeLayout.printArea.topPx ===
        v1RuntimeLayoutNoContext.printArea.topPx &&
      v1RuntimeLayout.collarBottomPx === v1RuntimeLayoutNoContext.collarBottomPx,
  );

  const v1Presentation = resolvePdfExportRuntimePresentationOffsetY(
    side,
    REFERENCE_HEIGHT_PT,
    v1Context,
  );
  const legacyPresentation = resolveProductPreviewVisualCompensationPdfOffsetY(
    side,
    REFERENCE_HEIGHT_PT,
  );
  assert(
    `V1 ${side} presentation offset == legacy`,
    v1Presentation === legacyPresentation,
  );

  const v2Context = resolvePdfExportPipelineContext({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  assert(
    `V2 ${side} pdf context.geometryVersion == V2`,
    v2Context.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
  );
  assert(
    `V2 ${side} pdf context has snapshot + geometry`,
    v2Context.snapshot != null && v2Context.geometry != null,
  );

  const v2Layout = resolvePdfExportRuntimeLayout(side, v2Context);
  assert(
    `V2 ${side} printArea == snapshot artworkStage`,
    v2Layout.printArea.leftPx === v2Context.geometry!.artworkStage.left &&
      v2Layout.printArea.topPx === v2Context.geometry!.artworkStage.top &&
      v2Layout.printArea.widthPx === v2Context.geometry!.artworkStage.width &&
      v2Layout.printArea.heightPx === v2Context.geometry!.artworkStage.height,
  );

  const v2Presentation = resolvePdfExportRuntimePresentationOffsetY(
    side,
    REFERENCE_HEIGHT_PT,
    v2Context,
  );
  assert(
    `V2 ${side} presentation offset == runtime visualCompensation`,
    v2Presentation ===
      -(v2Context.visualCompensation.offsetYPercent / 100) *
        REFERENCE_HEIGHT_PT,
  );

  const compareLog = buildPdfExportRuntimeCompareLog(side);
  assert(
    `compare ${side} delta printAreaTopPx != 0 (front/back geometry differs from V1)`,
    side === "front"
      ? compareLog.delta.printAreaTopPx === 30
      : compareLog.delta.printAreaTopPx !== 0 || compareLog.delta.collarBottomPx !== 0,
  );
}

// --- pdf surface effective version (74.3 policy) ---
const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
};

assert(
  "dev V2 + preview on => pdf effective V2 (exportRuntime.pdf ignored)",
  resolveEffectiveExportGeometryVersion(v2State, "pdf") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

const previewOffState = {
  ...v2State,
  preview: { designer: false, resultPanel: false },
};
assert(
  "dev V2 + preview off => pdf effective V2 (policy)",
  resolveEffectiveExportGeometryVersion(previewOffState, "pdf") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

const devPdfOn = {
  ...v2State,
  exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, pdf: true },
};
assert(
  "dev V2 + exportRuntime.pdf ON => pdf still V2 when preview on (toggle inert)",
  resolveEffectiveExportGeometryVersion(devPdfOn, "pdf") ===
    DESIGNER_GEOMETRY_VERSION.V2,
);

// --- production lock fallback ---
const prodLocked = {
  ...devPdfOn,
  productionLocked: true,
};
assert(
  "production locked → V2 even when preview on",
  resolveEffectiveExportGeometryVersion(prodLocked, "pdf", {
    productionLocked: true,
  }) === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- adapter isolation ---
const violations = scanAdapterIsolation();
assert("Adapter no geometry recompute", violations.length === 0);
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
}

// --- template wires adapter ---
const templateSource = readFileSync(join(ROOT, TEMPLATE_PATH), "utf8");
assert(
  "factory-proof-pdf-template uses resolvePdfExportRuntimeLayout",
  templateSource.includes("resolvePdfExportRuntimeLayout("),
);
assert(
  "factory-proof-pdf-template uses resolvePdfExportRuntimePresentationOffsetY",
  templateSource.includes("resolvePdfExportRuntimePresentationOffsetY("),
);
assert(
  "factory-proof-pdf-template no direct resolveDesignerPreviewLayout",
  !templateSource.includes("resolveDesignerPreviewLayout("),
);

// --- adapter delegates mapDesignerLayoutToPdf ---
const adapterSource = readFileSync(join(ROOT, ADAPTER_PATH), "utf8");
assert(
  "adapter delegates mapDesignerLayoutToPdf",
  adapterSource.includes("mapDesignerLayoutToPdf("),
);
assert(
  "adapter delegates resolveDesignerPreviewLayout for V1",
  adapterSource.includes("resolveDesignerPreviewLayout("),
);

async function assertV1MatchesLegacyDesignerLayout(): Promise<void> {
  const { resolveDesignerPreviewLayout } = await import(
    "@/lib/proof-engine/designer-layout"
  );
  for (const side of SIDES) {
    const legacyLayout = resolveDesignerPreviewLayout(side);
    const v1RuntimeLayout = resolvePdfExportRuntimeLayout(side);
    assert(
      `V1 ${side} PDF layout == legacy resolveDesignerPreviewLayout`,
      v1RuntimeLayout.printArea.leftPx === legacyLayout.printArea.leftPx &&
        v1RuntimeLayout.printArea.topPx === legacyLayout.printArea.topPx &&
        v1RuntimeLayout.printArea.widthPx === legacyLayout.printArea.widthPx &&
        v1RuntimeLayout.printArea.heightPx === legacyLayout.printArea.heightPx &&
        v1RuntimeLayout.collarBottomPx === legacyLayout.collarBottomPx,
    );
  }
}

void assertV1MatchesLegacyDesignerLayout().then(() => {
  console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
  process.exit(pass ? 0 : 1);
});
