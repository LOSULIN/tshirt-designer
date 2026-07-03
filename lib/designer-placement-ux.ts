/**
 * Designer Placement UX — Phase 14.2 / 14.2.2
 * Preset application at true physical print size (Designer cm).
 * Converts once at creation via Facade; does not modify runtime after store.
 */

import type { LayerCmRect } from "./design-cm";
import {
  designerRectToWorkspaceRect,
  workspaceRectToDesignerRect,
  type DesignerCoordinateContext,
} from "./designer-coordinate-facade";
import {
  getPlacementPresetTargetRect,
  type PlacementPreset,
} from "./placement-presets";
import type {
  DesignLayer,
  ImageDesignLayer,
  ShapeDesignLayer,
  TextDesignLayer,
} from "./types";

/**
 * Physical preset cm → Designer rect (anchor center preserved) → Workspace storage.
 * Preset width_cm / height_cm are real-world print dimensions, not Workspace M units.
 */
export function resolvePhysicalPresetWorkspaceRect(
  preset: PlacementPreset,
  ctx: DesignerCoordinateContext,
): LayerCmRect {
  const workspaceAnchorTarget = getPlacementPresetTargetRect(preset);
  const designerAnchorRect = workspaceRectToDesignerRect(
    workspaceAnchorTarget,
    ctx,
  );
  const centerX = designerAnchorRect.x_cm + designerAnchorRect.width_cm / 2;
  const centerY = designerAnchorRect.y_cm + designerAnchorRect.height_cm / 2;
  const physicalDesignerRect: LayerCmRect = {
    x_cm: centerX - preset.width_cm / 2,
    y_cm: centerY - preset.height_cm / 2,
    width_cm: preset.width_cm,
    height_cm: preset.height_cm,
  };
  return designerRectToWorkspaceRect(physicalDesignerRect, ctx);
}

/** Apply preset at physical cm; Workspace storage via designerRectToWorkspaceRect. */
export function applyDesignerPlacementPresetPreserveSize(
  layer: DesignLayer,
  preset: PlacementPreset,
  ctx: DesignerCoordinateContext,
): DesignLayer {
  const target = resolvePhysicalPresetWorkspaceRect(preset, ctx);
  const positioned = {
    ...layer,
    x_cm: target.x_cm,
    y_cm: target.y_cm,
    width_cm: target.width_cm,
    height_cm: target.height_cm,
  };

  if (layer.type === "text") {
    return {
      ...positioned,
      keepRatio: false,
    } as TextDesignLayer;
  }

  if (layer.type === "shape") {
    return { ...positioned, scale: 1 } as ShapeDesignLayer;
  }

  if (layer.type === "image") {
    return { ...positioned, scale: 1 } as ImageDesignLayer;
  }

  return positioned;
}
