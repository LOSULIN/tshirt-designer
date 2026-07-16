/**
 * Calibration artwork for Visual Compare (Render Calibration Tool only).
 */

import type { CalibrationRect } from "./render-types";

export function createCalibrationArtworkCanvas(
  printArea: CalibrationRect,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = printArea.width;
  canvas.height = printArea.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tile = 24;
  for (let y = 0; y < canvas.height; y += tile) {
    for (let x = 0; x < canvas.width; x += tile) {
      const even = ((x / tile) + (y / tile)) % 2 === 0;
      ctx.fillStyle = even ? "#dbeafe" : "#eff6ff";
      ctx.fillRect(x, y, tile, tile);
    }
  }

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.moveTo(0, canvas.height / 2);
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();

  const dot = 8;
  const corners = [
    { x: 0, y: 0, color: "#ef4444" },
    { x: canvas.width - dot, y: 0, color: "#22c55e" },
    { x: 0, y: canvas.height - dot, color: "#3b82f6" },
    { x: canvas.width - dot, y: canvas.height - dot, color: "#f59e0b" },
  ];
  for (const corner of corners) {
    ctx.fillStyle = corner.color;
    ctx.fillRect(corner.x, corner.y, dot, dot);
  }

  ctx.fillStyle = "#1e3a8a";
  ctx.font = `bold ${Math.round(Math.min(canvas.width, canvas.height) * 0.08)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("35×50", canvas.width / 2, canvas.height / 2);

  return canvas;
}
