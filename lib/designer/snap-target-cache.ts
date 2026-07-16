/**
 * Designer Snap Target Cache — avoid O(N²) rebuild inside visibleLayers.map per render.
 * Snap algorithm unchanged; only consolidates target construction behind useMemo.
 */

import { buildDesignerSnapTargetsFromLayers } from "@/lib/designer-coordinate-controller";
import type { DesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import type { SnapTarget } from "@/lib/element-snap";
import { getLayersForCanvasRender } from "@/lib/layer-system";
import type { DesignLayer } from "@/lib/types";

export type DesignerSnapTargetCache = ReadonlyMap<string, SnapTarget[]>;

/**
 * Build per-layer designer snap targets once per layers reference change.
 * Equivalent to calling buildDesignerSnapTargetsFromLayers per visible layer.
 */
export function buildDesignerSnapTargetCache(
  layers: DesignLayer[],
  ctx: DesignerCoordinateContext,
): DesignerSnapTargetCache {
  const visibleLayers = getLayersForCanvasRender(layers).filter((layer) => layer.visible);
  const cache = new Map<string, SnapTarget[]>();

  for (const layer of visibleLayers) {
    cache.set(
      layer.id,
      buildDesignerSnapTargetsFromLayers(layer.id, layers, ctx),
    );
  }

  return cache;
}

export function getDesignerSnapTargetsForLayer(
  cache: DesignerSnapTargetCache,
  layerId: string,
): SnapTarget[] {
  return cache.get(layerId) ?? [];
}
