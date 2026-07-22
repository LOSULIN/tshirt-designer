/**
 * Designer Geometry V2 — overlay PNG compositor (Template + UA + V1/V2 geometry).
 *
 * Audit only — not imported by runtime.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { Side } from "@/lib/constants";
import {
  GEOMETRY_OVERLAY_OUTPUT_DIR,
  GEOMETRY_OVERLAY_V1_COLOR,
  GEOMETRY_OVERLAY_V2_COLOR,
} from "./geometry-overlay-constants";
import type { GeometryOverlayRects } from "./geometry-overlay";

const CANVAS_W = 1024;
const CANVAS_H = 1536;

function rectSvg(
  rect: { left: number; top: number; width: number; height: number },
  color: string,
  strokeWidth: number,
  dash?: string,
): string {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<rect x="${rect.left}" y="${rect.top}" width="${rect.width}" height="${rect.height}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${dashAttr}/>`;
}

function pointSvg(
  point: { x: number; y: number },
  color: string,
  label: string,
): string {
  const r = 6;
  return `
    <circle cx="${point.x}" cy="${point.y}" r="${r}" fill="${color}" fill-opacity="0.85"/>
    <text x="${point.x + 10}" y="${point.y - 8}" font-family="monospace" font-size="14" fill="${color}">${label}</text>
  `;
}

function buildOverlaySvg(
  v1: GeometryOverlayRects,
  v2: GeometryOverlayRects,
  label: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <style>
    text { paint-order: stroke; stroke: #fff; stroke-width: 3px; }
  </style>
  <rect width="100%" height="100%" fill="none"/>
  <text x="16" y="28" font-family="monospace" font-size="18" fill="#111">${label}</text>
  <text x="16" y="52" font-family="monospace" font-size="13" fill="${GEOMETRY_OVERLAY_V1_COLOR}">V1 — red</text>
  <text x="120" y="52" font-family="monospace" font-size="13" fill="${GEOMETRY_OVERLAY_V2_COLOR}">V2 — blue</text>

  ${rectSvg(v1.alphaBoundingBox, GEOMETRY_OVERLAY_V1_COLOR, 2, "6 4")}
  ${pointSvg(v1.collarPoint, GEOMETRY_OVERLAY_V1_COLOR, "V1 collar")}
  ${pointSvg(v1.factoryOrigin, GEOMETRY_OVERLAY_V1_COLOR, "V1 origin")}
  ${rectSvg(v1.artworkStage, GEOMETRY_OVERLAY_V1_COLOR, 3)}
  ${rectSvg(v1.safeArea, GEOMETRY_OVERLAY_V1_COLOR, 2, "3 3")}

  ${rectSvg(v2.alphaBoundingBox, GEOMETRY_OVERLAY_V2_COLOR, 2, "10 5")}
  ${pointSvg(v2.collarPoint, GEOMETRY_OVERLAY_V2_COLOR, "V2 collar")}
  ${pointSvg(v2.factoryOrigin, GEOMETRY_OVERLAY_V2_COLOR, "V2 origin")}
  ${rectSvg(v2.artworkStage, GEOMETRY_OVERLAY_V2_COLOR, 3)}
  ${rectSvg(v2.safeArea, GEOMETRY_OVERLAY_V2_COLOR, 2, "4 4")}
</svg>`;
}

async function blendImages50(
  templatePath: string,
  uaPath: string,
): Promise<Buffer> {
  const [tRaw, uRaw] = await Promise.all([
    sharp(templatePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(uaPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);

  const { data: tData, info } = tRaw;
  const { data: uData } = uRaw;
  const out = Buffer.alloc(tData.length);

  for (let i = 0; i < tData.length; i += 4) {
    out[i] = Math.round(tData[i] * 0.5 + uData[i] * 0.5);
    out[i + 1] = Math.round(tData[i + 1] * 0.5 + uData[i + 1] * 0.5);
    out[i + 2] = Math.round(tData[i + 2] * 0.5 + uData[i + 2] * 0.5);
    const tA = tData[i + 3] / 255;
    const uA = uData[i + 3] / 255;
    out[i + 3] = Math.round(Math.min(255, (tA * 0.5 + uA * 0.5) * 255));
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

export interface RenderGeometryOverlayInput {
  templatePath: string;
  uaPath: string;
  side: Side;
  colorSlug: string;
  v1: GeometryOverlayRects;
  v2: GeometryOverlayRects;
  outputPath: string;
}

export async function renderGeometryOverlayPng(
  input: RenderGeometryOverlayInput,
): Promise<string> {
  const blended = await blendImages50(input.templatePath, input.uaPath);
  const svg = buildOverlaySvg(
    input.v1,
    input.v2,
    `${input.colorSlug} / ${input.side}`,
  );
  const svgBuffer = Buffer.from(svg);

  await mkdir(dirname(input.outputPath), { recursive: true });
  await sharp(blended)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(input.outputPath);

  return input.outputPath;
}

export function buildGeometryOverlayOutputPath(
  colorSlug: string,
  side: Side,
  rootDir: string = GEOMETRY_OVERLAY_OUTPUT_DIR,
): string {
  return join(rootDir, `${colorSlug}-${side}-overlay.png`);
}

export async function writeGeometryOverlaySummary(
  summaries: string[],
  outputPath: string = join(GEOMETRY_OVERLAY_OUTPUT_DIR, "summary.txt"),
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, summaries.join("\n\n") + "\n", "utf8");
}
