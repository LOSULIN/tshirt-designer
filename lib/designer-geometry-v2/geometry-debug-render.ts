/**
 * Designer Geometry V2 — Geometry Debug Overlay renderer (SVG / PNG).
 *
 * Visual debug only — not imported by Designer render paths.
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { Side } from "@/lib/constants";
import {
  buildTemplateAssetRelativePath,
  resolveTemplateSlugForUa,
} from "./geometry-overlay-constants";
import { buildGeometryV2AssetRelativePath } from "./constants";
import {
  buildGeometryDebugOverlayBundle,
  type GeometryDebugOverlay,
} from "./geometry-debug-overlay";
import { resolveGeometryDebugLayerToggles } from "./geometry-debug-toggle";
import type {
  GeometryDebugLayerToggles,
  GeometryDebugOverlayBundle,
  GeometryDebugOverlayShapes,
  GeometryDebugRenderResult,
} from "./geometry-debug-types";
import {
  GEOMETRY_DEBUG_V1_COLOR,
  GEOMETRY_DEBUG_V2_COLOR,
} from "./geometry-debug-types";

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

function collarCircleSvg(
  point: { x: number; y: number },
  color: string,
  label: string,
): string {
  return `
    <circle cx="${point.x}" cy="${point.y}" r="8" fill="none" stroke="${color}" stroke-width="3"/>
    <circle cx="${point.x}" cy="${point.y}" r="3" fill="${color}"/>
    <text x="${point.x + 12}" y="${point.y - 10}" font-family="monospace" font-size="13" fill="${color}">${label}</text>
  `;
}

function factoryCrossSvg(
  point: { x: number; y: number },
  color: string,
  label: string,
): string {
  const s = 10;
  return `
    <line x1="${point.x - s}" y1="${point.y}" x2="${point.x + s}" y2="${point.y}" stroke="${color}" stroke-width="3"/>
    <line x1="${point.x}" y1="${point.y - s}" x2="${point.x}" y2="${point.y + s}" stroke="${color}" stroke-width="3"/>
    <text x="${point.x + 14}" y="${point.y + 4}" font-family="monospace" font-size="13" fill="${color}">${label}</text>
  `;
}

function centerDotSvg(point: { x: number; y: number }, color: string): string {
  return `<circle cx="${point.x}" cy="${point.y}" r="5" fill="${color}" fill-opacity="0.9"/>`;
}

function hemMarkerSvg(
  point: { x: number; y: number },
  color: string,
): string {
  const w = 24;
  return `
    <line x1="${point.x - w}" y1="${point.y}" x2="${point.x + w}" y2="${point.y}" stroke="${color}" stroke-width="2"/>
    <circle cx="${point.x}" cy="${point.y}" r="4" fill="${color}"/>
  `;
}

function shoulderLineSvg(
  shoulder: GeometryDebugOverlayShapes["shoulder"],
  color: string,
): string {
  return `
    <line x1="${shoulder.left}" y1="${shoulder.scanY}" x2="${shoulder.right}" y2="${shoulder.scanY}" stroke="${color}" stroke-width="2" stroke-dasharray="8 4"/>
    <text x="${shoulder.right + 6}" y="${shoulder.scanY + 4}" font-family="monospace" font-size="11" fill="${color}">shoulder ${shoulder.widthPx.toFixed(0)}px</text>
  `;
}

function renderVersionShapes(
  shapes: GeometryDebugOverlayShapes,
  color: string,
  prefix: string,
  toggles: GeometryDebugLayerToggles,
  versionEnabled: boolean,
): string {
  if (!versionEnabled) return "";

  const parts: string[] = [];

  if (toggles.alphaBoundingBox) {
    parts.push(rectSvg(shapes.alphaBoundingBox, color, 2, "6 4"));
  }
  if (toggles.collar) {
    parts.push(
      collarCircleSvg(
        shapes.collar,
        color,
        `${prefix} ${shapes.version === "v1" ? "collar" : "collar bottom"}`,
      ),
    );
  }
  if (toggles.factoryOrigin) {
    parts.push(
      factoryCrossSvg(shapes.factoryOrigin, color, `${prefix} origin`),
    );
  }
  if (toggles.artworkStage) {
    parts.push(rectSvg(shapes.artworkStage, color, 3));
  }
  if (toggles.safeArea) {
    parts.push(rectSvg(shapes.safeArea, color, 2, "4 4"));
  }
  if (toggles.center) {
    parts.push(centerDotSvg(shapes.center, color));
  }
  if (toggles.hem) {
    parts.push(hemMarkerSvg(shapes.hem, color));
  }
  if (toggles.shoulder) {
    parts.push(shoulderLineSvg(shapes.shoulder, color));
  }

  return parts.join("\n");
}

export function buildGeometryDebugOverlaySvg(
  bundle: GeometryDebugOverlayBundle,
  toggles: GeometryDebugLayerToggles,
): string {
  const v1Svg = renderVersionShapes(
    bundle.v1,
    GEOMETRY_DEBUG_V1_COLOR,
    "V1",
    toggles,
    toggles.v1,
  );
  const v2Svg = renderVersionShapes(
    bundle.v2,
    GEOMETRY_DEBUG_V2_COLOR,
    "V2",
    toggles,
    toggles.v2,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}">
  <style>
    text { paint-order: stroke; stroke: #fff; stroke-width: 2px; }
  </style>
  <rect width="100%" height="100%" fill="none"/>
  <text x="16" y="28" font-family="monospace" font-size="18" fill="#111">Geometry Debug — ${bundle.label}</text>
  <text x="16" y="52" font-family="monospace" font-size="12" fill="${GEOMETRY_DEBUG_V1_COLOR}">V1 red</text>
  <text x="80" y="52" font-family="monospace" font-size="12" fill="${GEOMETRY_DEBUG_V2_COLOR}">V2 blue</text>
  ${v1Svg}
  ${v2Svg}
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

export interface RenderGeometryDebugOverlayInput {
  rootDir?: string;
  templatePath: string;
  uaPath: string;
  side: Side;
  colorSlug: string;
  toggles?: Partial<GeometryDebugLayerToggles>;
  outputPath?: string;
}

export async function renderGeometryDebugOverlayPng(
  input: RenderGeometryDebugOverlayInput,
): Promise<GeometryDebugRenderResult> {
  const toggles = resolveGeometryDebugLayerToggles(input.toggles);
  const bundle = buildGeometryDebugOverlayBundle(input.side, input.colorSlug);
  const svg = buildGeometryDebugOverlaySvg(bundle, toggles);

  const blended = await blendImages50(input.templatePath, input.uaPath);
  const outputPath =
    input.outputPath ??
    join(
      input.rootDir ?? "debug/geometry-debug-overlay",
      `${input.colorSlug}-${input.side}-debug.png`,
    );

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(blended)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  return { svg, outputPath, bundle };
}

export function buildGeometryDebugOutputPath(
  colorSlug: string,
  side: Side,
  rootDir = "debug/geometry-debug-overlay",
): string {
  return join(rootDir, `${colorSlug}-${side}-debug.png`);
}

export async function renderGeometryDebugOverlayFromAssets(
  colorSlug: string,
  side: Side,
  rootDir?: string,
  toggles?: Partial<GeometryDebugLayerToggles>,
): Promise<GeometryDebugRenderResult> {
  const templateSlug = resolveTemplateSlugForUa(colorSlug);
  const templatePath = join(
    process.cwd(),
    buildTemplateAssetRelativePath(templateSlug, side),
  );
  const uaPath = join(
    process.cwd(),
    buildGeometryV2AssetRelativePath(colorSlug, side),
  );

  return renderGeometryDebugOverlayPng({
    templatePath,
    uaPath,
    side,
    colorSlug,
    rootDir,
    toggles,
    outputPath: rootDir
      ? buildGeometryDebugOutputPath(colorSlug, side, rootDir)
      : undefined,
  });
}

export function renderGeometryDebugOverlayFromInstance(
  overlay: GeometryDebugOverlay,
  toggles: GeometryDebugLayerToggles,
): string {
  return buildGeometryDebugOverlaySvg(overlay.bundle, toggles);
}
