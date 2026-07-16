/**
 * Workspace Snap Target Cache — reuse snap targets for entire canvas drag gesture.
 * Snap algorithm unchanged; only avoids rebuild on each RAF applyClampedLayerTransform.
 */

import { buildSnapTargetsFromLayers } from "@/lib/snap-targets";
import type { SnapTarget } from "@/lib/element-snap";
import type { DesignLayer } from "@/lib/types";

export type WorkspaceSnapTargetCache = ReadonlyMap<string, SnapTarget[]>;

/** Build workspace snap targets for each visible layer once per drag gesture. */
export function createWorkspaceSnapCache(
  layers: DesignLayer[],
): WorkspaceSnapTargetCache {
  const visibleLayers = layers.filter((layer) => layer.visible && !layer.locked);
  const cache = new Map<string, SnapTarget[]>();

  for (const layer of visibleLayers) {
    cache.set(layer.id, buildSnapTargetsFromLayers(layer.id, layers));
  }

  return cache;
}

export function getWorkspaceSnapTargetsForLayer(
  cache: WorkspaceSnapTargetCache,
  activeLayerId: string,
): SnapTarget[] {
  return cache.get(activeLayerId) ?? [];
}

export function resolveWorkspaceSnapTargetsForLayer(
  cache: WorkspaceSnapTargetCache | null,
  activeLayerId: string,
  visibleLayers: DesignLayer[],
): SnapTarget[] {
  if (cache) {
    return getWorkspaceSnapTargetsForLayer(cache, activeLayerId);
  }
  return buildSnapTargetsFromLayers(activeLayerId, visibleLayers);
}
