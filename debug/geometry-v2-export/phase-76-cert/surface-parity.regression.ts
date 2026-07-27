#!/usr/bin/env node
/**
 * Phase 76 — verify V2 back placement parity across production surfaces.
 * Run: npx tsx debug/geometry-v2-export/phase-76-cert/surface-parity.regression.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveDesignerRuntimeWorkspace } from "@/lib/designer-geometry-v2/designer-runtime-workspace";
import { resolveExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import { resolveGeometryRuntimePhotoBridge } from "@/lib/designer-geometry-v2/geometry-runtime-photo-bridge";
import { DESIGNER_GEOMETRY_VERSION } from "@/lib/designer-geometry-v2/geometry-version";
import {
  photoBridgeRectToCalibrationRect,
  resolveProductMockupRuntimePlacement,
} from "@/lib/designer-geometry-v2/product-mockup-runtime";
import { resolveProductMockupPlacementForGarmentSize } from "@/lib/render/product-placement-scale";
import type { ProductCalibration } from "@/lib/render/render-types";

const ROOT = process.cwd();
const CAL = JSON.parse(
  readFileSync(join(ROOT, "public/products/UA35001/calibration.json"), "utf8"),
) as ProductCalibration;
const CANVAS = { w: 1024, h: 1536 };
const SIDE = "back" as const;
const SIZE = "M";

const registryY =
  CAL.back.productReference.printArea.y + CAL.back.visualAdjustment.offsetY;

const designer = resolveDesignerRuntimeWorkspace(
  SIDE,
  DESIGNER_GEOMETRY_VERSION.V2,
);
const bridge = resolveGeometryRuntimePhotoBridge({
  side: SIDE,
  size: SIZE,
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  canvasWidth: CANVAS.w,
  canvasHeight: CANVAS.h,
});
const ctx = resolveExportPipelineContext({
  side: SIDE,
  size: SIZE,
  surface: "png",
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
});
const mockup = resolveProductMockupRuntimePlacement(
  ctx,
  {
    calibration: CAL,
    side: SIDE,
    mockupVisualScale: 1,
    canvasWidth: CANVAS.w,
    canvasHeight: CANVAS.h,
  },
  SIZE,
);
const bridgeRect = photoBridgeRectToCalibrationRect(
  bridge.photoArtworkStage,
  CANVAS.w,
  CANVAS.h,
);
const legacy = resolveProductMockupPlacementForGarmentSize(CAL, SIDE, SIZE);

const surfaces = {
  registryCalibrationY: registryY,
  designerStageTop: designer?.artworkStage?.top,
  resultPanelBridgeY: bridgeRect.y,
  downloadMockupY: mockup.placementRect?.y,
  legacyPlacementY: legacy?.y,
};

let pass = true;
for (const [label, value] of Object.entries(surfaces)) {
  if (value == null || Math.abs(value - 388) > 1.5) {
    console.error(`FAIL: ${label} = ${value}`);
    pass = false;
  } else {
    console.log(`PASS: ${label} = ${value}`);
  }
}

const frontRegistry =
  CAL.front.productReference.printArea.y +
  CAL.front.visualAdjustment.offsetY;
const frontDesigner = resolveDesignerRuntimeWorkspace(
  "front",
  DESIGNER_GEOMETRY_VERSION.V2,
);
if (frontRegistry !== 500) {
  console.error(`FAIL: front registry y = ${frontRegistry}`);
  pass = false;
} else {
  console.log(`PASS: front registry unchanged y = ${frontRegistry}`);
}
if (
  frontDesigner?.artworkStage?.top != null &&
  Math.abs(frontDesigner.artworkStage.top - 501.68) > 2
) {
  console.error(`FAIL: front designer top = ${frontDesigner.artworkStage.top}`);
  pass = false;
} else {
  console.log(
    `PASS: front designer top unchanged = ${frontDesigner?.artworkStage?.top}`,
  );
}

console.log(pass ? "\nALL PASS" : "\nSOME FAILED");
process.exit(pass ? 0 : 1);
