#!/usr/bin/env node
/**
 * 產生 printArea.y 調整前後比較圖（SVG）
 * 調整：僅 Y 中心 −25px；寬、高、scale 不變
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/guides");
const OUT_FILE = path.join(OUT_DIR, "print-area-y-adjustment-comparison.svg");

const W = 1024;
const H = 1536;
const PRINT_W = 350;
const PRINT_H = 500;
const Y_BEFORE = 0.53;
const Y_OFFSET_PX = -25;
const Y_AFTER = Y_BEFORE + Y_OFFSET_PX / H;

function printRect(refY) {
  const cx = W * 0.5;
  const cy = H * refY;
  return {
    x: cx - PRINT_W / 2,
    y: cy - PRINT_H / 2,
    w: PRINT_W,
    h: PRINT_H,
    cy,
  };
}

function panelSvg(label, refY, accent) {
  const r = printRect(refY);
  const scale = 0.42;
  const ox = 40;
  const oy = 80;
  const pw = W * scale;
  const ph = H * scale;

  return `
  <g transform="translate(${ox}, ${oy})">
    <text x="${pw / 2}" y="-24" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="600" fill="#111">${label}</text>
    <text x="${pw / 2}" y="-6" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#555">printArea.y = ${refY.toFixed(4)} · 中心 Y = ${Math.round(r.cy)}px</text>
    <rect x="0" y="0" width="${pw}" height="${ph}" fill="#f4f4f5" stroke="#d4d4d8" stroke-width="1"/>
    <!-- 簡化 T 恤輪廓 -->
    <path d="M ${pw * 0.22} ${ph * 0.08} L ${pw * 0.38} ${ph * 0.14} L ${pw * 0.5} ${ph * 0.11} L ${pw * 0.62} ${ph * 0.14} L ${pw * 0.78} ${ph * 0.08} L ${pw * 0.88} ${ph * 0.22} L ${pw * 0.72} ${ph * 0.26} L ${pw * 0.72} ${ph * 0.92} L ${pw * 0.28} ${ph * 0.92} L ${pw * 0.28} ${ph * 0.26} L ${pw * 0.12} ${ph * 0.22} Z"
      fill="#e4e4e7" stroke="#a1a1aa" stroke-width="1.5"/>
    <!-- 印刷區 -->
    <rect x="${(r.x / W) * pw}" y="${(r.y / H) * ph}" width="${(r.w / W) * pw}" height="${(r.h / H) * ph}"
      fill="${accent}22" stroke="${accent}" stroke-width="2.5" stroke-dasharray="6 4"/>
    <!-- 中心十字 -->
    <line x1="${pw * 0.5 - 8}" y1="${(r.cy / H) * ph}" x2="${pw * 0.5 + 8}" y2="${(r.cy / H) * ph}" stroke="${accent}" stroke-width="2"/>
    <line x1="${pw * 0.5}" y1="${(r.cy / H) * ph - 8}" x2="${pw * 0.5}" y2="${(r.cy / H) * ph + 8}" stroke="${accent}" stroke-width="2"/>
    <text x="${pw - 4}" y="${(r.cy / H) * ph + 4}" text-anchor="end" font-family="ui-monospace,monospace" font-size="11" fill="${accent}">Y ${Math.round(r.cy)}</text>
    <text x="4" y="${ph + 18}" font-family="ui-monospace,monospace" font-size="11" fill="#71717a">${PRINT_W}×${PRINT_H}px · scale 不變</text>
  </g>`;
}

const before = printRect(Y_BEFORE);
const after = printRect(Y_AFTER);
const deltaY = Math.round(after.cy - before.cy);

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="820" viewBox="0 0 960 820">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="480" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#111">Print Area Y 調整前後比較</text>
  <text x="480" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#52525b">容器 ${W}×${H}px · 僅 printArea.y 上移 ${-Y_OFFSET_PX}px（ΔY = ${deltaY}px）· 寬高與 scale 不變</text>
  ${panelSvg("調整前 (Before)", Y_BEFORE, "#dc2626")}
  ${panelSvg("調整後 (After)", Y_AFTER, "#16a34a").replace('translate(40, 80)', 'translate(500, 80)')}
  <!-- 連接箭頭 -->
  <g transform="translate(460, 360)">
    <path d="M 0 -20 L 0 20 M -8 12 L 0 20 L 8 12" fill="none" stroke="#2563eb" stroke-width="2.5"/>
    <text x="0" y="42" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#2563eb">↑ ${-deltaY}px</text>
  </g>
  <g transform="translate(40, 720)">
    <text font-family="ui-monospace,monospace" font-size="12" fill="#3f3f46">
      <tspan x="0" dy="0">Before: y=${Y_BEFORE} → center (${W / 2}, ${Math.round(before.cy)}) · top=${Math.round(before.y)}</tspan>
      <tspan x="0" dy="18">After:  y=${Y_AFTER.toFixed(6)} → center (${W / 2}, ${Math.round(after.cy)}) · top=${Math.round(after.y)}</tspan>
      <tspan x="0" dy="18">PREVIEW_PRINT_AREA_CENTER_OFFSET_Y_PX = ${Y_OFFSET_PX}</tspan>
    </text>
  </g>
</svg>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, svg.trim() + "\n");
console.log(`Wrote ${OUT_FILE}`);
