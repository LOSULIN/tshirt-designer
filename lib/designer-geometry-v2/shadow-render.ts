/**
 * Designer Geometry V2 — Shadow Render pipeline (audit-only).
 *
 * Renders V1 vs V2 Product Master placements side-by-side in dev.
 * Never wired into production render, Export, or ResultPanel.
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import type { Side } from "@/lib/constants";
import { buildGeometryV2AssetRelativePath } from "./constants";
import {
  buildTemplateAssetRelativePath,
  resolveTemplateSlugForUa,
} from "./geometry-overlay-constants";
import {
  assertActiveGeometryRemainsV1,
  resolveGeometryV1RuntimeSnapshot,
  resolveProductMasterRuntimeSnapshot,
} from "./shadow-runtime";
import type { GeometryRuntimeSnapshot } from "./shadow-runtime-types";
import {
  assertGeometryShadowRenderSafeForProduction,
  isGeometryShadowRenderEnabled,
} from "./shadow-render-toggle";
import type {
  ShadowDesignerLayer,
  ShadowLayerPlacement,
  ShadowPixelDifferenceReport,
  ShadowRenderGeometryCompare,
  ShadowRenderGeometryContext,
  ShadowRenderLayerCompare,
  ShadowRenderResult,
} from "./shadow-render-types";
import {
  SHADOW_RENDER_AUDIT_LAYERS,
  SHADOW_RENDER_CANVAS_HEIGHT,
  SHADOW_RENDER_CANVAS_WIDTH,
  SHADOW_RENDER_OUTPUT_DIR,
} from "./shadow-render-types";
import { rectCenter } from "./shadow-render-report";
import type { GeometryV2Rect } from "./types";

function rotatedBoundingBox(
  cx: number,
  cy: number,
  width: number,
  height: number,
  rotationDeg: number,
): GeometryV2Rect {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = width / 2;
  const hh = height / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    left,
    top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
  };
}

export function resolveShadowLayerPlacements(
  snapshot: GeometryRuntimeSnapshot,
  layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
): ShadowLayerPlacement[] {
  const stage = snapshot.artworkStage;
  return layers.map((layer) => {
    const widthPx = layer.widthPx * layer.scale;
    const heightPx = layer.heightPx * layer.scale;
    const cx = stage.left + layer.normalizedX * stage.width;
    const cy = stage.top + layer.normalizedY * stage.height;
    return {
      layerId: layer.id,
      position: { x: cx, y: cy },
      scale: layer.scale,
      rotationDeg: layer.rotationDeg,
      widthPx,
      heightPx,
      boundingBox: rotatedBoundingBox(
        cx,
        cy,
        widthPx,
        heightPx,
        layer.rotationDeg,
      ),
    };
  });
}

export function buildShadowRenderGeometryContext(
  version: "v1" | "v2",
  side: Side,
  layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
): ShadowRenderGeometryContext {
  const snapshot =
    version === "v1"
      ? resolveGeometryV1RuntimeSnapshot(side)
      : resolveProductMasterRuntimeSnapshot(side);

  return {
    version,
    side,
    snapshot,
    placements: resolveShadowLayerPlacements(snapshot, layers),
  };
}

export function compareShadowRenderGeometry(
  side: Side,
  colorSlug: string,
  layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
): ShadowRenderGeometryCompare {
  const v1Ctx = buildShadowRenderGeometryContext("v1", side, layers);
  const v2Ctx = buildShadowRenderGeometryContext("v2", side, layers);

  const layerCompares: ShadowRenderLayerCompare[] = v1Ctx.placements.map(
    (v1p, i) => {
      const v2p = v2Ctx.placements[i];
      return {
        layerId: v1p.layerId,
        v1Position: { ...v1p.position },
        v2Position: { ...v2p.position },
        positionDeltaX: +(v2p.position.x - v1p.position.x).toFixed(2),
        positionDeltaY: +(v2p.position.y - v1p.position.y).toFixed(2),
        v1Scale: v1p.scale,
        v2Scale: v2p.scale,
        scaleDelta: +(v2p.scale - v1p.scale).toFixed(4),
        v1RotationDeg: v1p.rotationDeg,
        v2RotationDeg: v2p.rotationDeg,
        rotationDeltaDeg: +(v2p.rotationDeg - v1p.rotationDeg).toFixed(2),
      };
    },
  );

  const maxPosDelta = Math.max(
    ...layerCompares.map((l) => Math.abs(l.positionDeltaY)),
    Math.abs(v2Ctx.snapshot.artworkStage.top - v1Ctx.snapshot.artworkStage.top),
  );

  return {
    side,
    colorSlug,
    artworkStage: {
      v1: { ...v1Ctx.snapshot.artworkStage },
      v2: { ...v2Ctx.snapshot.artworkStage },
      deltaY: +(
        v2Ctx.snapshot.artworkStage.top - v1Ctx.snapshot.artworkStage.top
      ).toFixed(2),
    },
    safeArea: {
      v1: { ...v1Ctx.snapshot.safeArea },
      v2: { ...v2Ctx.snapshot.safeArea },
      deltaY: +(v2Ctx.snapshot.safeArea.top - v1Ctx.snapshot.safeArea.top).toFixed(
        2,
      ),
    },
    factoryOrigin: {
      v1: { ...v1Ctx.snapshot.factoryOrigin },
      v2: { ...v2Ctx.snapshot.factoryOrigin },
      deltaY: +(
        v2Ctx.snapshot.factoryOrigin.y - v1Ctx.snapshot.factoryOrigin.y
      ).toFixed(2),
    },
    layers: layerCompares,
    verdict: maxPosDelta > 50 ? "WARNING" : "PASS",
  };
}

function layerSvg(
  layer: ShadowDesignerLayer,
  placement: ShadowLayerPlacement,
  stageColor: string,
): string {
  const { x, y } = placement.position;
  const w = placement.widthPx;
  const h = placement.heightPx;
  return `
    <g transform="translate(${x} ${y}) rotate(${placement.rotationDeg})">
      <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="${layer.fill}" fill-opacity="0.85" stroke="${stageColor}" stroke-width="1"/>
      <text x="0" y="4" text-anchor="middle" font-family="monospace" font-size="11" fill="#fff">${layer.id}</text>
    </g>
  `;
}

function buildShadowRenderSvg(
  ctx: ShadowRenderGeometryContext,
  layers: ShadowDesignerLayer[],
  label: string,
  stageColor: string,
): string {
  const stage = ctx.snapshot.artworkStage;
  const safe = ctx.snapshot.safeArea;
  const origin = ctx.snapshot.factoryOrigin;

  const layerSvgs = layers
    .map((layer, i) => layerSvg(layer, ctx.placements[i], stageColor))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHADOW_RENDER_CANVAS_WIDTH}" height="${SHADOW_RENDER_CANVAS_HEIGHT}" viewBox="0 0 ${SHADOW_RENDER_CANVAS_WIDTH} ${SHADOW_RENDER_CANVAS_HEIGHT}">
  <rect width="100%" height="100%" fill="none"/>
  <text x="16" y="28" font-family="monospace" font-size="18" fill="#111">${label}</text>
  <text x="16" y="52" font-family="monospace" font-size="13" fill="${stageColor}">${ctx.version.toUpperCase()} Shadow Render</text>
  <rect x="${stage.left}" y="${stage.top}" width="${stage.width}" height="${stage.height}" fill="none" stroke="${stageColor}" stroke-width="2" stroke-opacity="0.6"/>
  <rect x="${safe.left}" y="${safe.top}" width="${safe.width}" height="${safe.height}" fill="none" stroke="${stageColor}" stroke-width="1.5" stroke-dasharray="4 3" stroke-opacity="0.5"/>
  <line x1="${origin.x - 10}" y1="${origin.y}" x2="${origin.x + 10}" y2="${origin.y}" stroke="${stageColor}" stroke-width="2"/>
  <line x1="${origin.x}" y1="${origin.y - 10}" x2="${origin.x}" y2="${origin.y + 10}" stroke="${stageColor}" stroke-width="2"/>
  ${layerSvgs}
</svg>`;
}

async function blendGarmentBackground(
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

export async function renderShadowGeometryFrame(
  ctx: ShadowRenderGeometryContext,
  templatePath: string,
  uaPath: string,
  outputPath: string,
  layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
): Promise<string> {
  const color = ctx.version === "v1" ? "#ef4444" : "#2563eb";
  const label = `${ctx.version.toUpperCase()} — ${ctx.side}`;
  const svg = buildShadowRenderSvg(ctx, layers, label, color);
  const background = await blendGarmentBackground(templatePath, uaPath);

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(background)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  return outputPath;
}

export async function computeShadowPixelDifferenceAsync(
  v1Png: Buffer,
  v2Png: Buffer,
  threshold = 8,
): Promise<ShadowPixelDifferenceReport> {
  const v1 = await sharp(v1Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const v2 = await sharp(v2Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { data: d1, info } = v1;
  const { data: d2 } = v2;
  const { width, height } = info;
  const totalPixels = width * height;

  let differingPixels = 0;
  let maxChannelDelta = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(d1[i] - d2[i]);
      const dg = Math.abs(d1[i + 1] - d2[i + 1]);
      const db = Math.abs(d1[i + 2] - d2[i + 2]);
      const da = Math.abs(d1[i + 3] - d2[i + 3]);
      const delta = Math.max(dr, dg, db, da);

      if (delta > threshold) {
        differingPixels++;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const boundingDifference: GeometryV2Rect | null =
    differingPixels > 0
      ? {
          left: minX,
          top: minY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        }
      : null;

  return {
    differingPixels,
    totalPixels,
    diffPercent: (differingPixels / totalPixels) * 100,
    boundingDifference,
    centerDifference: boundingDifference
      ? rectCenter(boundingDifference)
      : null,
    topDifference: boundingDifference ? boundingDifference.top : null,
    bottomDifference: boundingDifference
      ? boundingDifference.top + boundingDifference.height
      : null,
    maxChannelDelta,
  };
}

export async function renderShadowPixelHeatmap(
  v1Png: Buffer,
  v2Png: Buffer,
  outputPath: string,
  threshold = 8,
): Promise<string> {
  const v1 = await sharp(v1Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const v2 = await sharp(v2Png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { data: d1, info } = v1;
  const { data: d2 } = v2;
  const { width, height } = info;
  const heat = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(d1[i] - d2[i]);
      const dg = Math.abs(d1[i + 1] - d2[i + 1]);
      const db = Math.abs(d1[i + 2] - d2[i + 2]);
      const da = Math.abs(d1[i + 3] - d2[i + 3]);
      const delta = Math.max(dr, dg, db, da);
      const o = i;
      if (delta > threshold) {
        const intensity = Math.min(255, Math.round((delta / 255) * 255));
        heat[o] = intensity;
        heat[o + 1] = 0;
        heat[o + 2] = 255 - intensity;
        heat[o + 3] = 180;
      } else {
        heat[o] = d1[i];
        heat[o + 1] = d1[i + 1];
        heat[o + 2] = d1[i + 2];
        heat[o + 3] = 40;
      }
    }
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(heat, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputPath);

  return outputPath;
}

export function buildShadowRenderOutputPath(
  colorSlug: string,
  side: Side,
  version: "v1" | "v2",
  rootDir: string = SHADOW_RENDER_OUTPUT_DIR,
): string {
  const suffix = version === "v1" ? "v1-render" : "shadow";
  return join(rootDir, `${colorSlug}-${side}-${suffix}.png`);
}

export async function runShadowRenderAudit(
  colorSlug: string,
  side: Side,
  rootDir: string = SHADOW_RENDER_OUTPUT_DIR,
  layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
): Promise<ShadowRenderResult> {
  const templateSlug = resolveTemplateSlugForUa(colorSlug);
  const templatePath = join(
    process.cwd(),
    buildTemplateAssetRelativePath(templateSlug, side),
  );
  const uaPath = join(
    process.cwd(),
    buildGeometryV2AssetRelativePath(colorSlug, side),
  );

  const v1Ctx = buildShadowRenderGeometryContext("v1", side, layers);
  const v2Ctx = buildShadowRenderGeometryContext("v2", side, layers);

  const v1OutputPath = buildShadowRenderOutputPath(colorSlug, side, "v1", rootDir);
  const v2OutputPath = buildShadowRenderOutputPath(colorSlug, side, "v2", rootDir);
  const heatmapPath = join(rootDir, `${colorSlug}-${side}-diff-heatmap.png`);

  await renderShadowGeometryFrame(v1Ctx, templatePath, uaPath, v1OutputPath, layers);
  await renderShadowGeometryFrame(v2Ctx, templatePath, uaPath, v2OutputPath, layers);

  const v1Png = await sharp(v1OutputPath).png().toBuffer();
  const v2Png = await sharp(v2OutputPath).png().toBuffer();

  const pixelDiff = await computeShadowPixelDifferenceAsync(v1Png, v2Png);
  await renderShadowPixelHeatmap(v1Png, v2Png, heatmapPath);

  const geometryCompare = compareShadowRenderGeometry(side, colorSlug, layers);

  return {
    side,
    colorSlug,
    v1OutputPath,
    v2OutputPath,
    heatmapPath,
    geometryCompare,
    pixelDiff,
  };
}

/**
 * GeometryShadowRenderer — dev-only V2 shadow render pipeline.
 */
export class GeometryShadowRenderer {
  private readonly layers: ShadowDesignerLayer[];
  private readonly outputDir: string;

  constructor(
    layers: ShadowDesignerLayer[] = SHADOW_RENDER_AUDIT_LAYERS,
    outputDir: string = SHADOW_RENDER_OUTPUT_DIR,
  ) {
    assertActiveGeometryRemainsV1();
    assertGeometryShadowRenderSafeForProduction();
    this.layers = layers;
    this.outputDir = outputDir;
  }

  isEnabled(): boolean {
    return isGeometryShadowRenderEnabled();
  }

  async render(
    colorSlug: string,
    side: Side,
  ): Promise<ShadowRenderResult | null> {
    if (!this.isEnabled()) return null;
    return runShadowRenderAudit(colorSlug, side, this.outputDir, this.layers);
  }

  async renderWhiteBothSides(): Promise<{
    front: ShadowRenderResult | null;
    back: ShadowRenderResult | null;
  }> {
    return {
      front: await this.render("white", "front"),
      back: await this.render("white", "back"),
    };
  }
}

export function createGeometryShadowRenderer(): GeometryShadowRenderer | null {
  if (!isGeometryShadowRenderEnabled()) return null;
  return new GeometryShadowRenderer();
}

export { SHADOW_RENDER_AUDIT_LAYERS };
