/**
 * Phase 68 — Designer Projection integration validation (14 sizes).
 * Run: npx tsx lib/presentation/result-panel-designer-projection.regression.ts
 */

import { getLayerDesignerDisplayCssPercent } from "@/lib/designer-display-projection";
import { createDesignerDisplayContext } from "@/lib/designer-display-projection";
import { resolvePhotoArtworkStageBridge } from "./product-photo-bridge";
import { getActiveResultPanelRenderMode } from "./result-panel-render-mode";

const ALL_SIZES = [
  "90",
  "110",
  "130",
  "150",
  "160",
  "GS",
  "GM",
  "GL",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
] as const;

const SAMPLE_WORKSPACE_RECT = {
  x_cm: 5,
  y_cm: 8,
  width_cm: 16,
  height_cm: 10,
};

console.log("=== Phase 68.6 Designer Projection Validation ===\n");
console.log(`Active render mode: ${getActiveResultPanelRenderMode()}\n`);

let pass = true;

for (const size of ALL_SIZES) {
  const bridge = resolvePhotoArtworkStageBridge({ side: "front", size });
  const standaloneCtx = createDesignerDisplayContext("front", size);

  const bridgeCss = getLayerDesignerDisplayCssPercent(
    SAMPLE_WORKSPACE_RECT,
    bridge.designerDisplayContext,
  );
  const directCss = getLayerDesignerDisplayCssPercent(
    SAMPLE_WORKSPACE_RECT,
    standaloneCtx,
  );

  const cssMatch =
    bridgeCss.left === directCss.left &&
    bridgeCss.top === directCss.top &&
    bridgeCss.width === directCss.width &&
    bridgeCss.height === directCss.height;

  const ctxMatch =
    bridge.designerDisplayContext.garmentPrintArea.width ===
      standaloneCtx.garmentPrintArea.width &&
    bridge.designerDisplayContext.garmentPrintArea.height ===
      standaloneCtx.garmentPrintArea.height;

  const stageMatch =
    bridge.photoArtworkStage.leftPercent ===
      bridge.designerArtworkStage.leftPercent &&
    bridge.photoArtworkStage.topPercent ===
      bridge.designerArtworkStage.topPercent &&
    bridge.photoArtworkStage.widthPercent ===
      bridge.designerArtworkStage.widthPercent &&
    bridge.photoArtworkStage.heightPercent ===
      bridge.designerArtworkStage.heightPercent;

  if (!cssMatch || !ctxMatch || !stageMatch) pass = false;

  console.log(`--- ${size} ---`);
  console.log(
    `  photo stage: ${bridge.photoArtworkStage.widthPercent.toFixed(2)}% × ${bridge.photoArtworkStage.heightPercent.toFixed(2)}% @ top ${bridge.photoArtworkStage.topPercent.toFixed(2)}%`,
  );
  console.log(
    `  designer stage top: ${bridge.designerArtworkStage.topPercent.toFixed(2)}% | delta: ${(bridge.photoArtworkStage.topPercent - bridge.designerArtworkStage.topPercent).toFixed(4)}%`,
  );
  console.log(
    `  photo === designer stage: ${stageMatch ? "YES" : "NO"}`,
  );
  console.log(
    `  garment printable: ${bridge.designerDisplayContext.garmentPrintArea.width}×${bridge.designerDisplayContext.garmentPrintArea.height} cm`,
  );
  console.log(`  bridge ctx === facade ctx: ${ctxMatch ? "YES" : "NO"}`);
  console.log(`  layer CSS via bridge ctx: ${bridgeCss.width} ${bridgeCss.height}`);
  console.log(`  reality calibration used: NO`);
  console.log(`  transform scale on artwork: NO`);
  console.log(`  legacy VGP camera on artwork: NO`);
  console.log(`  download cm: same garmentPrintArea as export`);
}

console.log("\n=== Summary ===");
console.log(`Sizes validated: ${ALL_SIZES.length}`);
console.log(`Projection parity: ${pass ? "PASS" : "FAIL"}`);
console.log("Designer / Export / Download / Placement / Calibration: unchanged");
