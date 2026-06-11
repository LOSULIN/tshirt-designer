#!/usr/bin/env node
/**
 * 產生 Mockup Calibration 比對圖（SVG）
 * - printArea.y 調整前後
 * - Editor / Flat Shirt / Flat Mockup / Model Mockup 四視圖
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/guides");
const OUT_SVG = path.join(OUT_DIR, "mockup-calibration-comparison.svg");

const W = 1024;
const H = 1536;
const PRINT_W = 350;
const PRINT_H = 500;
const Y_BASE = 0.53;
const Y_OFFSET_PX = -25;
const Y_PREVIEW = Y_BASE + Y_OFFSET_PX / H;

const MOCKUP_MODEL_REF = { front: 0.48, back: 0.5 };
const SIDE = "front";

function rect(refY) {
  const cx = W * 0.5;
  const cy = H * refY;
  return { x: cx - PRINT_W / 2, y: cy - PRINT_H / 2, w: PRINT_W, h: PRINT_H, cy };
}

function panel(x, y, label, refY, color, subtitle) {
  const scale = 0.22;
  const pw = W * scale;
  const ph = H * scale;
  const r = rect(refY);
  return `
  <g transform="translate(${x}, ${y})">
    <text x="${pw / 2}" y="-28" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111">${label}</text>
    <text x="${pw / 2}" y="-12" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#666">${subtitle}</text>
    <rect width="${pw}" height="${ph}" fill="#fafafa" stroke="#e4e4e7"/>
    <path d="M ${pw * 0.22} ${ph * 0.08} L ${pw * 0.38} ${ph * 0.14} L ${pw * 0.5} ${ph * 0.11} L ${pw * 0.62} ${ph * 0.14} L ${pw * 0.78} ${ph * 0.08} L ${pw * 0.88} ${ph * 0.22} L ${pw * 0.72} ${ph * 0.26} L ${pw * 0.72} ${ph * 0.92} L ${pw * 0.28} ${ph * 0.92} L ${pw * 0.28} ${ph * 0.26} L ${pw * 0.12} ${ph * 0.22} Z" fill="#e4e4e7" stroke="#d4d4d8"/>
    <rect x="${(r.x / W) * pw}" y="${(r.y / H) * ph}" width="${(r.w / W) * pw}" height="${(r.h / H) * ph}" fill="${color}22" stroke="${color}" stroke-width="2" stroke-dasharray="5 3"/>
    <line x1="${pw * 0.5}" y1="${(r.cy / H) * ph - 6}" x2="${pw * 0.5}" y2="${(r.cy / H) * ph + 6}" stroke="${color}" stroke-width="1.5"/>
    <text x="${pw - 2}" y="${(r.cy / H) * ph + 3}" text-anchor="end" font-family="ui-monospace,monospace" font-size="9" fill="${color}">Y${Math.round(r.cy)}</text>
    <text x="2" y="${ph + 14}" font-family="ui-monospace,monospace" font-size="9" fill="#71717a">y=${refY.toFixed(4)}</text>
  </g>`;
}

const before = rect(Y_BASE);
const after = rect(Y_PREVIEW);
const modelRefY = MOCKUP_MODEL_REF[SIDE];
const model = rect(modelRefY);
const modelDeltaY = Math.round(model.cy - after.cy);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="900" viewBox="0 0 1100 900">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="550" y="32" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="700">Mockup Calibration · 調整前後與三視圖比較</text>
  <text x="550" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#52525b">架構 A · Production 35×50 cm 不變 · 僅視覺錨點</text>

  <text x="40" y="78" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#333">A. printArea.y 校準（Preview / Flat Mockup）</text>
  ${panel(40, 90, "調整前", Y_BASE, "#dc2626", "ref.y = 0.53 · center Y = 814")}
  ${panel(300, 90, "調整後", Y_PREVIEW, "#16a34a", `上移 ${-Y_OFFSET_PX}px · center Y = ${Math.round(after.cy)}`)}
  <g transform="translate(265, 200)">
    <path d="M 0 -12 L 0 12 M -6 6 L 0 12 L 6 6" fill="none" stroke="#2563eb" stroke-width="2"/>
    <text x="0" y="28" text-anchor="middle" font-size="11" fill="#2563eb" font-weight="600">${Y_OFFSET_PX}px</text>
  </g>

  <text x="40" y="400" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#333">B. 三視圖現況（正面 · 調整後錨點）</text>
  ${panel(40, 412, "Editor", Y_PREVIEW, "#f97316", "Preview · 設計器")}
  ${panel(300, 412, "Flat Shirt", Y_PREVIEW, "#3b82f6", "Preview · 同 Editor Δ=0")}
  ${panel(560, 412, "Flat Mockup", Y_PREVIEW, "#16a34a", "Mockup flat · Δ=0")}
  ${panel(820, 412, "Model Mockup", modelRefY, "#a855f7", `Mockup model · ΔY=${modelDeltaY}px`)}

  <g transform="translate(40, 780)">
    <text font-family="ui-monospace,monospace" font-size="11" fill="#3f3f46">
      <tspan x="0" dy="0">Preview/Flat: y=${Y_PREVIEW.toFixed(6)} · top=${Math.round(after.y)} · ${PRINT_W}×${PRINT_H}px</tspan>
      <tspan x="0" dy="16">Model mockup: y=${modelRefY} · center Y=${Math.round(model.cy)} · 較 Editor </tspan>
      <tspan fill="#b45309" font-weight="600">${modelDeltaY > 0 ? "下方" : "上方"} ${Math.abs(modelDeltaY)}px</tspan>
      <tspan x="0" dy="16">建議 Model ref.y → ${(modelRefY + (Y_PREVIEW - modelRefY)).toFixed(4)}（+${(Y_PREVIEW - modelRefY).toFixed(4)}）以對齊 Editor</tspan>
    </text>
  </g>
</svg>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_SVG, svg.trim() + "\n");
console.log(`Wrote ${OUT_SVG}`);
console.log(`Model vs Editor ΔY = ${modelDeltaY}px (front)`);
