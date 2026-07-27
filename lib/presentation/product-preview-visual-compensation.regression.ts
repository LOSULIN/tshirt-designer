/**
 * Phase 70.3.5 — Product Preview Visual Compensation + V2 Runtime Alignment.
 * Run: npx tsx lib/presentation/product-preview-visual-compensation.regression.ts
 */

import { getLayerDesignerDisplayCssPercent } from "@/lib/designer-display-projection";
import { createDesignerDisplayContext } from "@/lib/designer-display-projection";
import { DESIGNER_GEOMETRY_VERSION } from "@/lib/designer-geometry-v2/geometry-version";
import { resolveDesignerRuntimeWorkspace } from "@/lib/designer-geometry-v2/designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "@/lib/designer-geometry-v2/geometry-runtime-photo-bridge";
import { ACTIVE_DESIGNER_GEOMETRY_VERSION } from "@/lib/designer-geometry-v2/geometry-version";
import {
  PRODUCT_PREVIEW_VISUAL_COMPENSATION,
  applyProductPreviewVisualCompensationToRect,
  hasRuntimeVisualCompensation,
  resolveProductPreviewVisualCompensation,
  resolveProductPreviewVisualCompensationPdfOffsetY,
  resolveRuntimeVisualCompensation,
  runtimeVisualCompensationLayerStyle,
} from "./visual-compensation";
import { photoBridgeRectToStageStyle } from "./product-photo-bridge-css";
import { resolvePhotoArtworkStageBridge } from "./product-photo-bridge";

const CANVAS = { width: 1024, height: 1536 };
const SAMPLE_RECT = { x: 298, y: 472, width: 428, height: 612 };
const TOLERANCE_PX = 1;
const SIDES = ["front", "back"] as const;

const SAMPLE_LAYER = {
  id: "sample",
  type: "shape" as const,
  shapeKind: "rectangle" as const,
  visible: true,
  x_cm: 5,
  y_cm: 8,
  width_cm: 16,
  height_cm: 10,
  rotation: 0,
  zIndex: 1,
  fill: "#2563eb",
  stroke: "#1d4ed8",
  strokeWidth: 1,
};

let pass = true;

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    pass = false;
  } else {
    console.log(`PASS: ${label}`);
  }
}

function pct(value: string): number {
  return parseFloat(value) / 100;
}

function resolveArtworkTopPx(
  stageTopPx: number,
  stageHeightPx: number,
  layerTopPercent: string,
  compensationYPercent: number,
): number {
  const layerTopPx = pct(layerTopPercent) * stageHeightPx;
  const compensationPx = (compensationYPercent / 100) * stageHeightPx;
  return stageTopPx + layerTopPx + compensationPx;
}

console.log("=== Phase 70.3.5 Product Preview Visual Compensation ===\n");

// --- V2 SSOT: both sides disabled ---
for (const side of SIDES) {
  assert(
    `V2 ${side} visual compensation disabled (offset = 0)`,
    PRODUCT_PREVIEW_VISUAL_COMPENSATION[side].offsetYPercent === 0 &&
      PRODUCT_PREVIEW_VISUAL_COMPENSATION[side].offsetXPercent === 0,
  );
  const runtime = resolveRuntimeVisualCompensation({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    surface: "resultPanel",
  });
  assert(
    `V2 ResultPanel ${side} runtime compensation is zero`,
    !hasRuntimeVisualCompensation(runtime),
  );
  const style = runtimeVisualCompensationLayerStyle(runtime);
  assert(
    `V2 ${side} DOM layer style has no transform`,
    style.transform == null,
  );
}

// --- V1 legacy export unchanged ---
assert(
  "V1 legacy front export offsetY still +8",
  resolveProductPreviewVisualCompensation("front").offsetYPercent === 8,
);
assert(
  "V1 legacy back export offsetY still -8",
  resolveProductPreviewVisualCompensation("back").offsetYPercent === -8,
);

const legacyShifted = applyProductPreviewVisualCompensationToRect(
  SAMPLE_RECT,
  "front",
  CANVAS.width,
  CANVAS.height,
);
const legacyExpectedDy =
  (resolveProductPreviewVisualCompensation("front").offsetYPercent / 100) *
  CANVAS.height;
assert(
  "V1 export rect shift unchanged (+8% canvas height)",
  Math.abs(legacyShifted.y - (SAMPLE_RECT.y + legacyExpectedDy)) < 0.01,
);

const pdfOffset = resolveProductPreviewVisualCompensationPdfOffsetY("front", 400);
assert(
  "V1 PDF offset unchanged (positive screen down => negative PDF up)",
  pdfOffset < 0,
);

// --- Photo bridge stage unaffected ---
const bridge = resolvePhotoArtworkStageBridge({ side: "front", size: "M" });
const stageStyle = photoBridgeRectToStageStyle(bridge.photoArtworkStage);
assert(
  "photo bridge stage style unchanged by visual compensation",
  stageStyle.top === `${bridge.photoArtworkStage.topPercent}%` &&
    stageStyle.left === `${bridge.photoArtworkStage.leftPercent}%`,
);

// --- Designer projection layer CSS unchanged ---
const ctx = createDesignerDisplayContext("front", "M");
const layerCss = getLayerDesignerDisplayCssPercent(SAMPLE_LAYER, ctx);
assert(
  "designer projection layer CSS unchanged",
  typeof layerCss.top === "string" &&
    layerCss.top.endsWith("%") &&
    typeof layerCss.left === "string" &&
    layerCss.left.endsWith("%"),
);

// --- V2 stage + artwork alignment ---
for (const side of SIDES) {
  const designer = resolveDesignerRuntimeWorkspace(
    side,
    DESIGNER_GEOMETRY_VERSION.V2,
  );
  const photoBridge = resolveGeometryRuntimePhotoBridge({
    side,
    size: "M",
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  });
  const runtimeComp = resolveRuntimeVisualCompensation({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
    surface: "resultPanel",
  });

  const designerStageTop = designer.snapshot.artworkStage.top;
  const resultStageTop =
    (photoBridge.photoArtworkStage.topPercent / 100) * CANVAS.height;
  const stageDelta = Math.abs(designerStageTop - resultStageTop);

  assert(
    `V2 ${side} Designer Stage == ResultPanel Stage (Δ=${stageDelta.toFixed(2)}px)`,
    stageDelta <= TOLERANCE_PX,
  );

  const stageHeight = designer.snapshot.artworkStage.height;
  const designerArtworkTop = resolveArtworkTopPx(
    designerStageTop,
    stageHeight,
    layerCss.top,
    0,
  );
  const resultArtworkTop = resolveArtworkTopPx(
    resultStageTop,
    stageHeight,
    layerCss.top,
    runtimeComp.offsetYPercent,
  );
  const artworkDelta = Math.abs(designerArtworkTop - resultArtworkTop);

  assert(
    `V2 ${side} Designer Artwork == ResultPanel Artwork (Δ=${artworkDelta.toFixed(2)}px)`,
    artworkDelta <= TOLERANCE_PX,
  );
}

// --- Production lock ---
assert(
  "production geometry version is V2",
  ACTIVE_DESIGNER_GEOMETRY_VERSION === DESIGNER_GEOMETRY_VERSION.V2,
);

for (const side of SIDES) {
  const v1Runtime = resolveRuntimeVisualCompensation({
    side,
    geometryVersion: DESIGNER_GEOMETRY_VERSION.V1,
    surface: "resultPanel",
  });
  const expectedY = side === "front" ? 8 : -8;
  assert(
    `V1 ResultPanel ${side} still uses legacy ${expectedY}% compensation`,
    v1Runtime.offsetYPercent === expectedY,
  );
}

console.log("\n--- Before / After (V2, @1024×1536) ---");
const v2Designer = resolveDesignerRuntimeWorkspace(
  "front",
  DESIGNER_GEOMETRY_VERSION.V2,
);
const v2Bridge = resolveGeometryRuntimePhotoBridge({
  side: "front",
  size: "M",
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
});
const stageTop = v2Designer.snapshot.artworkStage.top;
const stageHeight = v2Designer.snapshot.artworkStage.height;
const designerArtworkTop = resolveArtworkTopPx(
  stageTop,
  stageHeight,
  layerCss.top,
  0,
);
const beforeResultArtworkTop = resolveArtworkTopPx(
  stageTop,
  stageHeight,
  layerCss.top,
  8,
);
const afterResultArtworkTop = resolveArtworkTopPx(
  stageTop,
  stageHeight,
  layerCss.top,
  0,
);

console.log("Front Before:");
console.log(`  Designer Artwork Top:    ${designerArtworkTop.toFixed(2)} px`);
console.log(
  `  ResultPanel Artwork Top: ${beforeResultArtworkTop.toFixed(2)} px`,
);
console.log(
  `  Delta:                   ${(beforeResultArtworkTop - designerArtworkTop).toFixed(2)} px`,
);
console.log("Front After:");
console.log(`  Designer Artwork Top:    ${designerArtworkTop.toFixed(2)} px`);
console.log(
  `  ResultPanel Artwork Top: ${afterResultArtworkTop.toFixed(2)} px`,
);
console.log(
  `  Delta:                   ${(afterResultArtworkTop - designerArtworkTop).toFixed(2)} px`,
);

const v2BackDesigner = resolveDesignerRuntimeWorkspace(
  "back",
  DESIGNER_GEOMETRY_VERSION.V2,
);
const v2BackBridge = resolveGeometryRuntimePhotoBridge({
  side: "back",
  size: "M",
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
});
const backCtx = createDesignerDisplayContext("back", "M");
const backLayerCss = getLayerDesignerDisplayCssPercent(SAMPLE_LAYER, backCtx);
const backStageTop = v2BackDesigner.snapshot.artworkStage.top;
const backStageHeight = v2BackDesigner.snapshot.artworkStage.height;
const backDesignerArtworkTop = resolveArtworkTopPx(
  backStageTop,
  backStageHeight,
  backLayerCss.top,
  0,
);
const backBeforeResultTop = resolveArtworkTopPx(
  backStageTop,
  backStageHeight,
  backLayerCss.top,
  -8,
);
const backAfterResultTop = resolveArtworkTopPx(
  backStageTop,
  backStageHeight,
  backLayerCss.top,
  0,
);
console.log("\nBack Before:");
console.log(`  Designer Artwork Top:    ${backDesignerArtworkTop.toFixed(2)} px`);
console.log(
  `  ResultPanel Artwork Top: ${backBeforeResultTop.toFixed(2)} px`,
);
console.log(
  `  Delta:                   ${(backBeforeResultTop - backDesignerArtworkTop).toFixed(2)} px`,
);
console.log("Back After:");
console.log(`  Designer Artwork Top:    ${backDesignerArtworkTop.toFixed(2)} px`);
console.log(
  `  ResultPanel Artwork Top: ${backAfterResultTop.toFixed(2)} px`,
);
console.log(
  `  Delta:                   ${(backAfterResultTop - backDesignerArtworkTop).toFixed(2)} px`,
);

console.log("\nConfigured offsets:");
console.log(
  `  V2 front (runtime): x=${PRODUCT_PREVIEW_VISUAL_COMPENSATION.front.offsetXPercent}% y=${PRODUCT_PREVIEW_VISUAL_COMPENSATION.front.offsetYPercent}%`,
);
console.log(
  `  V2 back  (runtime): x=${PRODUCT_PREVIEW_VISUAL_COMPENSATION.back.offsetXPercent}% y=${PRODUCT_PREVIEW_VISUAL_COMPENSATION.back.offsetYPercent}%`,
);
console.log(
  `  V1 legacy export:   front y=${resolveProductPreviewVisualCompensation("front").offsetYPercent}% back y=${resolveProductPreviewVisualCompensation("back").offsetYPercent}%`,
);

console.log(`\n${pass ? "ALL PASS" : "SOME FAILED"}`);
process.exit(pass ? 0 : 1);
