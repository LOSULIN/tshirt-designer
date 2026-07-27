/**
 * Uniform canvas scale — placement-neutral output resize for product mockup export.
 * Composes at preview resolution first; scales pixels only (no placement recalculation).
 */

export function scaleCanvasUniform(
  source: HTMLCanvasElement,
  scale: number,
): HTMLCanvasElement {
  if (scale <= 1) {
    return source;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("scaleCanvasUniform: 2d context unavailable");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}
