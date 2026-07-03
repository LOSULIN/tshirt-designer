/**
 * Phase 15.3.1 — Garment Anchor Runtime Audit (analysis only)
 * node scripts/audit-garment-anchor-15-3-1.mjs
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CANVAS_W = 1024;
const CANVAS_H = 1536;
const PX_PER_CM = 12.24;
const COLLAR_Y = 386;
const PRINT_OFFSET_CM = { front: 7, back: 5 };
const BASELINE_CHEST = 52;
const BASELINE_LENGTH = 69;
const VISUAL_CHEST_PX = 550;
const VISUAL_BODY_PX = 903;
const CHEST_ALIGN_RATIO = 612 / 550;

const SIZES = [
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
];

const BLUE_FRONT = {
  90: { widthCm: 18, heightCm: 24 },
  110: { widthCm: 22, heightCm: 30 },
  130: { widthCm: 25, heightCm: 35 },
  150: { widthCm: 29, heightCm: 41 },
  160: { widthCm: 32, heightCm: 44 },
  GS: { widthCm: 29, heightCm: 41 },
  GM: { widthCm: 32, heightCm: 44 },
  GL: { widthCm: 35, heightCm: 46 },
  S: { widthCm: 35, heightCm: 46 },
  M: { widthCm: 35, heightCm: 50 },
  L: { widthCm: 38, heightCm: 52 },
  XL: { widthCm: 40, heightCm: 55 },
  XXL: { widthCm: 42, heightCm: 58 },
  XXXL: { widthCm: 45, heightCm: 60 },
};

const BLUE_BACK = {
  90: { widthCm: 20, heightCm: 22 },
  110: { widthCm: 24, heightCm: 27 },
  130: { widthCm: 27, heightCm: 31 },
  150: { widthCm: 31, heightCm: 36 },
  160: { widthCm: 34, heightCm: 39 },
  GS: { widthCm: 31, heightCm: 36 },
  GM: { widthCm: 34, heightCm: 39 },
  GL: { widthCm: 36, heightCm: 42 },
  S: { widthCm: 36, heightCm: 42 },
  M: { widthCm: 38, heightCm: 45 },
  L: { widthCm: 40, heightCm: 48 },
  XL: { widthCm: 42, heightCm: 50 },
  XXL: { widthCm: 44, heightCm: 52 },
  XXXL: { widthCm: 46, heightCm: 54 },
};

const CHEST_CM = {
  90: 36,
  110: 40,
  130: 44,
  150: 48,
  160: 50,
  GS: 48,
  GM: 50,
  GL: 52,
  S: 52,
  M: 52,
  L: 54,
  XL: 56,
  XXL: 58,
  XXXL: 60,
};

const LENGTH_CM = {
  90: 44,
  110: 48,
  130: 52,
  150: 56,
  160: 58,
  GS: 56,
  GM: 58,
  GL: 60,
  S: 60,
  M: 69,
  L: 71,
  XL: 73,
  XXL: 75,
  XXXL: 77,
};

const CENTER_X = 512;
const PLACEMENT_REF = { x: 0.5, y: 0.5 };

function shirtScale(size) {
  return CHEST_CM[size] / BASELINE_CHEST;
}

function garmentVisualRenderScale(size) {
  return shirtScale(size) * CHEST_ALIGN_RATIO;
}

/** Designer: getDesignerFactoryOverlayContainerStyle → factoryOverlayRectCmToTemplatePx */
function designerPrintableRectPx(side, size) {
  const blue =
    side === "front" ? BLUE_FRONT[size] : BLUE_BACK[size];
  const topPx =
    COLLAR_Y + PRINT_OFFSET_CM[side] * PX_PER_CM;
  const widthPx = blue.widthCm * PX_PER_CM;
  const heightPx = blue.heightCm * PX_PER_CM;
  const leftPx = CENTER_X - widthPx / 2;
  return { leftPx, topPx, widthPx, heightPx, transform: "none" };
}

/** Preview: getPreviewArtworkStageStyle → center ref + translate(-50%,-50%) */
function previewArtworkStageRectPx(size) {
  const blue = BLUE_FRONT[size];
  const chest = CHEST_CM[size];
  const length = LENGTH_CM[size];
  const renderScale = garmentVisualRenderScale(size);
  const garmentWidthPx = VISUAL_CHEST_PX * renderScale;
  const garmentHeightPx = VISUAL_BODY_PX * renderScale;
  const widthPx = (blue.widthCm / chest) * garmentWidthPx;
  const heightPx = (blue.heightCm / length) * garmentHeightPx;
  const centerX = PLACEMENT_REF.x * CANVAS_W;
  const centerY = PLACEMENT_REF.y * CANVAS_H;
  return {
    leftPx: centerX - widthPx / 2,
    topPx: centerY - heightPx / 2,
    widthPx,
    heightPx,
    transform: "translate(-50%, -50%)",
  };
}

/** Designer workspace always uses M overlay for container geometry */
function designerWorkspaceContainerPx(side) {
  return designerPrintableRectPx(side, "M");
}

function previewArtworkStageFixedMPx(side) {
  void side;
  return previewArtworkStageRectPx("M");
}

function rectDelta(a, b) {
  return {
    dLeft: b.leftPx - a.leftPx,
    dTop: b.topPx - a.topPx,
    dWidth: b.widthPx - a.widthPx,
    dHeight: b.heightPx - a.heightPx,
  };
}

const lines = [];
const log = (s = "") => lines.push(s);

log("# Garment Anchor Runtime Audit — Phase 15.3.1");
log("");
log("Analysis only. No runtime files modified.");
log("");

log("## A. Runtime Dependency Graph");
log("");
log("```");
log("Designer Canvas");
log("  → DesignCanvas.tsx");
log("  → getDesignerWorkspaceContainerStyle(side)");
log("  → designer-workspace.ts (size fixed = M)");
log("  → getDesignerFactoryOverlayContainerStyle(side, M)");
log("  → factoryOverlayRectCmToTemplatePx(resolveFactoryOverlayRectCm)");
log("  → buildUiPrintAreaContainerStyleFromPx  [top-left, transform: none]");
log("  → Layer: getLayerDesignerDisplayCssPercent");
log("  → designer-display-projection → facade → garmentPrintable denominator");
log("");
log("Preview Shirt");
log("  → PreviewGarmentView.tsx");
log("  → getPreviewArtworkStageStyle(side)  [size fixed = M]");
log("  → getPreviewPrintReference(side, { size: M })");
log("  → buildUiPrintAreaContainerStyle + translate(-50%, -50%)");
log("  → getDesignerBlueVisualContainerPct(M)  [Garment Visual Profile]");
log("  → Layer: previewGarmentRectToPhysicalStyle");
log("  → garmentPrintable (position) + physicalReferencePrintable (size)");
log("```");
log("");

log("## B. Anchor Comparison Table @ Front · M");
log("");
const designerM = designerWorkspaceContainerPx("front");
const previewM = previewArtworkStageFixedMPx("front");
const deltaM = rectDelta(designerM, previewM);
log("| Property | Designer (Factory Overlay) | Preview (Artwork Stage) | Δ |");
log("|----------|---------------------------|-------------------------|---|");
log(`| Top (px) | ${designerM.topPx.toFixed(2)} | ${previewM.topPx.toFixed(2)} | ${deltaM.dTop.toFixed(2)} |`);
log(`| Left (px) | ${designerM.leftPx.toFixed(2)} | ${previewM.leftPx.toFixed(2)} | ${deltaM.dLeft.toFixed(2)} |`);
log(`| Width (px) | ${designerM.widthPx.toFixed(2)} | ${previewM.widthPx.toFixed(2)} | ${deltaM.dWidth.toFixed(2)} |`);
log(`| Height (px) | ${designerM.heightPx.toFixed(2)} | ${previewM.heightPx.toFixed(2)} | ${deltaM.dHeight.toFixed(2)} |`);
log(`| Transform | ${designerM.transform} | ${previewM.transform} | **fork** |`);
log(`| Neck offset (cm) | ${PRINT_OFFSET_CM.front} | ${PRINT_OFFSET_CM.front} | 0 |`);
log(`| Collar anchor Y | ${COLLAR_Y} | ${COLLAR_Y} (unused in preview ref path) | **fork** |`);
log(`| Shirt scale on PNG | none (DesignCanvas) | getGarmentVisualRenderScale(M) on PreviewGarmentVisual | **fork** |`);
log(`| Transform origin | n/a | center center (shirt visual) | **fork** |`);
log("");

log("## C. Size-Dependent Printable Rect Divergence (Preview stage fixed @ M)");
log("");
log("| Size | Designer container (always M px) | Preview stage (always M px) | Layer position denom (garment blue cm) |");
log("|------|----------------------------------|-----------------------------|----------------------------------------|");
for (const size of SIZES) {
  const d = designerWorkspaceContainerPx("front");
  const p = previewArtworkStageFixedMPx("front");
  const blue = BLUE_FRONT[size];
  log(
    `| ${size} | ${d.widthPx.toFixed(0)}×${d.heightPx.toFixed(0)} @ (${d.leftPx.toFixed(0)},${d.topPx.toFixed(0)}) | ${p.widthPx.toFixed(0)}×${p.heightPx.toFixed(0)} @ (${p.leftPx.toFixed(0)},${p.topPx.toFixed(0)}) | ${blue.widthCm}×${blue.heightCm} |`,
  );
}
log("");
log("Designer container geometry is **identical for all sizes**. Preview artwork stage is **identical for all sizes**.");
log("Layer CSS % denominator varies by size (garment blue cm). Container px/cm ratio therefore varies by size → offset grows as garment printable shrinks.");
log("");

log("## D. Root Cause");
log("");
log("**② Preview Artwork Stage problem** (manifestation of **③ Garment Anchor fork**).");
log("");
log("Not ① Layer Position alone: Phase 15.3 aligned layer % formula with Designer, but parent container anchors differ.");
log("Not ④ Shirt Bounding Box alone: shirt PNG scale differs (Designer none vs Preview M-scale) but print overlays are siblings; primary drift is overlay anchor.");
log("Not ⑤ Neck Anchor alone: both use PRINT_AREA_OFFSET_CM front=7 / back=5 in cm space, but Preview UI path does not apply collar-based top-left for artwork stage.");
log("");
log("**Unique root cause:** Designer Blue Print Area uses **Factory Overlay top-left px** (`getDesignerFactoryOverlayContainerStyle`); Preview Artwork Stage uses **center ref + translate(-50%,-50%)** (`getPreviewArtworkStageStyle` + `PREVIEW_REFERENCE_TRANSFORM`). Different Top/Left/Width/Height on the same 1024×1536 canvas even @ M. Smaller sizes amplify perceived drift because layer position % uses shrinking garment printable cm inside mismatched parent rects.");
log("");

log("## E. Minimal Fix Scope (no implementation)");
log("");
log("**Primary:** `lib/preview-runtime.ts` — `getPreviewArtworkStageStyle` should use the same DOM anchor as Designer (`getDesignerFactoryOverlayContainerStyle` / top-left px path), not `getPreviewPrintReference` + center transform.");
log("");
log("**Secondary (if needed after anchor unify):** reconcile split denominators in `previewGarmentRectToPhysicalStyle` (position vs size) against a single parent cm frame.");
log("");
log("**Do not modify:** facade, controller, workspace storage, export-runtime, designer-display-projection.");
log("");

log("## F. Shared vs Forked Runtime");
log("");
log("| Layer | Shared? | Fork point |");
log("|-------|---------|------------|");
log("| Garment printable cm (`resolveGarmentPrintAreaCm`) | ✅ Yes | — |");
log("| Factory overlay cm (`resolveFactoryOverlayRectCm`) | ✅ Yes | — |");
log("| Collar offset cm (`PRINT_AREA_OFFSET_CM`) | ✅ Yes | — |");
log("| **DOM printable rect on template** | ❌ No | `getDesignerFactoryOverlayContainerStyle` vs `getPreviewArtworkStageStyle` |");
log("| Layer CSS % denominator (position) | ✅ Yes (post-15.3) | — |");
log("| Layer CSS % denominator (size) | ❌ No | Designer: garment / Preview: M-reference |");
log("");

const reportPath = join(ROOT, "docs/garment-anchor-audit-15-3-1.md");
writeFileSync(reportPath, lines.join("\n"));

console.log("audit-garment-anchor-15-3-1\n");
console.log(lines.join("\n"));
console.log(`\n→ wrote ${reportPath}`);

const maxTopDelta = Math.abs(deltaM.dTop);
const maxLeftDelta = Math.abs(deltaM.dLeft);
if (maxTopDelta > 1 || maxLeftDelta > 1) {
  console.log(
    `\n✓ Audit complete — Designer vs Preview @ M: Δtop=${deltaM.dTop.toFixed(1)}px Δleft=${deltaM.dLeft.toFixed(1)}px (anchor fork confirmed)`,
  );
}
