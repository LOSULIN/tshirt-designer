#!/usr/bin/env node
/**
 * Step 10.1 — Preview Scale Architecture Analysis（只分析，不修改 runtime）
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCodebaseCalibrationConstants } from "./lib/read-calibration-constants.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_JSON = path.join(ROOT, "public/guides/preview-scale-architecture-report.json");
const OUT_SVG = path.join(ROOT, "public/guides/preview-scale-flow.svg");

const SIZES = ["M", "90", "130", "GM", "XL", "XXXL"];
const CONTAINER = { width: 1024, height: 1536 };
const MIN_PREVIEW_PRINT_AREA_SCALE = 0.85;
const SILHOUETTE_SCALE = 1.1127;
const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75];
const MIN_CANVAS_ZOOM = 0.75;
const MAX_CANVAS_ZOOM = 1.75;
const BLUE_CM = { width: 35, height: 50 };
const PX_PER_CM = 12.24;

function round(n, d = 4) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function parseProductChestBySize() {
  const src = fs.readFileSync(path.join(ROOT, "lib/product-size-config.ts"), "utf8");
  const map = {};
  const re = /size:\s*"([^"]+)"[\s\S]*?chest:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    map[m[1]] = Number(m[2]);
  }
  return map;
}

function getShirtScale(size, baselineChestCm, chestBySize) {
  const chest = chestBySize[size];
  if (chest != null) return chest / baselineChestCm;
  const sizesSrc = fs.readFileSync(path.join(ROOT, "lib/sizes.ts"), "utf8");
  const legacy = sizesSrc.match(
    new RegExp(`\\{\\s*size:\\s*"${size}"[\\s\\S]*?chestCm:\\s*([\\d.]+)`),
  );
  if (!legacy) throw new Error(`Unknown size ${size}`);
  const legacyBaseline = sizesSrc.match(
    /\{\s*size:\s*"M",\s*chestCm:\s*([\d.]+)/,
  )[1];
  return Number(legacy[1]) / Number(legacyBaseline);
}

function getPreviewPrintAreaScale(shirtScale) {
  return Math.max(MIN_PREVIEW_PRINT_AREA_SCALE, shirtScale);
}

function getDefaultZoomForSize(shirtScale) {
  const target = Math.min(
    MAX_CANVAS_ZOOM,
    Math.max(MIN_CANVAS_ZOOM, 1 / shirtScale),
  );
  const index = ZOOM_STEPS.reduce(
    (best, step, i) =>
      Math.abs(step - target) < Math.abs(ZOOM_STEPS[best] - target) ? i : best,
    0,
  );
  return { zoom: ZOOM_STEPS[index], targetZoom: round(target), index };
}

function getBaseWidthPct() {
  return (BLUE_CM.width * PX_PER_CM) / CONTAINER.width;
}

function getBaseHeightPct() {
  return (BLUE_CM.height * PX_PER_CM) / CONTAINER.height;
}

function buildSizeRow(size, baselineChestCm, chestBySize) {
  const shirtScale = getShirtScale(size, baselineChestCm, chestBySize);
  const shirtVisualScale = shirtScale * SILHOUETTE_SCALE;
  const previewPrintAreaScale = getPreviewPrintAreaScale(shirtScale);
  const baseWPct = getBaseWidthPct();
  const baseHPct = getBaseHeightPct();
  const blueWidthPx = CONTAINER.width * baseWPct * previewPrintAreaScale;
  const blueHeightPx = CONTAINER.height * baseHPct * previewPrintAreaScale;
  const shirtArmpitPx = 550 * shirtVisualScale;
  const zoomInfo = getDefaultZoomForSize(shirtScale);

  const blueOverShirtGarmentRatio = previewPrintAreaScale / shirtScale;
  const shirtVisualOverBlueRatio = shirtVisualScale / previewPrintAreaScale;

  return {
    size,
    officialChestCm: chestBySize[size] ?? null,
    scales: {
      shirtScale,
      silhouetteScale: SILHOUETTE_SCALE,
      shirtVisualScale: round(shirtVisualScale),
      previewPrintAreaScale: round(previewPrintAreaScale),
      scaleDivergence: round(previewPrintAreaScale - shirtScale, 4),
      blueOverShirtGarmentRatio: round(blueOverShirtGarmentRatio),
      shirtVisualOverBlueRatio: round(shirtVisualOverBlueRatio),
      canvasZoomDefault: zoomInfo.zoom,
      canvasZoomTarget: zoomInfo.targetZoom,
      effectiveBlueOnScreenPx: round(blueWidthPx * zoomInfo.zoom, 1),
    },
    domPx: {
      blueWidthPx: round(blueWidthPx, 1),
      blueHeightPx: round(blueHeightPx, 1),
      shirtArmpitWidthPx: round(shirtArmpitPx, 1),
      blueOverArmpitWidthPct: round((blueWidthPx / shirtArmpitPx) * 100, 1),
    },
    issue:
      previewPrintAreaScale > shirtScale
        ? "previewPrintAreaScale floor causes blue to outscale shirt garment scale"
        : shirtVisualScale !== previewPrintAreaScale
          ? "silhouetteScale on shirt only — intentional post-9.1"
          : null,
  };
}

function buildFileImpact() {
  return {
    mustChange: [
      {
        path: "lib/coordinates/preview.ts",
        reason:
          "Remove getPreviewPrintAreaScale() floor; apply getShirtScale(size) directly in getPreviewPrintAreaContainerStyle() widthPct/heightPct multiplier",
      },
      {
        path: "lib/coordinates/garment.ts",
        reason:
          "getGarmentPrintSafeZonePctInPrintArea() computes printWidthPx without previewPrintAreaScale; if blue DOM scale changes, orange % math must use the same effective print rect as blue",
      },
    ],
    optionalChange: [
      {
        path: "components/designer/DesignCanvas.tsx",
        reason:
          "getDefaultZoomIndexForSize() currently compensates 1/shirtScale for small sizes; after blue follows shirtScale, zoom strategy and ZOOM_STEPS may need retuning",
      },
      {
        path: "lib/printArea.ts",
        reason: "Facade docs / deprecated helpers referencing preview scale behavior",
      },
      {
        path: "lib/coordinates/ui-print-area.ts",
        reason: "Passthrough only; verify editor/flat/model views stay consistent",
      },
      {
        path: "lib/coordinates/mockup.ts",
        reason:
          "Mockup paths use raw widthPct without previewPrintAreaScale — already diverges from editor; unify if single scale model",
      },
      {
        path: "lib/coordinates/debug-print-area.ts",
        reason: "Debug overlays mirror preview formulas",
      },
      {
        path: "components/designer/FlatShirtDesignView.tsx",
        reason: "Consumes getPrintAreaContainerStyle(); visual QA after scale unification",
      },
      {
        path: "components/designer/PrintAreaPreviewPanel.tsx",
        reason: "Standalone preview panel with own ZOOM_STEPS",
      },
      {
        path: "components/designer/ModelDesignPreview.tsx",
        reason: "Model preview print area via ui-print-area",
      },
      {
        path: "components/designer/CanvasCenterDebugOverlay.tsx",
        reason: "Uses getShirtScale for debug markers",
      },
      {
        path: "components/designer/PrintAreaDebugOverlay.tsx",
        reason: "Print area debug visualization",
      },
      {
        path: "scripts/report-*.mjs",
        reason: "Calibration / visual QA scripts duplicate previewPrintAreaScale formula",
      },
      {
        path: "public/guides/*.json",
        reason: "Regenerate calibration reports after scale change",
      },
    ],
    noChange: [
      {
        path: "lib/shirtScale.ts",
        reason: "Source of truth for chest-based garment scale; proposed blue scale = getShirtScale()",
      },
      {
        path: "lib/design-cm.ts",
        reason: "Layer cm, production contract, overlay px/cm — independent of preview DOM scale",
      },
      {
        path: "lib/coordinates/production.ts",
        reason: "Export / factory mm truth",
      },
      {
        path: "components/designer/ShirtVisualScale.tsx",
        reason: "Shirt PNG only; silhouetteScale intentionally separate from print overlay",
      },
      {
        path: "components/designer/PrintAreaElement.tsx",
        reason: "Layer % inside blue DOM — auto-follows blue size",
      },
      {
        path: "components/designer/PrintAreaGrid.tsx",
        reason: "Grid % inside blue; GarmentPrintSafeZoneGuide unchanged structurally",
      },
      {
        path: "lib/template-profile/*",
        reason: "silhouetteScale profile — shirt visual only",
      },
      {
        path: "lib/export/*, lib/proof-engine/*",
        reason: "Production / export pipelines confirmed correct in Step 9.2",
      },
    ],
  };
}

function buildSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 780" font-family="ui-sans-serif, system-ui, sans-serif">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 z" fill="#334155"/>
    </marker>
    <style>
      .title { font-size: 18px; font-weight: 700; fill: #0f172a; }
      .subtitle { font-size: 12px; fill: #64748b; }
      .box { rx: 8; stroke-width: 2; }
      .label { font-size: 13px; font-weight: 600; fill: #0f172a; }
      .detail { font-size: 11px; fill: #475569; }
      .flow { stroke: #334155; stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
      .warn { stroke: #ea580c; stroke-width: 2; stroke-dasharray: 6 4; fill: none; }
    </style>
  </defs>

  <text x="460" y="28" text-anchor="middle" class="title">Preview Scale Architecture Flow</text>
  <text x="460" y="48" text-anchor="middle" class="subtitle">Step 10.1 — runtime as-is (post silhouetteScale 9.1)</text>

  <!-- Canvas Zoom -->
  <rect x="330" y="70" width="260" height="72" class="box" fill="#e0f2fe" stroke="#0284c7"/>
  <text x="460" y="96" text-anchor="middle" class="label">Canvas Zoom</text>
  <text x="460" y="114" text-anchor="middle" class="detail">DesignCanvas → ZOOM_STEPS</text>
  <text x="460" y="130" text-anchor="middle" class="detail">ShirtContainerFrame transform: scale(zoom)</text>

  <!-- ShirtContainerFrame -->
  <rect x="300" y="170" width="320" height="56" class="box" fill="#f1f5f9" stroke="#64748b"/>
  <text x="460" y="194" text-anchor="middle" class="label">ShirtContainerFrame</text>
  <text x="460" y="212" text-anchor="middle" class="detail">1024×1536 logical container (inherits zoom)</text>

  <!-- Shirt PNG branch -->
  <rect x="40" y="270" width="300" height="110" class="box" fill="#dcfce7" stroke="#16a34a"/>
  <text x="190" y="296" text-anchor="middle" class="label">Shirt PNG</text>
  <text x="190" y="314" text-anchor="middle" class="detail">ShirtVisualScale.tsx</text>
  <text x="190" y="332" text-anchor="middle" class="detail">scale = getShirtScale(size)</text>
  <text x="190" y="350" text-anchor="middle" class="detail">× silhouetteScale (1.1127)</text>
  <text x="190" y="368" text-anchor="middle" class="detail">CSS transform on PNG wrapper only</text>

  <!-- Blue branch -->
  <rect x="580" y="270" width="300" height="110" class="box" fill="#dbeafe" stroke="#2563eb"/>
  <text x="730" y="296" text-anchor="middle" class="label">Blue Print Area</text>
  <text x="730" y="314" text-anchor="middle" class="detail">preview.ts → getPreviewPrintAreaContainerStyle()</text>
  <text x="730" y="332" text-anchor="middle" class="detail">scale = max(0.85, getShirtScale(size))</text>
  <text x="730" y="350" text-anchor="middle" class="detail">width/height % × previewPrintAreaScale</text>
  <text x="730" y="368" text-anchor="middle" class="detail">anchor: container center + translate(-50%,-50%)</text>

  <!-- Orange -->
  <rect x="580" y="420" width="300" height="88" class="box" fill="#ffedd5" stroke="#ea580c"/>
  <text x="730" y="446" text-anchor="middle" class="label">Orange Safe Zone</text>
  <text x="730" y="464" text-anchor="middle" class="detail">GarmentPrintSafeZoneGuide → garment.ts</text>
  <text x="730" y="482" text-anchor="middle" class="detail">% inside Blue DOM (collar+offset cm)</text>
  <text x="730" y="500" text-anchor="middle" class="detail">uses getShirtScale — not previewPrintAreaScale</text>

  <!-- Layer -->
  <rect x="580" y="540" width="300" height="88" class="box" fill="#ede9fe" stroke="#7c3aed"/>
  <text x="730" y="566" text-anchor="middle" class="label">Design Layer</text>
  <text x="730" y="584" text-anchor="middle" class="detail">PrintAreaElement → design-cm cm rect</text>
  <text x="730" y="602" text-anchor="middle" class="detail">% inside Blue DOM — no extra scale</text>
  <text x="730" y="620" text-anchor="middle" class="detail">production/export unchanged</text>

  <!-- Divergence note -->
  <rect x="40" y="420" width="300" height="88" class="box" fill="#fef2f2" stroke="#dc2626"/>
  <text x="190" y="446" text-anchor="middle" class="label">Scale Divergence (90/130)</text>
  <text x="190" y="466" text-anchor="middle" class="detail">Shirt: shirtScale × 1.1127</text>
  <text x="190" y="484" text-anchor="middle" class="detail">Blue: max(0.85, shirtScale)</text>
  <text x="190" y="502" text-anchor="middle" class="detail">→ Blue wider than shirt body</text>

  <!-- Production -->
  <rect x="40" y="540" width="300" height="72" class="box" fill="#f8fafc" stroke="#94a3b8"/>
  <text x="190" y="566" text-anchor="middle" class="label">Production / Export</text>
  <text x="190" y="584" text-anchor="middle" class="detail">production.ts mm — no preview scale</text>
  <text x="190" y="602" text-anchor="middle" class="detail">layer _cm fields unchanged</text>

  <!-- Arrows -->
  <path d="M460 142 L460 170" class="flow"/>
  <path d="M400 226 L190 270" class="flow"/>
  <path d="M520 226 L730 270" class="flow"/>
  <path d="M730 380 L730 420" class="flow"/>
  <path d="M730 508 L730 540" class="flow"/>
  <path d="M340 325 L580 325" class="warn"/>
  <text x="460" y="318" text-anchor="middle" class="detail" fill="#ea580c">sibling DOM — independent scales</text>

  <!-- Legend -->
  <text x="40" y="660" class="label">Legend</text>
  <rect x="40" y="672" width="16" height="16" fill="#dcfce7" stroke="#16a34a"/>
  <text x="64" y="684" class="detail">Garment visual (PNG)</text>
  <rect x="200" y="672" width="16" height="16" fill="#dbeafe" stroke="#2563eb"/>
  <text x="224" y="684" class="detail">Print overlay (preview only)</text>
  <rect x="400" y="672" width="16" height="16" fill="#ede9fe" stroke="#7c3aed"/>
  <text x="424" y="684" class="detail">Layer state (cm)</text>
  <line x1="600" y1="680" x2="640" y2="680" class="warn"/>
  <text x="648" y="684" class="detail">Scale mismatch boundary</text>

  <text x="40" y="720" class="detail">Proposed (Step 10.x): Blue = getShirtScale(); remove 0.85 floor; Canvas Zoom handles operability</text>
  <text x="40" y="740" class="detail">Shirt PNG keeps silhouetteScale; Blue/Layer/Export production cm unchanged</text>
</svg>
`;
}

function main() {
  const chestBySize = parseProductChestBySize();
  const baselineChestCm =
    chestBySize.M ??
    Number(
      fs
        .readFileSync(path.join(ROOT, "lib/sizes.ts"), "utf8")
        .match(/\{\s*size:\s*"M",\s*chestCm:\s*([\d.]+)/)[1],
    );

  const calibration = readCodebaseCalibrationConstants(ROOT);
  const sizeRows = SIZES.map((s) => buildSizeRow(s, baselineChestCm, chestBySize));

  const report = {
    schema: "preview-scale-architecture-report/v1",
    generatedAt: new Date().toISOString(),
    purpose:
      "Analyze preview scale data flow after Step 9.1 silhouetteScale; identify shirt vs blue divergence from previewPrintAreaScale floor",
    problem: {
      summary:
        "Shirt PNG scales with getShirtScale() × silhouetteScale; Blue scales with max(0.85, getShirtScale()). At child sizes 90/130, blue DOM exceeds shirt garment scale → blue wider than shirt body.",
      rootCause: "MIN_PREVIEW_PRINT_AREA_SCALE = 0.85 floor in getPreviewPrintAreaScale()",
    },
    coordinateSystems: [
      {
        id: "print-overlay",
        label: "Print overlay (layer cm, blue box, export)",
        pxPerCm: PX_PER_CM,
        scalesWithSize: "previewPrintAreaScale in preview only; production fixed",
      },
      {
        id: "garment-silhouette",
        label: "Garment silhouette (shirt PNG)",
        pxPerCm: "~10.58 (550px armpit @ M)",
        scalesWithSize: "getShirtScale() × silhouetteScale via ShirtVisualScale",
      },
    ],
    dataFlows: {
      shirtPng: {
        entry: "components/designer/ShirtVisualScale.tsx",
        chain: [
          "getCurrentTemplateProfile()",
          "getTemplateSilhouetteScale(profile) → 1.1127",
          "getShirtScale(size) from lib/shirtScale.ts (chest / M baseline)",
          "garmentScale = getShirtScale(size) × silhouetteScale",
          "CSS: transform scale(garmentScale); transform-origin center center",
        ],
        appliesTo: "ProcessedTemplateImage only — sibling to blue print area",
        doesNotAffect: ["layer cm state", "export", "production mm", "blue DOM size"],
      },
      bluePrintArea: {
        entry: "lib/coordinates/preview.ts → getPreviewPrintAreaContainerStyle()",
        chain: [
          "getShirtScale(size)",
          "getPreviewPrintAreaScale(size) = max(0.85, getShirtScale(size))",
          "getPreviewPrintAreaContainerPctForSide(side) → 35×50cm × 12.24 / container",
          "widthPct × previewPrintAreaScale, heightPct × previewPrintAreaScale",
          "getPreviewPrintReference() → getGarmentPrintReference() → container center anchor",
          "buildUiPrintAreaContainerStyle(ref, wPct, hPct, translate(-50%,-50%))",
          "Consumed via lib/printArea.ts getPrintAreaContainerStyle() → ui-print-area editor view",
        ],
        domOutput: "absolute div[data-print-area] width/height % + center anchor",
        doesNotAffect: ["layer cm", "export", "production"],
      },
      orangeSafeZone: {
        entry: "components/designer/PrintAreaGrid.tsx → GarmentPrintSafeZoneGuide",
        chain: [
          "getGarmentPrintSafeZonePctInPrintArea({ side, size }) in lib/coordinates/garment.ts",
          "getGarmentPrintMetrics() → collar anchor, printTopPx via getShirtScale",
          "getGarmentPrintSafeZoneCmForSize() → safe cm scaled by official chest",
          "Convert safe rect vs print rect → left/top/width/height % inside blue DOM",
        ],
        note:
          "Orange % math uses pxPerCm × cm without previewPrintAreaScale; positioned as child of blue — inherits blue DOM dimensions",
      },
      canvasZoom: {
        entry: "components/designer/DesignCanvas.tsx",
        chain: [
          "ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75]",
          "getDefaultZoomIndexForSize(size) → targetZoom = clamp(1 / getShirtScale(size), 0.75, 1.75)",
          "pick closest ZOOM_STEPS index",
          "ShirtContainerFrame fitRatio=0.9, zoom={zoom} → CSS scale on frame",
        ],
        scope: "Uniform scale on entire shirt container (shirt + blue + layers + guides)",
        purpose: "Compensate small garment scale for viewport operability — separate from previewPrintAreaScale floor",
      },
      designLayer: {
        entry: "components/designer/PrintAreaElement.tsx",
        chain: [
          "Layer state: x_cm, y_cm, width_cm, height_cm (design-cm / production bridge)",
          "Position: left/top/width/height % of printArea cm bounds inside blue DOM",
          "Drag/resize: clientPointToPrintCm relative to blue getBoundingClientRect()",
        ],
        scale: "None — follows blue DOM size; cm values are production truth",
      },
    },
    domHierarchy: {
      structure: [
        "ShirtContainerFrame (zoom transform)",
        "  └─ data-shirt-container 1024×1536",
        "       ├─ ShirtVisualScale → shirt PNG (garmentScale transform)",
        "       └─ div[data-print-area] blue (absolute %, NOT inside ShirtVisualScale)",
        "            ├─ GarmentPrintSafeZoneGuide orange (%)",
        "            ├─ PrintAreaGrid",
        "            └─ PrintAreaElement layers (%)",
      ],
      keyInsight:
        "Shirt and Blue are siblings; shirt CSS transform does not affect blue/layer geometry",
    },
    scaleFlowSummary: [
      { stage: "Canvas Zoom", multiplier: "ZOOM_STEPS[i]", affects: "entire ShirtContainerFrame" },
      { stage: "Shirt PNG", multiplier: "getShirtScale × silhouetteScale", affects: "template image only" },
      { stage: "Blue", multiplier: "max(0.85, getShirtScale)", affects: "print area DOM %" },
      { stage: "Orange", multiplier: "% of blue (cm via getShirtScale)", affects: "guide overlay" },
      { stage: "Layer", multiplier: "none (cm % of blue)", affects: "design state display" },
    ],
    perSize: sizeRows,
    childSizeIssue: {
      sizes: ["90", "130"],
      shirtScale90: sizeRows.find((r) => r.size === "90").scales.shirtScale,
      previewFloor: MIN_PREVIEW_PRINT_AREA_SCALE,
      blueOverShirtRatio90: sizeRows.find((r) => r.size === "90").scales.blueOverShirtGarmentRatio,
      explanation:
        "At 90: shirtScale≈0.558 but previewPrintAreaScale=0.85 → blue scales 52% larger than shirt garment scale; blue width 106.7% of armpit reference (Step 9.2 QA)",
    },
    hypotheticalRefactor: {
      proposal:
        "Remove previewPrintAreaScale(); Blue width/height % multiplier = getShirtScale(size); rely on Canvas Zoom for small-size operability",
      fileImpact: buildFileImpact(),
    },
    calibration: calibration.printCoordinateSystem,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(OUT_SVG, buildSvg());

  console.log("Preview Scale Architecture Report");
  console.log(`JSON: ${OUT_JSON}`);
  console.log(`SVG:  ${OUT_SVG}`);
  for (const row of sizeRows) {
    console.log(
      `${row.size}: shirtScale=${row.scales.shirtScale} visual=${row.scales.shirtVisualScale} blueScale=${row.scales.previewPrintAreaScale} blue/armpit=${row.domPx.blueOverArmpitWidthPct}% zoom=${row.scales.canvasZoomDefault}`,
    );
  }
}

main();
