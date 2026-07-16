/**
 * Sample artwork for calibration render preview (Render Engine only).
 */
export function createSampleArtworkCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 700;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tile = 40;
  for (let y = 0; y < canvas.height; y += tile) {
    for (let x = 0; x < canvas.width; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? "#dbeafe" : "#eff6ff";
      ctx.fillRect(x, y, tile, tile);
    }
  }

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ARTWORK", canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = "32px system-ui, sans-serif";
  ctx.fillStyle = "#1d4ed8";
  ctx.fillText("Calibration Test", canvas.width / 2, canvas.height / 2 + 36);

  return canvas;
}
