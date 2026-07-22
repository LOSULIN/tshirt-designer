/**
 * Phase 71.1 — Artwork Export Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/export-artwork-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeFactoryArtworkBBox,
  resolveFactoryArtworkExportSpec,
} from "@/lib/export-artwork-factory";
import type { DesignLayer } from "@/lib/types";
import {
  buildArtworkExportRuntimeCompareLogForTest,
  resolveArtworkExportRuntimeGeometry,
} from "./export-artwork-runtime";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import { resolveGeometryRuntimeSnapshot } from "./resolve-geometry-runtime";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/export-artwork-runtime.ts";
const SIDES = ["front", "back"] as const;
const TOLERANCE_PX = 1;

const FORBIDDEN_ADAPTER_IMPORTS = [
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*geometry-builder-calibration/,
  /from ["'][^"']*product-factory-anchor/,
  /from ["'][^"']*product-master-snapshot/,
  /from ["'][^"']*product-master-geometry/,
  /from ["'][^"']*\/calibration/,
  /resolveGeometryRuntimeSnapshot\(/,
  /resolveExportRuntimeSnapshot\(/,
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

function delta(a: number, b: number): number {
  return Math.abs(a - b);
}

function makeTestLayers(): DesignLayer[] {
  return [
    {
      id: "artwork-logo",
      type: "image",
      visible: true,
      x_cm: 6,
      y_cm: 10,
      width_cm: 14,
      height_cm: 14,
      rotation: 12,
      scale: 1.05,
      zIndex: 1,
      image: {
        originalUrl: "/test/logo.png",
        previewUrl: "/test/logo.png",
        fileName: "logo.png",
      },
      keepRatio: true,
    },
    {
      id: "artwork-title",
      type: "text",
      visible: true,
      x_cm: 4,
      y_cm: 22,
      width_cm: 28,
      height_cm: 8,
      rotation: 0,
      scale: 1,
      zIndex: 2,
      text: "TITLE",
      fontSize_cm: 2.4,
      fontFamily: "Arial",
      fontWeight: 700,
      fill: "#111827",
      align: "center",
      keepRatio: false,
    },
  ];
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

const layers = makeTestLayers();

for (const side of SIDES) {
  const size = "M";
  const productionBbox = computeFactoryArtworkBBox(layers, side, size);
  const productionSpec = resolveFactoryArtworkExportSpec(layers, side, size);
  const maxEdgeCm = Math.max(productionBbox.width_cm, productionBbox.height_cm);
  const dpiInput = { maxEdgeCm, imageDesignerDpis: [] as number[] };

  const v1Context = resolveExportPipelineContext({
    side,
    size,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  });

  const v1Runtime = resolveArtworkExportRuntimeGeometry(
    v1Context,
    productionBbox,
    dpiInput,
  );

  // --- 1. V1 BBox = Production ---
  assert(
    `V1 ${side} bbox.x_cm == production`,
    v1Runtime.bbox.x_cm === productionBbox.x_cm,
  );
  assert(
    `V1 ${side} bbox.y_cm == production`,
    v1Runtime.bbox.y_cm === productionBbox.y_cm,
  );
  assert(
    `V1 ${side} bbox.width_cm == production`,
    v1Runtime.bbox.width_cm === productionBbox.width_cm,
  );
  assert(
    `V1 ${side} bbox.height_cm == production`,
    v1Runtime.bbox.height_cm === productionBbox.height_cm,
  );

  const v2Context = resolveExportPipelineContext({
    side,
    size,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });

  const v2Runtime = resolveArtworkExportRuntimeGeometry(
    v2Context,
    productionBbox,
    dpiInput,
  );

  const snapshot = resolveGeometryRuntimeSnapshot(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );

  // --- 2. V2 stage geometry from Runtime Snapshot (via pipelineContext) ---
  assert(`V2 ${side} artworkStage defined`, v2Runtime.artworkStage != null);
  assert(`V2 ${side} safeArea defined`, v2Runtime.safeArea != null);

  // --- 3. Stage = snapshot.artworkStage ---
  for (const key of ["left", "top", "width", "height"] as const) {
    assert(
      `V2 ${side} artworkStage.${key} == snapshot`,
      delta(
        v2Runtime.artworkStage![key],
        snapshot.artworkStage[key],
      ) <= TOLERANCE_PX,
    );
  }

  // --- 4. Safe Area = snapshot.safeArea ---
  for (const key of ["left", "top", "width", "height"] as const) {
    assert(
      `V2 ${side} safeArea.${key} == snapshot`,
      delta(v2Runtime.safeArea![key], snapshot.safeArea[key]) <= TOLERANCE_PX,
    );
  }

  // --- 5. Factory origin not recomputed in adapter (uses pipelineContext.geometry) ---
  assert(
    `V2 ${side} factoryOrigin.y == pipelineContext.geometry`,
    delta(
      v2Context.geometry!.factoryOrigin.y,
      snapshot.factoryOrigin.y,
    ) <= TOLERANCE_PX,
  );

  // --- 10. V1 export canvas == production spec (byte-identical proxy) ---
  assert(
    `V1 ${side} exportDpi == production spec`,
    v1Runtime.exportCanvas.exportDpi === productionSpec.exportDpi,
  );
  assert(
    `V1 ${side} widthPx == production spec`,
    v1Runtime.exportCanvas.widthPx === productionSpec.widthPx,
  );
  assert(
    `V1 ${side} heightPx == production spec`,
    v1Runtime.exportCanvas.heightPx === productionSpec.heightPx,
  );

  // V2 content bbox unchanged (layer union); export canvas identical to V1
  assert(
    `V2 ${side} export canvas widthPx == V1`,
    v2Runtime.exportCanvas.widthPx === v1Runtime.exportCanvas.widthPx,
  );
  assert(
    `V2 ${side} export canvas heightPx == V1`,
    v2Runtime.exportCanvas.heightPx === v1Runtime.exportCanvas.heightPx,
  );

  const compareLog = buildArtworkExportRuntimeCompareLogForTest(
    side,
    v2Context,
    productionBbox,
    dpiInput,
  );
  assert(
    `V2 ${side} shadow compare bbox Δx == 0`,
    compareLog.bbox.delta.x_cm === 0,
  );
  assert(
    `V2 ${side} shadow compare bbox Δy == 0`,
    compareLog.bbox.delta.y_cm === 0,
  );
  assert(
    `V2 ${side} shadow compare bbox Δwidth == 0`,
    compareLog.bbox.delta.width_cm === 0,
  );
  assert(
    `V2 ${side} shadow compare bbox Δheight == 0`,
    compareLog.bbox.delta.height_cm === 0,
  );
}

// --- 6. Adapter does not call Geometry Runtime snapshot directly ---
const isolationViolations = scanAdapterIsolation();
assert(
  "Adapter does not call resolveGeometryRuntimeSnapshot / Builder / Anchor",
  isolationViolations.length === 0,
);
if (isolationViolations.length > 0) {
  for (const violation of isolationViolations) {
    console.error(`  ${violation}`);
  }
}

// --- 7–9. No Builder / Factory Anchor Builder / Calibration imports ---
assert("Adapter file exists", existsSync(join(ROOT, ADAPTER_PATH)));

// undefined pipelineContext falls back to V1
const fallbackBbox = computeFactoryArtworkBBox(layers, "front", "M");
const fallbackRuntime = resolveArtworkExportRuntimeGeometry(
  undefined,
  fallbackBbox,
  {
    maxEdgeCm: Math.max(fallbackBbox.width_cm, fallbackBbox.height_cm),
    imageDesignerDpis: [],
  },
);
assert(
  "undefined pipelineContext → V1",
  fallbackRuntime.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
