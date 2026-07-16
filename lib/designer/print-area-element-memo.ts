/**
 * PrintAreaElement memo helpers — Phase 28-2D2 render isolation.
 * Compare props for React.memo without changing snap / coordinate runtime.
 */

import type { RefObject } from "react";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import type {
  DesignerCoordinateContext,
  DesignerCssPercentStyle,
} from "@/lib/designer-coordinate-facade";
import type { DesignerSnapTargetCache } from "@/lib/designer/snap-target-cache";
import type { GarmentConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
import type { DesignLayer } from "@/lib/types";

export interface SnapGuidesState {
  printCenterX: boolean;
  printCenterY: boolean;
  elementVertical: number[];
  elementHorizontal: number[];
}

export interface PrintAreaElementProps {
  layer: DesignLayer;
  layerId: string;
  designerPointerContext: DesignerCoordinateContext;
  designerSnapTargetCacheRef: RefObject<DesignerSnapTargetCache>;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  isActive: boolean;
  showControls: boolean;
  locked: boolean;
  isEditing?: boolean;
  gridSnapEnabled: boolean;
  elementSnapEnabled: boolean;
  elementSnapDistance: number;
  onSelect: (shiftKey: boolean) => void;
  onTransformChange: (next: {
    x: number;
    y: number;
    scale?: number;
  }) => void;
  onResizeChange?: (next: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  onDoubleClick?: () => void;
  onSnapGuidesChange: (guides: SnapGuidesState) => void;
  onDragTransformFlush?: () => void;
  onDragTransformCancel?: () => void;
  printArea: PrintAreaCmBounds;
  maxResizeWidth_cm?: number;
  maxResizeHeight_cm?: number;
  hasPrintAreaOverflow?: boolean;
  constraintWarningLabel?: string | null;
  constraintBadge?: GarmentConstraintBadgeMeta | null;
  displayPercentStyle?: DesignerCssPercentStyle;
  children: React.ReactNode;
  className?: string;
}

export function designerCssPercentStylesEqual(
  a: DesignerCssPercentStyle | undefined,
  b: DesignerCssPercentStyle | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return a === b;
  return (
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function garmentConstraintBadgeEqual(
  a: GarmentConstraintBadgeMeta | null | undefined,
  b: GarmentConstraintBadgeMeta | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.level === b.level &&
    a.shortLabel === b.shortLabel &&
    a.tooltip === b.tooltip
  );
}

/** Bail out when layer identity and visual/interaction props are unchanged. */
export function arePrintAreaElementPropsEqual(
  prev: PrintAreaElementProps,
  next: PrintAreaElementProps,
): boolean {
  if (prev.layer !== next.layer) return false;

  if (prev.x !== next.x || prev.y !== next.y) return false;
  if (prev.width !== next.width || prev.height !== next.height) return false;
  if (prev.scale !== next.scale || prev.rotation !== next.rotation) return false;

  if (prev.isActive !== next.isActive) return false;
  if (prev.showControls !== next.showControls) return false;
  if (prev.locked !== next.locked) return false;
  if (prev.isEditing !== next.isEditing) return false;

  if (prev.gridSnapEnabled !== next.gridSnapEnabled) return false;
  if (prev.elementSnapEnabled !== next.elementSnapEnabled) return false;
  if (prev.elementSnapDistance !== next.elementSnapDistance) return false;

  if (prev.hasPrintAreaOverflow !== next.hasPrintAreaOverflow) return false;
  if (prev.constraintWarningLabel !== next.constraintWarningLabel) return false;
  if (!garmentConstraintBadgeEqual(prev.constraintBadge, next.constraintBadge)) {
    return false;
  }

  if (prev.maxResizeWidth_cm !== next.maxResizeWidth_cm) return false;
  if (prev.maxResizeHeight_cm !== next.maxResizeHeight_cm) return false;

  if (
    !designerCssPercentStylesEqual(
      prev.displayPercentStyle,
      next.displayPercentStyle,
    )
  ) {
    return false;
  }

  if (prev.designerPointerContext !== next.designerPointerContext) return false;
  if (prev.printArea !== next.printArea) return false;
  if (prev.className !== next.className) return false;
  if (prev.layerId !== next.layerId) return false;
  if (prev.designerSnapTargetCacheRef !== next.designerSnapTargetCacheRef) {
    return false;
  }

  if (prev.onSelect !== next.onSelect) return false;
  if (prev.onTransformChange !== next.onTransformChange) return false;
  if (prev.onResizeChange !== next.onResizeChange) return false;
  if (prev.onDoubleClick !== next.onDoubleClick) return false;
  if (prev.onSnapGuidesChange !== next.onSnapGuidesChange) return false;
  if (prev.onDragTransformFlush !== next.onDragTransformFlush) return false;
  if (prev.onDragTransformCancel !== next.onDragTransformCancel) return false;

  // Snap targets read from designerSnapTargetCacheRef during drag — not compared.
  // children omitted — derived from layer + isEditing.
  return true;
}
