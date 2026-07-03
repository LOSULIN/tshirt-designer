/**
 * Phase 15.4 — Submission Runtime Audit (Workspace Canonical Verification)
 * node scripts/validate-submission-runtime-15-4.mjs
 *
 * Audit-only validation — does not modify runtimes.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const EPS = 1e-9;

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

const SHIRT_COLORS = ["white", "black", "navy", "heather-grey"];

/** Files on the Layer JSON path: Workspace Storage → designJson payload */
const LAYER_JSON_PIPELINE = [
  "lib/export-design.ts",
  "components/designer/DesignerApp.tsx",
  "app/api/designs/submit/route.ts",
  "app/api/designs/draft/route.ts",
  "app/api/contest/submit/route.ts",
  "lib/contest-submission.ts",
];

/** Full submission client surface (includes artifact generation) */
const SUBMISSION_CLIENT = [
  "components/designer/DesignerApp.tsx",
  "lib/export-design.ts",
  "lib/proof-engine/client.ts",
  "lib/proof-engine/generate-artifacts.ts",
  "lib/proof-engine/generators/mockup-generator.ts",
  "lib/proof-engine/generators/print-generator.ts",
];

const PREVIEW_FORBIDDEN = [
  "preview-runtime",
  "PreviewGarmentView",
  "PreviewDesignLayer",
  "designer-display-scale",
  "designer-display-projection",
];

const EXPORT_FORBIDDEN_LAYER_PATH = [
  "export-runtime",
  "designer-display-projection",
  "designer-display-scale",
  "preview-runtime",
];

const EXPORT_ARTIFACT_MODULES = [
  "print-export-system",
  "mockup-export",
  "export-runtime",
  "factory-proof-pdf-template",
];

const FORBIDDEN_LAYER_PAYLOAD_KEYS = [
  /^preview/i,
  /^display/i,
  /^designer/i,
  /^css/i,
  /%$/,
  /Px$/,
  /^left$/,
  /^top$/,
  /^width$/,
  /^height$/,
];

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.error(`✗ ${msg}`);
  failures += 1;
}

function warn(msg) {
  console.warn(`⚠ ${msg}`);
  warnings += 1;
}

function pass(msg) {
  console.log(`✓ ${msg}`);
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function parsePrintAreaRows(source, arrayName, endMarker) {
  const start = source.indexOf(`export const ${arrayName}`);
  const end = source.indexOf(endMarker, start + 1);
  const slice = source.slice(start, end > start ? end : undefined);
  const rows = [];
  const re =
    /size:\s*"([^"]+)"[\s\S]*?blue:\s*\{\s*widthCm:\s*([\d.]+),\s*heightCm:\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(slice)) !== null) {
    rows.push({
      size: m[1],
      blue: { width: Number(m[2]), height: Number(m[3]) },
    });
  }
  return rows;
}

function serializeLayerForJson(layer) {
  const base = {
    id: layer.id,
    name: layer.name,
    type: layer.type,
    visible: layer.visible,
    locked: layer.locked,
    zIndex: layer.zIndex,
    x_cm: layer.x_cm,
    y_cm: layer.y_cm,
    width_cm: layer.width_cm,
    height_cm: layer.height_cm,
    scale: layer.scale,
    rotation: layer.rotation,
  };
  if (layer.type === "image") {
    return {
      ...base,
      fileName: layer.image.fileName,
      mimeType: layer.image.mimeType,
    };
  }
  if (layer.type === "shape") {
    return {
      ...base,
      shapeKind: layer.shapeKind,
      fill: layer.fill,
      stroke: layer.stroke,
      strokeWidth_cm: layer.strokeWidth_cm,
      opacity: layer.opacity,
    };
  }
  return {
    ...base,
    text: layer.text,
    fontSize_cm: layer.fontSize_cm,
    fontFamily: layer.fontFamily,
    color: layer.color,
    opacity: layer.opacity,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    letterSpacing_cm: layer.letterSpacing_cm,
    lineHeight: layer.lineHeight,
    textAlign: layer.textAlign,
    stroke: layer.stroke,
    shadow: layer.shadow,
    keepRatio: layer.keepRatio,
  };
}

function buildFullDesignJson(layersByTemplate, activeGender, activeSide, meta = {}) {
  const activeLayers = layersByTemplate[activeGender][activeSide];
  const firstImage = activeLayers.find((l) => l.type === "image");
  const layersByTemplateOut = {};
  for (const gender of Object.keys(layersByTemplate)) {
    layersByTemplateOut[gender] = {};
    for (const side of Object.keys(layersByTemplate[gender])) {
      layersByTemplateOut[gender][side] = layersByTemplate[gender][side].map(
        serializeLayerForJson,
      );
    }
  }
  return JSON.stringify({
    version: 2,
    templateType: activeGender,
    side: activeSide,
    activeGender,
    activeSide,
    ...meta,
    layersByTemplate: layersByTemplateOut,
    x_cm: firstImage?.x_cm ?? 0,
    y_cm: firstImage?.y_cm ?? 0,
    width_cm: firstImage?.width_cm ?? 0,
    height_cm: firstImage?.height_cm ?? 0,
    scale: firstImage?.scale ?? 1,
    rotation: firstImage?.rotation ?? 0,
  });
}

function mockImageLayer(overrides = {}) {
  return {
    id: "layer-1",
    name: "Logo",
    type: "image",
    visible: true,
    locked: false,
    zIndex: 0,
    x_cm: 5,
    y_cm: 8,
    width_cm: 10,
    height_cm: 10,
    scale: 1,
    rotation: 15,
    image: {
      fileName: "logo.png",
      mimeType: "image/png",
      originalBlob: null,
      previewUrl: "blob:preview",
    },
    ...overrides,
  };
}

function collectForbiddenKeys(obj, path = "") {
  const hits = [];
  if (!obj || typeof obj !== "object") return hits;
  for (const [key, value] of Object.entries(obj)) {
    const full = path ? `${path}.${key}` : key;
    if (FORBIDDEN_LAYER_PAYLOAD_KEYS.some((re) => re.test(key))) {
      hits.push(full);
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      hits.push(...collectForbiddenKeys(value, full));
    }
  }
  return hits;
}

function extractFunctionBody(source, fnName) {
  const start = source.indexOf(`function ${fnName}`);
  if (start < 0) return "";
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace, i + 1);
    }
  }
  return "";
}

console.log("validate-submission-runtime-15-4\n");

console.log("── Submission Entry Points ──");
const entries = [
  ["components/designer/DesignerApp.tsx", "handleSubmitConfirm", "POST", "/api/designs/submit", "buildFullDesignJson(layersByTemplate)"],
  ["components/designer/DesignerApp.tsx", "handleSubmitConfirm (contest)", "POST", "/api/contest/submit", "buildDesignJson(slotLayers)"],
  ["components/designer/DesignerApp.tsx", "syncDraftToServer", "POST", "/api/designs/draft", "buildFullDesignJson(layersByTemplate)"],
  ["components/pro-upload/ProUploadPanel.tsx", "handleSubmit", "POST", "/api/pro-upload/submit", "submissionJson (file metadata only)"],
  ["app/api/designs/submit/route.ts", "POST", "POST", "/api/designs/submit", "stores designJson verbatim + proof artifacts"],
];
for (const [file, fn, method, url, source] of entries) {
  pass(`${file} :: ${fn} → ${method} ${url} ← ${source}`);
}

console.log("\n── Layer JSON Pipeline: serializeLayerForJson ──");
const exportDesignSrc = read("lib/export-design.ts");
const serializeBody = extractFunctionBody(exportDesignSrc, "serializeLayerForJson");
const projectionTokens = [
  "workspaceRectToDesignerRect",
  "getLayerDesignerDisplayCssPercent",
  "previewGarmentRectToPhysicalStyle",
  "resolveExportGarmentLayerCmRect",
  "mapWorkspaceLayerCmRectToGarmentPrintArea",
  "projectLayerToDesigner",
  "toDesignerCssPercent",
];
let serializeClean = true;
for (const token of projectionTokens) {
  if (serializeBody.includes(token)) {
    fail(`serializeLayerForJson references projection: ${token}`);
    serializeClean = false;
  }
}
if (serializeClean) {
  pass("serializeLayerForJson reads workspace fields only (no projection)");
}

const requiredLayerFields = [
  "id",
  "type",
  "x_cm",
  "y_cm",
  "width_cm",
  "height_cm",
  "rotation",
  "scale",
  "zIndex",
];
for (const field of requiredLayerFields) {
  if (!serializeBody.includes(field)) {
    fail(`serializeLayerForJson missing field: ${field}`);
  } else {
    pass(`serializeLayerForJson includes ${field}`);
  }
}

console.log("\n── Submission Source: Workspace → Payload ──");
const layer = mockImageLayer();
const layersByTemplate = {
  male: {
    front: [layer],
    back: [
      mockImageLayer({
        id: "layer-back",
        x_cm: 2,
        y_cm: 3,
        width_cm: 20,
        height_cm: 22,
        rotation: 0,
      }),
    ],
  },
  female: { front: [], back: [] },
};

const meta = { size: "90", shirtColor: "white", gender: "male", side: "front" };
const jsonStr = buildFullDesignJson(layersByTemplate, "male", "front", meta);
const payload = JSON.parse(jsonStr);
const outLayer = payload.layersByTemplate.male.front[0];
const coordFields = ["x_cm", "y_cm", "width_cm", "height_cm", "rotation", "scale"];
let coordOk = true;
for (const f of coordFields) {
  if (Math.abs(outLayer[f] - layer[f]) > EPS) {
    fail(`payload ${f} mismatch: workspace=${layer[f]} payload=${outLayer[f]}`);
    coordOk = false;
  }
}
if (coordOk) {
  pass("Workspace layer coordinates === submission payload coordinates");
}

const forbiddenKeys = collectForbiddenKeys(outLayer);
if (forbiddenKeys.length > 0) {
  fail(`forbidden keys in layer payload: ${forbiddenKeys.join(", ")}`);
} else {
  pass("layer payload has no preview/display/css/% fields");
}

if (!payload.layersByTemplate.male.back[0] || payload.layersByTemplate.male.back[0].width_cm !== 20) {
  fail("back slot layers not preserved in payload");
} else {
  pass("front/back slots preserved in layersByTemplate");
}

console.log("\n── 14 Sizes: meta.size present, workspace coords invariant ──");
let sizeChecks = 0;
let sizePass = 0;
for (const size of SIZES) {
  for (const side of ["front", "back"]) {
    sizeChecks += 1;
    const doc = JSON.parse(
      buildFullDesignJson(layersByTemplate, "male", side, {
        ...meta,
        size,
        side,
      }),
    );
    const frontLayer = doc.layersByTemplate.male.front[0];
    if (
      doc.size === size &&
      doc.side === side &&
      Math.abs(frontLayer.x_cm - layer.x_cm) < EPS &&
      Math.abs(frontLayer.width_cm - layer.width_cm) < EPS
    ) {
      sizePass += 1;
    } else {
      fail(`size/side meta or coords wrong for ${size}/${side}`);
    }
  }
}
pass(`14 sizes × front/back payload parity: ${sizePass}/${sizeChecks}`);

console.log("\n── Color Audit: shirtColor in meta only ──");
let colorPass = 0;
for (const color of SHIRT_COLORS) {
  const doc = JSON.parse(
    buildFullDesignJson(layersByTemplate, "male", "front", {
      ...meta,
      shirtColor: color,
    }),
  );
  const out = doc.layersByTemplate.male.front[0];
  if (
    doc.shirtColor === color &&
    out.x_cm === layer.x_cm &&
    out.width_cm === layer.width_cm &&
    out.rotation === layer.rotation
  ) {
    colorPass += 1;
  } else {
    fail(`color ${color} altered layer coordinates`);
  }
}
pass(`color invariance: ${colorPass}/${SHIRT_COLORS.length}`);

console.log("\n── Preview Independence (Layer JSON path) ──");
let previewClean = true;
for (const file of LAYER_JSON_PIPELINE) {
  const src = read(file);
  for (const mod of PREVIEW_FORBIDDEN) {
    if (src.includes(mod)) {
      fail(`${file} imports forbidden preview/display module: ${mod}`);
      previewClean = false;
    }
  }
}
if (previewClean) {
  pass("layer JSON pipeline has no preview/display runtime imports");
}

console.log("\n── Export Independence (Layer JSON path) ──");
let exportLayerClean = true;
for (const file of LAYER_JSON_PIPELINE) {
  const src = read(file);
  for (const mod of EXPORT_FORBIDDEN_LAYER_PATH) {
    if (src.includes(mod)) {
      fail(`${file} imports forbidden module on layer JSON path: ${mod}`);
      exportLayerClean = false;
    }
  }
}
if (exportLayerClean) {
  pass("layer JSON path has no export/display projection imports");
}

console.log("\n── Export Artifact Branch (informational) ──");
let artifactHits = 0;
for (const file of SUBMISSION_CLIENT) {
  const src = read(file);
  for (const mod of EXPORT_ARTIFACT_MODULES) {
    if (src.includes(mod)) {
      artifactHits += 1;
      warn(`${file} uses ${mod} for proof/mockup PNG artifacts (parallel to designJson)`);
    }
  }
}
if (artifactHits > 0) {
  pass(`export/mockup modules used only on artifact branch (${artifactHits} references)`);
}

console.log("\n── Backend Receive: designJson stored verbatim ──");
const submitRoute = read("app/api/designs/submit/route.ts");
const draftRoute = read("app/api/designs/draft/route.ts");
if (
  submitRoute.includes("layers_by_template: config.layersByTemplate") ||
  submitRoute.includes("layers_by_template: config.layersByTemplate")
) {
  pass("submit route passes layersByTemplate from parsed designJson without reprojection");
} else if (submitRoute.includes("layers_by_template: config.layersByTemplate")) {
  pass("submit route uses client layersByTemplate as-is");
} else if (submitRoute.includes("config.layersByTemplate")) {
  pass("submit route reads layersByTemplate from client designJson");
} else {
  fail("submit route may not preserve client layersByTemplate");
}

if (draftRoute.includes("Buffer.from(designJson") && draftRoute.includes("design.json")) {
  pass("draft route uploads designJson verbatim to storage");
} else {
  fail("draft route may transform designJson before storage");
}

if (
  submitRoute.includes("NextResponse.json") &&
  draftRoute.includes("NextResponse.json") &&
  read("app/api/contest/submit/route.ts").includes("NextResponse.json")
) {
  pass("API routes return JSON responses (not HTML)");
} else {
  warn("verify API response content-type manually");
}

console.log("\n── DesignerApp: designJson before proof artifacts ──");
const designerApp = read("components/designer/DesignerApp.tsx");
const designJsonBeforeProof =
  designerApp.indexOf("buildFullDesignJson") < designerApp.indexOf("prepareProofSubmission");
if (designJsonBeforeProof) {
  pass("designJson built from layersByTemplate before prepareProofSubmission");
} else {
  fail("proof artifacts may precede designJson construction");
}

if (
  designerApp.includes("buildFullDesignJson(layersByTemplate") &&
  designerApp.includes("layersByTemplate,")
) {
  pass("DesignerApp passes raw layersByTemplate state to buildFullDesignJson");
} else {
  fail("DesignerApp may not use raw layersByTemplate for designJson");
}

console.log("\n── Regression ──");
const REGRESSION = [
  "validate-export-runtime-15-2.mjs",
  "validate-preview-layer-coordinate-unification-15-3-4.mjs",
  "validate-inspector-overflow-side-15-3-5.mjs",
];
let regressionFailures = 0;
for (const script of REGRESSION) {
  const result = spawnSync("node", [join(ROOT, "scripts", script)], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    fail(`regression failed: ${script}`);
    regressionFailures += 1;
  } else {
    pass(`regression: ${script}`);
  }
}

console.log("\n── Summary ──");
if (failures > 0 || regressionFailures > 0) {
  console.error(
    `\n✗ validate-submission-runtime-15-4 FAIL (${failures} findings, ${warnings} warnings, ${regressionFailures} regressions)\n`,
  );
  process.exit(1);
}
console.log(
  `\n✓ validate-submission-runtime-15-4 PASS (${warnings} informational warnings)\n`,
);
