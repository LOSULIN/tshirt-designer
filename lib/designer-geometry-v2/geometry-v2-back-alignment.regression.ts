/**
 * Phase 70.3.5 — V2 Back artwork alignment (Designer == ResultPanel).
 * Run: npx tsx lib/designer-geometry-v2/geometry-v2-back-alignment.regression.ts
 */

import { getLayerDesignerDisplayCssPercent } from "@/lib/designer-display-projection";
import { DESIGNER_GEOMETRY_VERSION } from "./geometry-version";
import { resolveDesignerRuntimeWorkspace } from "./designer-runtime-workspace";
import { resolveGeometryRuntimePhotoBridge } from "./geometry-runtime-photo-bridge";
import {
  hasRuntimeVisualCompensation,
  resolveRuntimeVisualCompensation,
  runtimeVisualCompensationLayerStyle,
} from "@/lib/presentation/visual-compensation";

const CANVAS = { width: 1024, height: 1536 };
const TOLERANCE_PX = 1;

const SAMPLE_LAYERS = [
  {
    id: "logo",
    x_cm: 6,
    y_cm: 10,
    width_cm: 14,
    height_cm: 14,
    rotation: 12,
    scale: 1.05,
  },
  {
    id: "title",
    x_cm: 4,
    y_cm: 22,
    width_cm: 28,
    height_cm: 8,
    rotation: 0,
    scale: 1,
  },
  {
    id: "badge",
    x_cm: 22,
    y_cm: 14,
    width_cm: 6,
    height_cm: 6,
    rotation: -8,
    scale: 0.95,
  },
] as const;

function pct(value: string): number {
  return parseFloat(value) / 100;
}

function resolveArtworkTopPx(
  stageTopPx: number,
  stageHeightPx: number,
  layerTopPercent: string,
  compensationYPercent: number,
): number {
  return (
    stageTopPx +
    pct(layerTopPercent) * stageHeightPx +
    (compensationYPercent / 100) * stageHeightPx
  );
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const designer = resolveDesignerRuntimeWorkspace(
  "back",
  DESIGNER_GEOMETRY_VERSION.V2,
);
const bridge = resolveGeometryRuntimePhotoBridge({
  side: "back",
  size: "M",
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
});
const runtimeComp = resolveRuntimeVisualCompensation({
  side: "back",
  geometryVersion: DESIGNER_GEOMETRY_VERSION.V2,
  surface: "resultPanel",
});
const ctx = bridge.designerDisplayContext;

assert(
  !hasRuntimeVisualCompensation(runtimeComp),
  "V2 back runtime visual compensation must be zero",
);
assert(
  runtimeVisualCompensationLayerStyle(runtimeComp).transform == null,
  "V2 back must not apply translate wrapper transform",
);

const stageTop = designer.snapshot.artworkStage.top;
const resultStageTop =
  (bridge.photoArtworkStage.topPercent / 100) * CANVAS.height;
const stageHeight = designer.snapshot.artworkStage.height;

assert(
  Math.abs(stageTop - resultStageTop) <= TOLERANCE_PX,
  `V2 back stage top aligned (Δ=${Math.abs(stageTop - resultStageTop).toFixed(2)}px)`,
);

const checks: string[] = [];
for (const layer of SAMPLE_LAYERS) {
  const css = getLayerDesignerDisplayCssPercent(
    {
      x_cm: layer.x_cm,
      y_cm: layer.y_cm,
      width_cm: layer.width_cm,
      height_cm: layer.height_cm,
    },
    ctx,
  );
  const designerArtworkTop = resolveArtworkTopPx(
    stageTop,
    stageHeight,
    css.top,
    0,
  );
  const resultArtworkTop = resolveArtworkTopPx(
    resultStageTop,
    stageHeight,
    css.top,
    runtimeComp.offsetYPercent,
  );
  const artworkDelta = Math.abs(designerArtworkTop - resultArtworkTop);
  assert(
    artworkDelta <= TOLERANCE_PX,
    `V2 back ${layer.id} artwork Δ=${artworkDelta.toFixed(2)}px`,
  );
  checks.push(
    `PASS: back/${layer.id} designerTop=${designerArtworkTop.toFixed(2)} resultTop=${resultArtworkTop.toFixed(2)} Δ=${artworkDelta.toFixed(2)}`,
  );
}

const summary = [
  "Phase 70.3.5 — V2 Back Runtime Alignment",
  "",
  ...checks,
  "",
  "ALL PASS",
].join("\n");

console.log(summary);
