import type { DesignLayer } from "./types";
import { revokeLayerAssets } from "./layers";

export const MAX_DESIGN_HISTORY = 50;

export interface DesignHistoryStacks {
  historyStack: DesignLayer[][];
  futureStack: DesignLayer[][];
}

export function createEmptyHistoryStacks(): DesignHistoryStacks {
  return { historyStack: [], futureStack: [] };
}

export function cloneDesignLayers(layers: DesignLayer[]): DesignLayer[] {
  return structuredClone(layers);
}

export function pushHistorySnapshot(
  stacks: DesignHistoryStacks,
  snapshot: DesignLayer[],
): { stacks: DesignHistoryStacks; droppedSnapshots: DesignLayer[][] } {
  const entry = cloneDesignLayers(snapshot);
  let historyStack = [...stacks.historyStack, entry];
  let droppedSnapshots: DesignLayer[][] = [];
  if (historyStack.length > MAX_DESIGN_HISTORY) {
    droppedSnapshots = historyStack.slice(0, historyStack.length - MAX_DESIGN_HISTORY);
    historyStack = historyStack.slice(-MAX_DESIGN_HISTORY);
  }
  return {
    stacks: { historyStack, futureStack: [] },
    droppedSnapshots,
  };
}

export function undoHistory(
  stacks: DesignHistoryStacks,
  currentLayers: DesignLayer[],
): {
  stacks: DesignHistoryStacks;
  snapshot: DesignLayer[];
} | null {
  if (stacks.historyStack.length === 0) return null;
  const snapshot = stacks.historyStack[stacks.historyStack.length - 1]!;
  return {
    stacks: {
      historyStack: stacks.historyStack.slice(0, -1),
      futureStack: [...stacks.futureStack, cloneDesignLayers(currentLayers)],
    },
    snapshot: cloneDesignLayers(snapshot),
  };
}

export function redoHistory(
  stacks: DesignHistoryStacks,
  currentLayers: DesignLayer[],
): {
  stacks: DesignHistoryStacks;
  snapshot: DesignLayer[];
} | null {
  if (stacks.futureStack.length === 0) return null;
  const snapshot = stacks.futureStack[stacks.futureStack.length - 1]!;
  return {
    stacks: {
      historyStack: [...stacks.historyStack, cloneDesignLayers(currentLayers)],
      futureStack: stacks.futureStack.slice(0, -1),
    },
    snapshot: cloneDesignLayers(snapshot),
  };
}

function collectImageLayerIds(layers: DesignLayer[]): Set<string> {
  const ids = new Set<string>();
  for (const layer of layers) {
    if (layer.type === "image") ids.add(layer.id);
  }
  return ids;
}

function collectRetainedImageLayerIds(
  retainedSnapshots: DesignLayer[][],
  liveLayers: DesignLayer[],
): Set<string> {
  const retainedIds = new Set<string>();
  for (const snapshot of retainedSnapshots) {
    for (const id of collectImageLayerIds(snapshot)) {
      retainedIds.add(id);
    }
  }
  for (const id of collectImageLayerIds(liveLayers)) {
    retainedIds.add(id);
  }
  return retainedIds;
}

/**
 * 刪除圖層時釋放 blob URL；若 layer id 仍存於 history/future 或 live 則保留（Undo 可還原）。
 */
export function revokeLayerAssetsUnlessRetained(
  layer: DesignLayer,
  stacks: DesignHistoryStacks,
  liveLayers: DesignLayer[],
): void {
  if (layer.type !== "image") return;
  const retainedIds = collectRetainedImageLayerIds(
    [...stacks.historyStack, ...stacks.futureStack],
    liveLayers,
  );
  if (!retainedIds.has(layer.id)) {
    revokeLayerAssets(layer);
  }
}

/** 從 history 修剪或清除設計時，釋放不再被任何快照引用的圖片 object URL */
export function revokeImageAssetsNotInSnapshots(
  droppedSnapshots: DesignLayer[][],
  retainedSnapshots: DesignLayer[][],
  liveLayers: DesignLayer[],
) {
  const retainedIds = collectRetainedImageLayerIds(
    retainedSnapshots,
    liveLayers,
  );

  for (const snapshot of droppedSnapshots) {
    for (const layer of snapshot) {
      if (layer.type === "image" && !retainedIds.has(layer.id)) {
        revokeLayerAssets(layer);
      }
    }
  }
}

export function isHistoryShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}
