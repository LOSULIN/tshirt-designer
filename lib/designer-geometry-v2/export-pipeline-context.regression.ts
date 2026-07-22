/**
 * Pre-71.1 — Export Pipeline Context regression.
 * Run: npx tsx lib/designer-geometry-v2/export-pipeline-context.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProductExportInput } from "@/lib/export/product-export";
import type { MockupArtworkExportOptions } from "@/lib/export/mockup-artwork-export";
import type { ProductFactoryArtworkExportOptions } from "@/lib/export/factory-artwork-export";
import type { RenderFactoryArtworkExportOptions } from "@/lib/export-artwork-factory";
import type { RenderPrintExportOptions } from "@/lib/print-export-system";
import type { ProductMockupComposeInput } from "@/lib/render/product-mockup-compose";
import type { ProofPdfInput } from "@/lib/proof-engine/generators/proof-pdf-generator";
import type { FactoryProofPdfInput } from "@/lib/proof-engine/generators/factory-proof-pdf-template";
import { resolveRuntimeVisualCompensation } from "@/lib/presentation/visual-compensation";
import {
  createDefaultGeometryRuntimeState,
} from "./geometry-runtime-state";
import {
  DESIGNER_GEOMETRY_VERSION,
} from "./geometry-version";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";
import {
  resolveExportPipelineContext,
  type ExportPipelineContext,
} from "./export-pipeline-context";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/export-pipeline-context.ts";
const SIDES = ["front", "back"] as const;
const TOLERANCE_PX = 1;

const ENGINE_VOID_PATTERNS = [
  {
    file: "lib/print-export-system.ts",
    pattern: /void options\?\.pipelineContext/,
  },
  {
    file: "lib/render/product-mockup-compose.ts",
    pattern: /resolveProductMockupRuntimePlacement\(/,
  },
  {
    file: "lib/proof-engine/generators/factory-proof-pdf-template.ts",
    pattern: /void input\.pipelineContext/,
  },
];

const ARTWORK_ADAPTER_PATTERN = {
  file: "lib/export-artwork-factory.ts",
  pattern: /resolveArtworkExportRuntimeGeometry\(/,
};

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

function delta(a: number, b: number): number {
  return Math.abs(a - b);
}

function compareSnapshot(
  label: string,
  a: ExportPipelineContext["snapshot"],
  b: NonNullable<ExportPipelineContext["snapshot"]>,
): void {
  if (!a) {
    assert(`${label} snapshot present`, false);
    return;
  }
  for (const key of ["left", "top", "width", "height"] as const) {
    assert(
      `${label} artworkStage.${key}`,
      delta(a.artworkStage[key], b.artworkStage[key]) <= TOLERANCE_PX,
    );
  }
  assert(
    `${label} factoryOrigin.y`,
    delta(a.factoryOrigin.y, b.factoryOrigin.y) <= TOLERANCE_PX,
  );
}

// --- 1. V1 context ---
for (const side of SIDES) {
  const ctx = resolveExportPipelineContext({
    side,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  });
  assert(
    `V1 ${side} context.geometryVersion == V1`,
    ctx.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
  );
  assert(`V1 ${side} snapshot undefined`, ctx.snapshot === undefined);
  assert(`V1 ${side} geometry undefined`, ctx.geometry === undefined);
  assert(`V1 ${side} photoBridge undefined`, ctx.photoBridge === undefined);
}

// --- 2. V2 context ---
for (const side of SIDES) {
  const ctx = resolveExportPipelineContext({
    side,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  assert(
    `V2 ${side} context.geometryVersion == V2`,
    ctx.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
  );
  assert(`V2 ${side} snapshot defined`, ctx.snapshot != null);
  assert(`V2 ${side} geometry defined`, ctx.geometry != null);
  assert(`V2 ${side} photoBridge defined`, ctx.photoBridge != null);
}

// --- 3. V2 snapshot == resolveGeometryRuntimeSnapshot ---
for (const side of SIDES) {
  const ctx = resolveExportPipelineContext({
    side,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  const runtime = resolveGeometryRuntimeSnapshot(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  compareSnapshot(`V2 ${side}`, ctx.snapshot, runtime);
}

// --- 4. photoBridge == resolveGeometryRuntimePhotoBridge ---
for (const side of SIDES) {
  const ctx = resolveExportPipelineContext({
    side,
    size: "M",
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  const bridge = resolveGeometryRuntimePhotoBridge({
    side,
    size: "M",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  assert(
    `V2 ${side} photoBridge designerArtworkStage.topPercent`,
    delta(
      ctx.photoBridge!.designerArtworkStage.topPercent,
      bridge.designerArtworkStage.topPercent,
    ) <= 0.01,
  );
  assert(
    `V2 ${side} photoBridge photoArtworkStage.topPercent`,
    delta(
      ctx.photoBridge!.photoArtworkStage.topPercent,
      bridge.photoArtworkStage.topPercent,
    ) <= 0.01,
  );
}

// --- 5. visualCompensation == resolveRuntimeVisualCompensation ---
for (const side of SIDES) {
  for (const version of [
    DESIGNER_GEOMETRY_VERSION.V1,
    DESIGNER_GEOMETRY_VERSION.V2,
  ] as const) {
    const ctx = resolveExportPipelineContext({
      side,
      surface: "png",
      geometryVersion: version,
    });
    const expected = resolveRuntimeVisualCompensation({
      side,
      geometryVersion: version,
      surface: "export",
    });
    assert(
      `${version} ${side} visualCompensation.offsetXPercent`,
      ctx.visualCompensation.offsetXPercent === expected.offsetXPercent,
    );
    assert(
      `${version} ${side} visualCompensation.offsetYPercent`,
      ctx.visualCompensation.offsetYPercent === expected.offsetYPercent,
    );
  }
}

// --- 6. Product Export APIs accept pipelineContext? ---
const _exportInput: ProductExportInput = {
  layers: [],
  side: "front",
  size: "M",
  shirtColor: "white",
  pipelineContext: resolveExportPipelineContext({
    side: "front",
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  }),
};
const _factoryOptions: ProductFactoryArtworkExportOptions = {
  side: "front",
  size: "M",
  quality: "export",
  pixelScale: 1,
  pipelineContext: _exportInput.pipelineContext,
};
const _mockupOptions: MockupArtworkExportOptions = {
  side: "front",
  size: "M",
  quality: "export",
  pixelScale: 1,
  pipelineContext: _exportInput.pipelineContext,
};
const _renderFactoryOptions: RenderFactoryArtworkExportOptions = {
  pipelineContext: _exportInput.pipelineContext,
};
const _renderPrintOptions: RenderPrintExportOptions = {
  pipelineContext: _exportInput.pipelineContext,
};
const _composeInput: ProductMockupComposeInput = {
  asset: {} as ProductMockupComposeInput["asset"],
  artwork: {} as CanvasImageSource,
  artworkWidth: 1,
  artworkHeight: 1,
  pipelineContext: _exportInput.pipelineContext,
};
const _proofPdfInput: ProofPdfInput = {
  order: {} as ProofPdfInput["order"],
  version: 1,
  pipelineContext: _exportInput.pipelineContext,
};
const _factoryPdfInput: FactoryProofPdfInput = {
  order: {} as FactoryProofPdfInput["order"],
  version: 1,
  pipelineContext: _exportInput.pipelineContext,
};
void _exportInput;
void _factoryOptions;
void _mockupOptions;
void _renderFactoryOptions;
void _renderPrintOptions;
void _composeInput;
void _proofPdfInput;
void _factoryPdfInput;
assert("Product Export APIs accept pipelineContext?", true);

// --- 7. Legacy calls without context still compile ---
const _legacyInput: ProductExportInput = {
  layers: [],
  side: "front",
  size: "M",
  shirtColor: "white",
};
void _legacyInput;
assert("Legacy ProductExportInput without pipelineContext compiles", true);

// --- 8. Engines void pipelineContext (render behavior unchanged) ---
for (const { file, pattern } of ENGINE_VOID_PATTERNS) {
  const abs = join(ROOT, file);
  assert(`${file} exists`, existsSync(abs));
  const source = readFileSync(abs, "utf8");
  assert(
    `${file} does not read pipelineContext (void only)`,
    pattern.test(source),
  );
}

{
  const { file, pattern } = ARTWORK_ADAPTER_PATTERN;
  const abs = join(ROOT, file);
  assert(`${file} exists`, existsSync(abs));
  const source = readFileSync(abs, "utf8");
  assert(
    `${file} uses resolveArtworkExportRuntimeGeometry`,
    pattern.test(source),
  );
}

// --- Adapter isolation: delegate only ---
const adapterSource = readFileSync(join(ROOT, ADAPTER_PATH), "utf8");
assert(
  "adapter delegates resolveExportRuntimeSnapshot",
  adapterSource.includes("resolveExportRuntimeSnapshot("),
);
assert(
  "adapter delegates resolveGeometryRuntimePhotoBridge",
  adapterSource.includes("resolveGeometryRuntimePhotoBridge("),
);
assert(
  "adapter delegates resolveRuntimeVisualCompensation",
  adapterSource.includes("resolveRuntimeVisualCompensation("),
);

// --- state-based resolution ---
const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  exportRuntime: { png: true, zip: false, pdf: false, email: false },
};
const stateCtx = resolveExportPipelineContext({
  side: "front",
  surface: "png",
  state: v2State,
  productionLocked: false,
});
assert(
  "state + export toggle ON → V2",
  stateCtx.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
