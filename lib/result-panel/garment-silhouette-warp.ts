/**
 * Localized garment silhouette warp — ResultPanel preview only.
 *
 * Canvas stays 1024×1536. Garment is drawn fill-canvas first, then per-pixel
 * inverse displacement (not uniform scale / crop / zoom).
 */

import type { GarmentSilhouetteAnchors } from "./garment-silhouette-anchors";
import type { GarmentSilhouetteCompensation } from "./garment-silhouette-compensation";

const GRID_COLS = 16;
const GRID_ROWS = 24;

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x >= edge1 ? 1 : 0;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function resolveWidthFactor(
  y: number,
  anchors: GarmentSilhouetteAnchors,
  compensation: GarmentSilhouetteCompensation,
): number {
  const shoulderBand = smoothstep(
    anchors.collarY,
    anchors.shoulderY,
    y,
  );
  const chestBand =
    smoothstep(anchors.shoulderY, anchors.armpitY, y) *
    smoothstep(anchors.hemY, anchors.armpitY, y);
  const sleeveBand =
    smoothstep(anchors.shoulderY, anchors.sleeveEndY, y) *
    (1 - smoothstep(anchors.armpitY, anchors.hemY, y));

  const shoulderMix = lerp(
    compensation.compensation.chest,
    compensation.compensation.shoulder,
    shoulderBand,
  );
  const chestMix = lerp(shoulderMix, compensation.compensation.chest, chestBand);
  return lerp(chestMix, compensation.compensation.sleeve, sleeveBand * 0.55);
}

function resolveLengthFactor(
  y: number,
  anchors: GarmentSilhouetteAnchors,
  compensation: GarmentSilhouetteCompensation,
): number {
  const belowCollar = smoothstep(anchors.collarY, anchors.hemY, y);
  return lerp(1, compensation.compensation.length, belowCollar);
}

function mapSourcePixel(
  x: number,
  y: number,
  anchors: GarmentSilhouetteAnchors,
  compensation: GarmentSilhouetteCompensation,
): { sx: number; sy: number } {
  const widthFactor = resolveWidthFactor(y, anchors, compensation);
  const lengthFactor = resolveLengthFactor(y, anchors, compensation);

  const dx = x - anchors.centerX;
  const sx = anchors.centerX + dx / widthFactor;

  const dyBelowCollar = Math.max(0, y - anchors.collarY);
  const sy = anchors.collarY + dyBelowCollar / lengthFactor;

  return { sx, sy };
}

function sampleBilinear(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const px = clamp(x, 0, width - 1);
  const py = clamp(y, 0, height - 1);
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const tx = px - x0;
  const ty = py - y0;

  const i00 = (y0 * width + x0) * 4;
  const i10 = (y0 * width + x1) * 4;
  const i01 = (y1 * width + x0) * 4;
  const i11 = (y1 * width + x1) * 4;

  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const top = lerp(data[i00 + c], data[i10 + c], tx);
    const bottom = lerp(data[i01 + c], data[i11 + c], tx);
    out[c] = Math.round(lerp(top, bottom, ty));
  }
  return out;
}

/**
 * Warp garment pixels on a fixed canvas. Source must already fill the canvas.
 */
export function warpGarmentSilhouetteOnCanvas(
  sourceCanvas: HTMLCanvasElement,
  compensation: GarmentSilhouetteCompensation,
  anchors: GarmentSilhouetteAnchors,
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const srcCtx = sourceCanvas.getContext("2d");
  if (!srcCtx) {
    throw new Error("warpGarmentSilhouetteOnCanvas: source 2d context unavailable");
  }

  const srcImage = srcCtx.getImageData(0, 0, width, height);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext("2d");
  if (!outCtx) {
    throw new Error("warpGarmentSilhouetteOnCanvas: output 2d context unavailable");
  }

  const outImage = outCtx.createImageData(width, height);
  const cellW = width / GRID_COLS;
  const cellH = height / GRID_ROWS;

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = col === GRID_COLS - 1 ? width : Math.floor((col + 1) * cellW);
      const y1 = row === GRID_ROWS - 1 ? height : Math.floor((row + 1) * cellH);

      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          const { sx, sy } = mapSourcePixel(x, y, anchors, compensation);
          const rgba = sampleBilinear(
            srcImage.data,
            width,
            height,
            sx,
            sy,
          );
          const i = (y * width + x) * 4;
          outImage.data[i] = rgba[0];
          outImage.data[i + 1] = rgba[1];
          outImage.data[i + 2] = rgba[2];
          outImage.data[i + 3] = rgba[3];
        }
      }
    }
  }

  outCtx.putImageData(outImage, 0, 0);
  return outCanvas;
}
