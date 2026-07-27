#!/usr/bin/env node
/**
 * Phase 75.2 — Garment region extraction + pixel diff vs registry reference.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const ART = join(__dirname, "artifacts");
const DIFF = join(__dirname, "diff-output");
const REF_PREVIEW = join(
  ROOT,
  "public/products/UA35001/assets/adult-tshirt-white-front.png",
);
const REF_EXPORT = join(
  ROOT,
  "public/products/UA35001/assets/export/adult-tshirt-white-front.png",
);
const REF_LEGACY = join(ROOT, "public/templates/adult-tshirt-white-front.png");

const TOLERANCE = 0.12;
const PASS_DIFF_PERCENT = 3.5;
const ALPHA_GARMENT_THRESHOLD = 24;

mkdirSync(DIFF, { recursive: true });

async function loadPngSharp(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const png = new PNG({ width: info.width, height: info.height });
  png.data = Buffer.from(data);
  return png;
}

async function resizeTo(png, width, height) {
  const buf = PNG.sync.write(png);
  const { data, info } = await sharp(buf)
    .resize(width, height, { fit: "fill", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = new PNG({ width: info.width, height: info.height });
  out.data = Buffer.from(data);
  return out;
}

function alphaBBox(png, threshold = ALPHA_GARMENT_THRESHOLD) {
  const { width, height, data } = png;
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > threshold) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Garment mask = reference alpha silhouette.
 * Exclude pixels where |candidate-reference| suggests artwork overlay (center chest).
 */
function buildGarmentCompareMask(refNorm, candidate, refOriginal) {
  const { width, height } = refNorm;
  const mask = new Uint8Array(width * height);
  const w = width;
  const h = height;
  const cx = w * 0.5;
  const cy = h * 0.42;
  const chestR = Math.min(w, h) * 0.22;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (refNorm.data[o + 3] <= ALPHA_GARMENT_THRESHOLD) continue;

      const dr = Math.abs(candidate.data[o] - refNorm.data[o]);
      const dg = Math.abs(candidate.data[o + 1] - refNorm.data[o + 1]);
      const db = Math.abs(candidate.data[o + 2] - refNorm.data[o + 2]);
      const delta = dr + dg + db;

      const dx = x - cx;
      const dy = y - cy;
      const inChest = dx * dx + dy * dy < chestR * chestR;
      if (inChest && delta > 60) continue;

      if (refOriginal && delta > 120) continue;
      mask[i] = 1;
    }
  }
  return mask;
}

async function compareGarmentRegions(reference, candidate, label, options = {}) {
  const refNorm =
    reference.width === candidate.width && reference.height === candidate.height
      ? reference
      : await resizeTo(reference, candidate.width, candidate.height);

  const mask = buildGarmentCompareMask(
    refNorm,
    candidate,
    options.excludeArtworkFromRef ? reference : null,
  );

  const { width, height } = candidate;
  const maskedRef = new PNG({ width, height });
  const maskedCand = new PNG({ width, height });
  const diff = new PNG({ width, height });

  let compared = 0;
  let diffPixels = 0;

  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (!mask[i]) {
      diff.data[o + 3] = 0;
      continue;
    }
    compared++;
    maskedRef.data[o] = refNorm.data[o];
    maskedRef.data[o + 1] = refNorm.data[o + 1];
    maskedRef.data[o + 2] = refNorm.data[o + 2];
    maskedRef.data[o + 3] = 255;
    maskedCand.data[o] = candidate.data[o];
    maskedCand.data[o + 1] = candidate.data[o + 1];
    maskedCand.data[o + 2] = candidate.data[o + 2];
    maskedCand.data[o + 3] = 255;

    const dr = Math.abs(refNorm.data[o] - candidate.data[o]);
    const dg = Math.abs(refNorm.data[o + 1] - candidate.data[o + 1]);
    const db = Math.abs(refNorm.data[o + 2] - candidate.data[o + 2]);
    if (dr + dg + db > TOLERANCE * 255 * 3) {
      diffPixels++;
      diff.data[o] = 255;
      diff.data[o + 1] = 0;
      diff.data[o + 2] = 0;
      diff.data[o + 3] = 255;
    }
  }

  const percent = compared > 0 ? (diffPixels / compared) * 100 : 100;

  const overlay = await sharp(PNG.sync.write(refNorm))
    .composite([{ input: PNG.sync.write(candidate), blend: "over", opacity: 0.45 }])
    .png()
    .toBuffer();

  const outBase = join(DIFF, label);
  writeFileSync(`${outBase}-heatmap.png`, PNG.sync.write(diff));
  writeFileSync(`${outBase}-overlay.png`, overlay);
  writeFileSync(`${outBase}-garment-mask.png`, PNG.sync.write(maskedCand));
  writeFileSync(`${outBase}-reference-masked.png`, PNG.sync.write(maskedRef));

  const refBox = alphaBBox(refNorm);
  const candBox = bboxFromMask(mask, width, height);

  const unexpectedCrop =
    refBox &&
    candBox &&
    (Math.abs(candBox.width - refBox.width) > refBox.width * 0.05 ||
      Math.abs(candBox.height - refBox.height) > refBox.height * 0.05);

  return {
    label,
    referenceSize: { width: reference.width, height: reference.height },
    candidateSize: { width: candidate.width, height: candidate.height },
    comparedSize: { width, height },
    scaleX: candidate.width / reference.width,
    scaleY: candidate.height / reference.height,
    interpolation:
      reference.width === candidate.width ? "none" : "lanczos3-to-candidate",
    rotation: 0,
    garmentMaskPixels: compared,
    diffPixels,
    diffPercent: percent,
    pass: percent <= PASS_DIFF_PERCENT && !unexpectedCrop,
    referenceAlphaBBox: refBox,
    candidateAlphaBBox: candBox,
    crop: candBox,
    unexpectedCrop,
  };
}

function bboxFromMask(mask, width, height) {
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!found) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function legacySubstitutionScore(candidatePath, referencePath) {
  const legacy = await loadPngSharp(REF_LEGACY);
  const ref = await loadPngSharp(referencePath);
  const cand = await loadPngSharp(candidatePath);
  const legacyNorm = await resizeTo(legacy, cand.width, cand.height);
  const refNorm = await resizeTo(ref, cand.width, cand.height);
  const vsLegacy = await compareGarmentRegions(legacyNorm, cand, "_tmp-legacy", {});
  const vsRegistry = await compareGarmentRegions(refNorm, cand, "_tmp-registry", {});
  return {
    legacyDiffPercent: vsLegacy.diffPercent,
    registryDiffPercent: vsRegistry.diffPercent,
    unexpectedTemplateSubstitution: vsLegacy.diffPercent < vsRegistry.diffPercent * 0.6,
  };
}

/**
 * Extract the embedded preview mockup RGB raster from a factory proof PDF.
 * pdf-lib stores embedPng() as FlateDecode DeviceRGB streams (not raw PNG bytes).
 */
async function extractPdfGarmentPng(pdfPath) {
  const bytes = readFileSync(pdfPath);
  const doc = await PDFDocument.load(bytes);
  const candidates = [];

  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(PDFName.of("Subtype"))?.toString() !== "/Image") continue;
    const colorSpace = dict.get(PDFName.of("ColorSpace"))?.toString();
    if (colorSpace !== "/DeviceRGB") continue;
    const width = dict.get(PDFName.of("Width"))?.asNumber();
    const height = dict.get(PDFName.of("Height"))?.asNumber();
    if (!width || !height) continue;

    let data = Buffer.from(obj.contents);
    const filter = dict.get(PDFName.of("Filter"))?.toString();
    if (filter === "/FlateDecode") data = inflateSync(data);

    const expected = width * height * 3;
    if (data.length !== expected) continue;
    candidates.push({ width, height, data });
  }

  if (!candidates.length) return null;

  // Preview panel mockup matches registry preview dimensions (1024×1536).
  const preview =
    candidates.find((c) => c.width === 1024 && c.height === 1536) ??
    candidates.reduce((a, b) => (a.width * a.height > b.width * b.height ? a : b));

  return sharp(preview.data, {
    raw: { width: preview.width, height: preview.height, channels: 3 },
  })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function main() {
  const refPreview = await loadPngSharp(REF_PREVIEW);
  const refExport = await loadPngSharp(REF_EXPORT);

  const reports = [];

  const jobs = [
    {
      label: "designer-garment",
      file: "designer-garment.png",
      ref: refPreview,
      refPath: REF_PREVIEW,
    },
    {
      label: "download-mockup",
      file: "download-mockup.png",
      ref: refExport,
      refPath: REF_EXPORT,
      excludeArtwork: true,
    },
    {
      label: "submit-mockup",
      file: "submit-mockup.png",
      ref: refPreview,
      refPath: REF_PREVIEW,
      excludeArtwork: true,
    },
  ];

  for (const job of jobs) {
    const path = join(ART, job.file);
    if (!existsSync(path)) {
      reports.push({ label: job.label, error: `missing ${job.file}` });
      continue;
    }
    const cand = await loadPngSharp(path);
    const report = await compareGarmentRegions(job.ref, cand, job.label, {
      excludeArtworkFromRef: job.excludeArtwork,
    });
    report.artifactFile = path;
    report.referenceFile = job.refPath;
    const sub = await legacySubstitutionScore(path, job.refPath);
    report.legacyTemplateDiffPercent = sub.legacyDiffPercent;
    report.unexpectedTemplateSubstitution = sub.unexpectedTemplateSubstitution;
    reports.push(report);
  }

  const pdfPath = join(ART, "submit-pdf.pdf");
  if (existsSync(pdfPath)) {
    const pngBuf = await extractPdfGarmentPng(pdfPath);
    if (pngBuf) {
      writeFileSync(join(ART, "submit-pdf-garment-extract.png"), pngBuf);
      const pdfImg = await loadPngSharp(join(ART, "submit-pdf-garment-extract.png"));
      const pdfReport = await compareGarmentRegions(refPreview, pdfImg, "submit-pdf-garment", {
        excludeArtworkFromRef: true,
      });
      pdfReport.artifactFile = join(ART, "submit-pdf-garment-extract.png");
      pdfReport.referenceFile = REF_PREVIEW;
      pdfReport.pdfEmbeddedBytes = pngBuf.length;
      const sub = await legacySubstitutionScore(
        join(ART, "submit-pdf-garment-extract.png"),
        REF_PREVIEW,
      );
      pdfReport.legacyTemplateDiffPercent = sub.legacyDiffPercent;
      pdfReport.unexpectedTemplateSubstitution = sub.unexpectedTemplateSubstitution;
      reports.push(pdfReport);
    } else {
      reports.push({ label: "submit-pdf-garment", error: "no PNG in PDF" });
    }
  } else {
    reports.push({ label: "submit-pdf-garment", error: "missing submit-pdf.pdf" });
  }

  const scored = reports.filter((r) => typeof r.pass === "boolean");
  const hasErrors = reports.some((r) => r.error);
  const overallPass =
    !hasErrors &&
    scored.length > 0 &&
    scored.every((r) => r.pass && !r.unexpectedTemplateSubstitution);

  const summary = {
    phase: "75.2",
    generatedAt: new Date().toISOString(),
    tolerance: TOLERANCE,
    passThresholdPercent: PASS_DIFF_PERCENT,
    overallPass,
    reports,
    outputs: { diffDirectory: DIFF, artifactsDirectory: ART },
  };

  writeFileSync(join(DIFF, "difference-report.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(DIFF, "difference-report.md"), renderMarkdown(summary));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(overallPass ? 0 : 1);
}

function renderMarkdown(summary) {
  const lines = [
    "# Phase 75.2 — Garment Visual Diff Report",
    "",
    `**Overall:** ${summary.overallPass ? "PASS" : "FAIL"}`,
    "",
    "| Surface | Ref WxH | Cand WxH | Scale | Garment diff % | Pass |",
    "|---------|---------|----------|-------|----------------|------|",
  ];
  for (const r of summary.reports) {
    if (r.error) {
      lines.push(`| ${r.label} | — | — | — | — | ERROR ${r.error} |`);
      continue;
    }
    if (typeof r.diffPercent !== "number") continue;
    lines.push(
      `| ${r.label} | ${r.referenceSize.width}×${r.referenceSize.height} | ${r.candidateSize.width}×${r.candidateSize.height} | ${r.scaleX?.toFixed(4)}×${r.scaleY?.toFixed(4)} | ${r.diffPercent.toFixed(3)}% | ${r.pass ? "✓" : "✗"} |`,
    );
  }
  return lines.join("\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
