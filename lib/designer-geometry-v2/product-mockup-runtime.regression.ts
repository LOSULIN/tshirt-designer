/**
 * Phase 71.2 — Product Mockup Runtime regression.
 * Run: npx tsx lib/designer-geometry-v2/product-mockup-runtime.regression.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  METRICS_TEMPLATE_HEIGHT_PX,
  METRICS_TEMPLATE_WIDTH_PX,
} from "@/lib/garment-metrics/constants";
import {
  resolveProductPreviewVisualCompensation,
} from "@/lib/presentation/visual-compensation";
import {
  resolveProductMockupPlacementForGarmentSize,
} from "@/lib/render/product-placement-scale";
import type { ProductCalibration } from "@/lib/render/render-types";
import { resolveExportPipelineContext } from "./export-pipeline-context";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  createDefaultGeometryRuntimeState,
  DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES,
} from "./geometry-runtime-state";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";
import {
  buildProductMockupRuntimeCompareLogForTest,
  photoBridgeRectToCalibrationRect,
  resolveProductMockupRuntimePlacement,
} from "./product-mockup-runtime";

const ROOT = process.cwd();
const ADAPTER_PATH = "lib/designer-geometry-v2/product-mockup-runtime.ts";
const CALIBRATION_PATH = "public/products/UA35001/calibration.json";
const SIDES = ["front", "back"] as const;
const CANVAS_W = METRICS_TEMPLATE_WIDTH_PX;
const CANVAS_H = METRICS_TEMPLATE_HEIGHT_PX;
const MOCKUP_VISUAL_SCALE = 1;

const FORBIDDEN_ADAPTER_IMPORTS = [
  /from ["'][^"']*geometry-builder/,
  /from ["'][^"']*product-factory-anchor/,
  /from ["'][^"']*geometry-runtime-photo-bridge/,
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

function loadCalibration(): ProductCalibration {
  const abs = join(ROOT, CALIBRATION_PATH);
  return JSON.parse(readFileSync(abs, "utf8")) as ProductCalibration;
}

const calibration = loadCalibration();

function productInput(side: (typeof SIDES)[number]) {
  return {
    calibration,
    side,
    mockupVisualScale: MOCKUP_VISUAL_SCALE,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
  };
}

for (const side of SIDES) {
  const size = "M";
  const product = productInput(side);

  const legacyPlacement = resolveProductMockupPlacementForGarmentSize(
    calibration,
    side,
    size,
  );

  const v1Context = resolveExportPipelineContext({
    side,
    size,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
  });

  const v1Runtime = resolveProductMockupRuntimePlacement(
    v1Context,
    product,
    size,
  );

  // --- V1 placement == legacy production path ---
  assert(
    `V1 ${side} placementRect.x == legacy`,
    v1Runtime.placementRect?.x === legacyPlacement?.x,
  );
  assert(
    `V1 ${side} placementRect.y == legacy`,
    v1Runtime.placementRect?.y === legacyPlacement?.y,
  );
  assert(
    `V1 ${side} placementRect.width == legacy`,
    v1Runtime.placementRect?.width === legacyPlacement?.width,
  );
  assert(
    `V1 ${side} placementRect.height == legacy`,
    v1Runtime.placementRect?.height === legacyPlacement?.height,
  );
  assert(
    `V1 ${side} scale == mockupVisualScale`,
    v1Runtime.scale === MOCKUP_VISUAL_SCALE,
  );
  assert(
    `V1 ${side} geometryVersion == V1`,
    v1Runtime.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
  );

  const v2Context = resolveExportPipelineContext({
    side,
    size,
    surface: "png",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });

  const v2Runtime = resolveProductMockupRuntimePlacement(
    v2Context,
    product,
    size,
  );

  const resultPanelBridge = resolveGeometryRuntimePhotoBridge({
    side,
    size,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
  });

  const expectedPlacement = photoBridgeRectToCalibrationRect(
    resultPanelBridge.photoArtworkStage,
    CANVAS_W,
    CANVAS_H,
  );

  // --- V2 placement == ResultPanel photo bridge stage ---
  assert(`V2 ${side} photoBridge defined`, v2Runtime.photoBridge != null);
  assert(
    `V2 ${side} placementRect.x == ResultPanel bridge`,
    v2Runtime.placementRect?.x === expectedPlacement.x,
  );
  assert(
    `V2 ${side} placementRect.y == ResultPanel bridge`,
    v2Runtime.placementRect?.y === expectedPlacement.y,
  );
  assert(
    `V2 ${side} placementRect.width == ResultPanel bridge`,
    v2Runtime.placementRect?.width === expectedPlacement.width,
  );
  assert(
    `V2 ${side} placementRect.height == ResultPanel bridge`,
    v2Runtime.placementRect?.height === expectedPlacement.height,
  );

  // --- pipelineContext.photoBridge delegate matches ResultPanel ---
  assert(
    `V2 ${side} context photoBridge stage == ResultPanel`,
    v2Context.photoBridge?.photoArtworkStage.topPercent ===
      resultPanelBridge.photoArtworkStage.topPercent,
  );

  // --- V2 compensation 0/0 ---
  assert(
    `V2 ${side} visualCompensation offsetX == 0`,
    v2Runtime.visualCompensation.offsetXPercent === 0,
  );
  assert(
    `V2 ${side} visualCompensation offsetY == 0`,
    v2Runtime.visualCompensation.offsetYPercent === 0,
  );
  assert(`V2 ${side} scale == 1`, v2Runtime.scale === 1);

  const compareLog = buildProductMockupRuntimeCompareLogForTest(
    v2Context,
    product,
    size,
  );
  assert(`V2 ${side} compare delta defined`, compareLog.delta != null);
}

// --- undefined context → V1 legacy ---
const fallback = resolveProductMockupRuntimePlacement(
  undefined,
  productInput("front"),
  "M",
);
assert(
  "undefined pipelineContext → V1",
  fallback.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- Production toggle OFF → V1 ---
const v2State = {
  ...createDefaultGeometryRuntimeState(),
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
};
const prodContext = resolveExportPipelineContext({
  side: "front",
  size: "M",
  surface: "png",
  state: v2State,
  productionLocked: true,
});
assert(
  "production locked → V1 placement path",
  prodContext.geometryVersion === DESIGNER_GEOMETRY_VERSION.V1,
);

// --- Dev toggle ON → V2 runtime ---
const devOnState = {
  ...v2State,
  exportRuntime: { ...DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES, png: true },
};
const devContext = resolveExportPipelineContext({
  side: "front",
  size: "M",
  surface: "png",
  state: devOnState,
  productionLocked: false,
});
const devRuntime = resolveProductMockupRuntimePlacement(
  devContext,
  productInput("front"),
  "M",
);
assert(
  "dev export toggle ON → V2 runtime",
  devRuntime.geometryVersion === DESIGNER_GEOMETRY_VERSION.V2,
);

// --- Adapter isolation ---
const violations = scanAdapterIsolation();
assert("Adapter delegate-only (no snapshot/photo-bridge calls)", violations.length === 0);
if (violations.length > 0) {
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
}

// --- V1 legacy compensation preserved when no export context visual ---
const noContextV1 = resolveProductMockupRuntimePlacement(
  undefined,
  productInput("front"),
  "M",
);
const legacyComp = resolveProductPreviewVisualCompensation("front");
assert(
  "V1 fallback compensation == legacy export",
  noContextV1.visualCompensation.offsetYPercent === legacyComp.offsetYPercent,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"} (${checks.length} checks)`);
process.exit(pass ? 0 : 1);
