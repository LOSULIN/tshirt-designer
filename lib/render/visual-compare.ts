/**
 * Visual Compare compose helpers — Calibration Tool only.
 * Does not modify Render Engine algorithms.
 */

import { resolveProductMockupPlacement } from "./visual-adjustment";
import { getDefaultDesignerPrintAreaRect } from "./designer-template-reference";
import type {
  CalibrationRect,
  FineCalibrationMapping,
  ProductCalibration,
  ProductSide,
} from "./render-types";

export const VISUAL_COMPARE_CANVAS = {
  width: 1024,
  height: 1536,
} as const;

export type VisualCompareOverlayMode =
  | "split"
  | "overlay"
  | "difference"
  | "opacity"
  | "blink";

export function getDesignerTemplateSrc(
  color: string,
  side: ProductSide,
): string {
  const shirtColor = color === "white" ? "white" : "black";
  return `/templates/adult-tshirt-${shirtColor}-${side}.png`;
}

export async function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export function composeGarmentWithArtwork(
  garment: CanvasImageSource,
  garmentWidth: number,
  garmentHeight: number,
  artwork: CanvasImageSource,
  placement: CalibrationRect,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = garmentWidth;
  canvas.height = garmentHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(garment, 0, 0, garmentWidth, garmentHeight);
  ctx.drawImage(artwork, placement.x, placement.y, placement.width, placement.height);
  return canvas;
}

export function resolveDesignerArtworkPlacement(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect {
  const sideData = calibration.front && side === "front" ? calibration.front : calibration.back;
  if (
    sideData &&
    typeof sideData === "object" &&
    "designerReference" in sideData &&
    sideData.designerReference.printArea.width > 0
  ) {
    return sideData.designerReference.printArea;
  }
  return getDefaultDesignerPrintAreaRect(side);
}

export function resolveProductArtworkPlacement(
  calibration: ProductCalibration,
  side: ProductSide,
): CalibrationRect | null {
  return resolveProductMockupPlacement(calibration, side);
}

export function computeVisualAlignmentFineMapping(
  designer: CalibrationRect,
  product: CalibrationRect,
): FineCalibrationMapping {
  return {
    offsetX: designer.x - product.x,
    offsetY: designer.y - product.y,
    scaleX: designer.width / product.width,
    scaleY: designer.height / product.height,
  };
}

export function createDifferenceCanvas(
  left: HTMLCanvasElement,
  right: HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = left.width;
  canvas.height = left.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const leftCtx = left.getContext("2d");
  const rightCtx = right.getContext("2d");
  if (!leftCtx || !rightCtx) return canvas;

  const leftData = leftCtx.getImageData(0, 0, left.width, left.height);
  const rightData = rightCtx.getImageData(0, 0, right.width, right.height);
  const output = ctx.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < leftData.data.length; i += 4) {
    const dr = Math.abs(leftData.data[i] - rightData.data[i]);
    const dg = Math.abs(leftData.data[i + 1] - rightData.data[i + 1]);
    const db = Math.abs(leftData.data[i + 2] - rightData.data[i + 2]);
    const heat = Math.min(255, (dr + dg + db) / 2);
    output.data[i] = heat;
    output.data[i + 1] = 0;
    output.data[i + 2] = 255 - heat;
    output.data[i + 3] = heat > 6 ? 200 : 30;
  }

  ctx.putImageData(output, 0, 0);
  return canvas;
}

export function createOpacityBlendCanvas(
  bottom: HTMLCanvasElement,
  top: HTMLCanvasElement,
  topAlpha = 0.5,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = bottom.width;
  canvas.height = bottom.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(bottom, 0, 0);
  ctx.globalAlpha = topAlpha;
  ctx.drawImage(top, 0, 0);
  ctx.globalAlpha = 1;
  return canvas;
}
