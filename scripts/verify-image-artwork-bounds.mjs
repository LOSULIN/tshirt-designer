/**
 * Image Layer Artwork Bounds — runtime verification (pure JS)
 * node scripts/verify-image-artwork-bounds.mjs
 */
import { readFileSync } from "node:fs";

const ARTWORK_ALPHA_THRESHOLD = 10;

function getFullImageArtworkBounds(naturalWidth, naturalHeight) {
  const w = Math.max(1, Math.round(naturalWidth));
  const h = Math.max(1, Math.round(naturalHeight));
  return {
    minX: 0,
    minY: 0,
    maxX: w - 1,
    maxY: h - 1,
    visibleWidth: w,
    visibleHeight: h,
  };
}

function computeArtworkBoundsFromImageData(data, width, height, threshold = ARTWORK_ALPHA_THRESHOLD) {
  if (width <= 0 || height <= 0) {
    return getFullImageArtworkBounds(width, height);
  }
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) {
    return getFullImageArtworkBounds(width, height);
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    visibleWidth: maxX - minX + 1,
    visibleHeight: maxY - minY + 1,
  };
}

function resolveImageArtworkBounds(image) {
  if (image.artworkBounds) return image.artworkBounds;
  return getFullImageArtworkBounds(image.naturalWidth, image.naturalHeight);
}

function getImageArtworkAspectRatio(image) {
  const bounds = resolveImageArtworkBounds(image);
  if (bounds.visibleWidth <= 0 || bounds.visibleHeight <= 0) return 1;
  return bounds.visibleWidth / bounds.visibleHeight;
}

function isFullCanvasArtworkBounds(bounds, naturalWidth, naturalHeight) {
  return (
    bounds.minX === 0 &&
    bounds.minY === 0 &&
    bounds.visibleWidth === naturalWidth &&
    bounds.visibleHeight === naturalHeight
  );
}

function getArtworkPreviewDomStyle(image) {
  const bounds = resolveImageArtworkBounds(image);
  if (isFullCanvasArtworkBounds(bounds, image.naturalWidth, image.naturalHeight)) {
    return null;
  }
  const vw = bounds.visibleWidth;
  const vh = bounds.visibleHeight;
  const scaleX = image.naturalWidth / vw;
  const scaleY = image.naturalHeight / vh;
  return {
    position: "absolute",
    width: `${scaleX * 100}%`,
    height: `${scaleY * 100}%`,
    left: `${-(bounds.minX / vw) * 100}%`,
    top: `${-(bounds.minY / vh) * 100}%`,
  };
}

function getArtworkCropSourceRect(image, imgNaturalWidth, imgNaturalHeight) {
  const bounds = resolveImageArtworkBounds(image);
  const scaleX = image.naturalWidth > 0 ? imgNaturalWidth / image.naturalWidth : 1;
  const scaleY = image.naturalHeight > 0 ? imgNaturalHeight / image.naturalHeight : 1;
  return {
    sx: bounds.minX * scaleX,
    sy: bounds.minY * scaleY,
    sw: bounds.visibleWidth * scaleX,
    sh: bounds.visibleHeight * scaleY,
  };
}

const SIZES = [
  "90", "110", "130", "150", "160",
  "GS", "GM", "GL",
  "S", "M", "L", "XL", "XXL", "XXXL",
];

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
    return;
  }
  console.log(`PASS: ${msg}`);
  passed += 1;
}

// Transparent padding bounds
{
  const w = 100;
  const h = 80;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 20; y < 60; y++) {
    for (let x = 10; x < 70; x++) {
      data[(y * w + x) * 4 + 3] = 255;
    }
  }
  const bounds = computeArtworkBoundsFromImageData(data, w, h);
  assert(bounds.minX === 10, "bounds minX = 10");
  assert(bounds.minY === 20, "bounds minY = 20");
  assert(bounds.visibleWidth === 60, "bounds visibleWidth = 60");
  assert(bounds.visibleHeight === 40, "bounds visibleHeight = 40");
}

// JPG opaque fallback
{
  const image = { naturalWidth: 800, naturalHeight: 600, mimeType: "image/jpeg" };
  const bounds = resolveImageArtworkBounds(image);
  assert(bounds.visibleWidth === 800 && bounds.visibleHeight === 600, "JPG uses full natural size");
  assert(getArtworkPreviewDomStyle(image) === null, "full-canvas JPG has no crop style");
}

// PNG with padding
{
  const image = {
    naturalWidth: 100,
    naturalHeight: 80,
    mimeType: "image/png",
    artworkBounds: {
      minX: 10,
      minY: 20,
      maxX: 69,
      maxY: 59,
      visibleWidth: 60,
      visibleHeight: 40,
    },
  };
  const aspect = getImageArtworkAspectRatio(image);
  assert(Math.abs(aspect - 1.5) < 1e-6, "artwork aspect = 60/40 = 1.5");
  const style = getArtworkPreviewDomStyle(image);
  assert(style !== null, "padded PNG gets preview dom style");
  assert(style.width === "166.66666666666666%", "preview width scale");
  assert(style.left === "-16.666666666666664%", "preview left offset");
  const crop = getArtworkCropSourceRect(image, 100, 80);
  assert(crop.sx === 10 && crop.sy === 20, "export crop origin");
  assert(crop.sw === 60 && crop.sh === 40, "export crop size");
}

// Artwork size keep-ratio: 31×28 art, input width 12 → height 11
{
  const image = {
    naturalWidth: 100,
    naturalHeight: 90,
    mimeType: "image/png",
    artworkBounds: {
      minX: 5,
      minY: 5,
      maxX: 94,
      maxY: 84,
      visibleWidth: 90,
      visibleHeight: 80,
    },
  };
  const aspect = getImageArtworkAspectRatio(image);
  const patchWidth = 12;
  const patchHeight = Math.round(patchWidth / aspect);
  assert(patchHeight === 11, "12cm width → height 11cm (90:80 ratio, rounded)");
}

// Aspect ratios: square, landscape, portrait, ultra-wide, ultra-tall
for (const [label, vw, vh] of [
  ["square", 500, 500],
  ["landscape", 800, 400],
  ["portrait", 400, 800],
  ["ultra-wide", 2000, 200],
  ["ultra-tall", 200, 2000],
]) {
  const image = {
    naturalWidth: vw + 40,
    naturalHeight: vh + 40,
    artworkBounds: {
      minX: 20,
      minY: 20,
      maxX: 20 + vw - 1,
      maxY: 20 + vh - 1,
      visibleWidth: vw,
      visibleHeight: vh,
    },
  };
  const aspect = getImageArtworkAspectRatio(image);
  assert(Math.abs(aspect - vw / vh) < 1e-6, `${label} aspect ratio preserved`);
}

// Static: shared artwork bounds path in preview/export/mockup
for (const [file, needle] of [
  ["lib/print-export-system.ts", "drawImageArtworkOnCanvas"],
  ["lib/mockup-export.ts", "drawImageArtworkOnCanvas"],
  ["lib/image-artwork-render.ts", "resolveImageArtworkBounds"],
  ["components/designer/LayerPreviewContent.tsx", "getArtworkPreviewDomStyle"],
  ["components/designer/DesignerApp.tsx", "analyzeImageArtworkBoundsFromFile"],
  ["components/designer/DesignerApp.tsx", "getImageArtworkAspectRatio"],
  ["lib/layers.ts", "artworkBounds"],
]) {
  const src = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert(src.includes(needle), `${file} includes ${needle}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
