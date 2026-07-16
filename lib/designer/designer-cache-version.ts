/**
 * Designer cache versioning — Phase 28-3A.
 * Reuse snap / constraint caches when only layer position (x/y) changes.
 */

import type { CurrentGarmentConstraintState } from "@/lib/current-garment-print-constraint";
import { buildCurrentGarmentConstraintMap } from "@/lib/current-garment-print-constraint";
import type { DesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import {
  buildDesignerSnapTargetCache,
  type DesignerSnapTargetCache,
} from "@/lib/designer/snap-target-cache";
import { getLayersForCanvasRender } from "@/lib/layer-system";
import type { DesignLayer } from "@/lib/types";

export interface DesignerCacheVersion {
  designerSnapVersion: string;
  constraintVersion: string;
}

export interface DesignerSnapTargetCacheStore {
  version: string;
  cache: DesignerSnapTargetCache;
}

export interface DesignerConstraintCacheStore {
  version: string;
  map: Map<string, CurrentGarmentConstraintState>;
}

function layerSnapConstraintFingerprint(layer: DesignLayer): string {
  const parts: Array<string | number> = [
    layer.id,
    layer.type,
    layer.visible ? 1 : 0,
    layer.locked ? 1 : 0,
    layer.rotation,
    layer.width_cm,
    layer.height_cm,
    layer.zIndex,
  ];

  if (layer.type === "image" || layer.type === "shape") {
    parts.push(layer.scale);
  }

  if (layer.type === "shape") {
    parts.push(layer.shapeKind);
  }

  if (layer.type === "text") {
    parts.push(layer.scale, layer.fontSize_cm, layer.text);
  }

  return parts.join("|");
}

function buildLayersFingerprint(layers: DesignLayer[]): string {
  return [...layers]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(layerSnapConstraintFingerprint)
    .join("\n");
}

export function computeDesignerSnapCacheVersion(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): string {
  const canvasLayers = getLayersForCanvasRender(layers);
  return [
    "snap",
    ctx.side,
    ctx.size,
    buildLayersFingerprint(canvasLayers),
  ].join("::");
}

export function computeConstraintCacheVersion(
  layers: DesignLayer[],
  side: string,
  size: string,
): string {
  return ["constraint", side, size, buildLayersFingerprint(layers)].join("::");
}

export function computeDesignerCacheVersion(
  layers: DesignLayer[],
  visibleLayers: DesignLayer[],
  ctx: DesignerCoordinateContext,
  side: string,
  size: string,
): DesignerCacheVersion {
  return {
    designerSnapVersion: computeDesignerSnapCacheVersion(layers, ctx),
    constraintVersion: computeConstraintCacheVersion(visibleLayers, side, size),
  };
}

export function resolveDesignerSnapTargetCache(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
  storeRef: { current: DesignerSnapTargetCacheStore | null },
): DesignerSnapTargetCache {
  const version = computeDesignerSnapCacheVersion(layers, ctx);
  const prev = storeRef.current;
  if (prev?.version === version) {
    return prev.cache;
  }
  const cache = buildDesignerSnapTargetCache(layers, ctx);
  storeRef.current = { version, cache };
  return cache;
}

export function resolveDesignerConstraintMap(
  layers: DesignLayer[],
  side: Parameters<typeof buildCurrentGarmentConstraintMap>[1],
  size: Parameters<typeof buildCurrentGarmentConstraintMap>[2],
  storeRef: { current: DesignerConstraintCacheStore | null },
): Map<string, CurrentGarmentConstraintState> {
  const version = computeConstraintCacheVersion(layers, side, size);
  const prev = storeRef.current;
  if (prev?.version === version) {
    return prev.map;
  }
  const map = buildCurrentGarmentConstraintMap(layers, side, size);
  storeRef.current = { version, map };
  return map;
}

export function invalidateDesignerCacheStores(
  snapStoreRef: { current: DesignerSnapTargetCacheStore | null },
  constraintStoreRef: { current: DesignerConstraintCacheStore | null },
): void {
  snapStoreRef.current = null;
  constraintStoreRef.current = null;
}
