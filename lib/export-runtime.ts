/**
 * Export Runtime — Phase 15.2
 * ───────────────────────────
 * Workspace Storage → Facade (read-only) → Physical Garment cm → Export / Mockup / Factory
 *
 * Independent from Preview Runtime and Designer Display Runtime.
 */

import type { Side } from "./constants";
import type { LayerCmRect } from "./design-cm";
import { getLayerEffectiveCmRect } from "./design-cm";
import {
  createDesignerCoordinateContext,
  workspaceRectToDesignerRect,
} from "./designer-coordinate-facade";
import type { LiveDesignStateElement } from "./live-design-state";
import { getTextLayerExportCmRect } from "./text-layer";
import type { DesignLayer } from "./types";

function readExportWorkspaceLayerCmRect(layer: DesignLayer): LayerCmRect {
  if (layer.type === "text") {
    return getTextLayerExportCmRect(layer);
  }
  return getLayerEffectiveCmRect(layer);
}

export interface ExportRuntimeContext {
  side: Side;
  size: string;
}

export function createExportRuntimeContext(
  side: Side,
  size: string,
): ExportRuntimeContext {
  return { side, size };
}

/** Workspace M storage → garment printable-area cm (Facade read-only). */
export function projectWorkspaceRectToExportGarment(
  workspaceRect: LayerCmRect,
  ctx: ExportRuntimeContext,
): LayerCmRect {
  const facadeCtx = createDesignerCoordinateContext(ctx.side, ctx.size);
  return workspaceRectToDesignerRect(workspaceRect, facadeCtx);
}

export function projectExportLayerToGarment(
  layer: DesignLayer,
  ctx: ExportRuntimeContext,
): LayerCmRect {
  const workspaceRect = readExportWorkspaceLayerCmRect(layer);
  return projectWorkspaceRectToExportGarment(workspaceRect, ctx);
}

export function resolveExportGarmentLayerCmRect(
  layer: DesignLayer,
  side: Side,
  size: string,
): LayerCmRect {
  return projectExportLayerToGarment(
    layer,
    createExportRuntimeContext(side, size),
  );
}

/** Factory PDF labels — garment physical cm without mutating inspector runtime. */
export function mapLiveDesignElementsToExportPhysical(
  elements: readonly LiveDesignStateElement[],
  layers: readonly DesignLayer[],
  side: Side,
  size: string,
): LiveDesignStateElement[] {
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const ctx = createExportRuntimeContext(side, size);
  return elements.map((element) => {
    const layer = layerById.get(element.id);
    if (!layer) return element;
    const garment = projectExportLayerToGarment(layer, ctx);
    return {
      ...element,
      x_cm: garment.x_cm,
      y_cm: garment.y_cm,
      width_cm: garment.width_cm,
      height_cm: garment.height_cm,
    };
  });
}
