/**
 * Drag Snap Diagnostic — Phase 28-3A2 (development only).
 * Mirrors snap pipeline steps for logging; does not alter production behavior.
 */

import {
  GRID_SIZE_CM,
  GRID_SNAP_THRESHOLD_CM,
  ELEMENT_SNAP_THRESHOLD_CM,
  SNAP_THRESHOLD_CM,
} from "@/lib/constants";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import {
  getDesignerGridSizeCm,
  projectSnapTargetsToDesigner,
  type DesignerDragSnapOptions,
} from "@/lib/designer-coordinate-controller";
import type { DesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import {
  getDesignerPrintableArea,
  projectLayerToDesigner,
  workspaceLengthToDesignerLength,
} from "@/lib/designer-coordinate-facade";
import {
  applyElementAlignmentSnap,
  type SnapTarget,
} from "@/lib/element-snap";
import { getScaledSize } from "@/lib/geometry";
import type { DesignLayer } from "@/lib/types";

export const DRAG_SNAP_POSITION_EPSILON = 0.25;

export function isDragSnapDiagnosticEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  if (typeof window === "undefined") return false;
  return (window as DragSnapDiagnosticWindow).__DRAG_SNAP_DIAG__ !== false;
}

interface DragSnapDiagnosticWindow extends Window {
  __DRAG_SNAP_DIAG__?: boolean;
}

interface SnapAxisTrace {
  before: number;
  after: number;
  snapped: boolean;
  gridLine?: number;
}

function traceSnapAxisToGrid(
  value: number,
  gridSize: number,
  threshold: number,
): SnapAxisTrace {
  const gridLine = Math.round(value / gridSize) * gridSize;
  if (Math.abs(value - gridLine) <= threshold) {
    return { before: value, after: gridLine, snapped: true, gridLine };
  }
  return { before: value, after: value, snapped: false, gridLine };
}

export interface ElementSnapProbe {
  threshold: number;
  otherCount: number;
  targetIds: string[];
  bestX: { dist: number; newX: number; guide: number } | null;
  bestY: { dist: number; newY: number; guide: number } | null;
  resultX: number;
  resultY: number;
  snappedX: boolean;
  snappedY: boolean;
}

/** Dev-only probe — duplicates element-snap search to expose bestX/bestY distances. */
export function probeElementAlignmentSnap(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  others: SnapTarget[],
  threshold: number,
): ElementSnapProbe {
  const scaled = getScaledSize(width, height, scale);
  const drag = {
    left: x,
    top: y,
    right: x + scaled.width,
    bottom: y + scaled.height,
    centerX: x + scaled.width / 2,
    centerY: y + scaled.height / 2,
    width: scaled.width,
    height: scaled.height,
  };

  let bestX: ElementSnapProbe["bestX"] = null;
  let bestY: ElementSnapProbe["bestY"] = null;

  for (const other of others) {
    const oScale = getScaledSize(other.width, other.height, other.scale);
    const target = {
      left: other.x,
      top: other.y,
      right: other.x + oScale.width,
      bottom: other.y + oScale.height,
      centerX: other.x + oScale.width / 2,
      centerY: other.y + oScale.height / 2,
    };

    const xPairs = [
      { dragEdge: drag.left, targetEdge: target.left, newX: target.left, guide: target.left },
      { dragEdge: drag.left, targetEdge: target.right, newX: target.right, guide: target.right },
      {
        dragEdge: drag.right,
        targetEdge: target.left,
        newX: target.left - drag.width,
        guide: target.left,
      },
      {
        dragEdge: drag.right,
        targetEdge: target.right,
        newX: target.right - drag.width,
        guide: target.right,
      },
      {
        dragEdge: drag.centerX,
        targetEdge: target.centerX,
        newX: target.centerX - drag.width / 2,
        guide: target.centerX,
      },
    ];

    for (const pair of xPairs) {
      const dist = Math.abs(pair.dragEdge - pair.targetEdge);
      if (dist <= threshold && (!bestX || dist < bestX.dist)) {
        bestX = { dist, newX: pair.newX, guide: pair.guide };
      }
    }

    const yPairs = [
      { dragEdge: drag.top, targetEdge: target.top, newY: target.top, guide: target.top },
      { dragEdge: drag.top, targetEdge: target.bottom, newY: target.bottom, guide: target.bottom },
      {
        dragEdge: drag.bottom,
        targetEdge: target.top,
        newY: target.top - drag.height,
        guide: target.top,
      },
      {
        dragEdge: drag.bottom,
        targetEdge: target.bottom,
        newY: target.bottom - drag.height,
        guide: target.bottom,
      },
      {
        dragEdge: drag.centerY,
        targetEdge: target.centerY,
        newY: target.centerY - drag.height / 2,
        guide: target.centerY,
      },
    ];

    for (const pair of yPairs) {
      const dist = Math.abs(pair.dragEdge - pair.targetEdge);
      if (dist <= threshold && (!bestY || dist < bestY.dist)) {
        bestY = { dist, newY: pair.newY, guide: pair.guide };
      }
    }
  }

  const el = applyElementAlignmentSnap(
    x,
    y,
    width,
    height,
    scale,
    others,
    threshold,
  );

  return {
    threshold,
    otherCount: others.length,
    targetIds: others.map((o) => o.id),
    bestX,
    bestY,
    resultX: el.x,
    resultY: el.y,
    snappedX: el.snappedX,
    snappedY: el.snappedY,
  };
}

export interface DragSnapStepTrace {
  space: "designer" | "workspace";
  before: { x: number; y: number };
  afterGrid: { x: number; y: number };
  afterElement: { x: number; y: number };
  afterCenter: { x: number; y: number };
  gridSnappedX: boolean;
  gridSnappedY: boolean;
  elementSnappedX: boolean;
  elementSnappedY: boolean;
  centerSnappedX: boolean;
  centerSnappedY: boolean;
  elementProbe: ElementSnapProbe | null;
  thresholds: {
    gridSize: number;
    gridThreshold: number;
    elementThreshold: number;
    centerThreshold: number;
  };
}

export function traceDragSnapSteps(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  printArea: PrintAreaCmBounds,
  options: {
    gridSnap: boolean;
    gridSize?: number;
    gridThreshold?: number;
    elementSnap?: boolean;
    elementSnapThreshold?: number;
    otherElements?: SnapTarget[];
  },
  space: "designer" | "workspace",
): DragSnapStepTrace {
  const scaled = getScaledSize(width, height, scale);
  const gridSize = options.gridSize ?? GRID_SIZE_CM;
  const gridThreshold = options.gridThreshold ?? GRID_SNAP_THRESHOLD_CM;
  const elementThreshold =
    options.elementSnapThreshold ?? ELEMENT_SNAP_THRESHOLD_CM;
  const others = options.otherElements ?? [];

  let nextX = x;
  let nextY = y;
  let gridSnappedX = false;
  let gridSnappedY = false;

  if (options.gridSnap) {
    const sx = traceSnapAxisToGrid(nextX, gridSize, gridThreshold);
    const sy = traceSnapAxisToGrid(nextY, gridSize, gridThreshold);
    nextX = sx.after;
    nextY = sy.after;
    gridSnappedX = sx.snapped;
    gridSnappedY = sy.snapped;
    if (sx.snapped) {
      console.info("[DragSnap] Grid Snap Triggered", {
        axis: "x",
        space,
        gridLine: sx.gridLine,
        before: sx.before,
        after: sx.after,
      });
    }
    if (sy.snapped) {
      console.info("[DragSnap] Grid Snap Triggered", {
        axis: "y",
        space,
        gridLine: sy.gridLine,
        before: sy.before,
        after: sy.after,
      });
    }
  }

  const afterGrid = { x: nextX, y: nextY };

  let elementProbe: ElementSnapProbe | null = null;
  let elementSnappedX = false;
  let elementSnappedY = false;

  if (options.elementSnap !== false && others.length > 0) {
    elementProbe = probeElementAlignmentSnap(
      nextX,
      nextY,
      width,
      height,
      scale,
      others,
      elementThreshold,
    );
    nextX = elementProbe.resultX;
    nextY = elementProbe.resultY;
    elementSnappedX = elementProbe.snappedX;
    elementSnappedY = elementProbe.snappedY;

    if (elementSnappedX || elementSnappedY) {
      console.info("[DragSnap] Element Snap Triggered", {
        space,
        layer: "active",
        targets: elementProbe.targetIds,
        threshold: elementThreshold,
        bestX: elementProbe.bestX,
        bestY: elementProbe.bestY,
        before: afterGrid,
        after: { x: nextX, y: nextY },
      });
    }
  }

  const afterElement = { x: nextX, y: nextY };

  let centerSnappedX = false;
  let centerSnappedY = false;
  const centerX = nextX + scaled.width / 2;
  const centerY = nextY + scaled.height / 2;
  const areaCenterX = printArea.width / 2;
  const areaCenterY = printArea.height / 2;

  if (Math.abs(centerX - areaCenterX) <= SNAP_THRESHOLD_CM) {
    const beforeCenterX = nextX;
    nextX = areaCenterX - scaled.width / 2;
    centerSnappedX = true;
    console.info("[DragSnap] Center Snap Triggered", {
      axis: "x",
      space,
      before: beforeCenterX,
      after: nextX,
    });
  }

  if (Math.abs(centerY - areaCenterY) <= SNAP_THRESHOLD_CM) {
    const beforeCenterY = nextY;
    nextY = areaCenterY - scaled.height / 2;
    centerSnappedY = true;
    console.info("[DragSnap] Center Snap Triggered", {
      axis: "y",
      space,
      before: beforeCenterY,
      after: nextY,
    });
  }

  return {
    space,
    before: { x, y },
    afterGrid,
    afterElement,
    afterCenter: { x: nextX, y: nextY },
    gridSnappedX,
    gridSnappedY,
    elementSnappedX,
    elementSnappedY,
    centerSnappedX,
    centerSnappedY,
    elementProbe,
    thresholds: {
      gridSize,
      gridThreshold,
      elementThreshold,
      centerThreshold: SNAP_THRESHOLD_CM,
    },
  };
}

/** Inverse of projectSnapTargetsToDesigner — for workspace trace from designer cache targets. */
export function projectDesignerSnapTargetsToWorkspace(
  targets: SnapTarget[],
  ctx: DesignerCoordinateContext,
): SnapTarget[] {
  const sx =
    ctx.garmentPrintArea.width / ctx.workspacePrintArea.width;
  const sy =
    ctx.garmentPrintArea.height / ctx.workspacePrintArea.height;
  return targets.map((target) => ({
    id: target.id,
    x: target.x / sx,
    y: target.y / sy,
    width: target.width / sx,
    height: target.height / sy,
    scale: target.scale,
  }));
}

export function buildDesignerSnapTraceOptions(
  layer: DesignLayer,
  ctx: DesignerCoordinateContext,
  options: DesignerDragSnapOptions,
): {
  width: number;
  height: number;
  scale: number;
  printArea: PrintAreaCmBounds;
  dragSnapOptions: Parameters<typeof traceDragSnapSteps>[6];
} {
  const projection = projectLayerToDesigner(layer, ctx);
  const designerTargets = projectSnapTargetsToDesigner(
    options.otherElements,
    ctx,
  );

  return {
    width: projection.width_cm / projection.scale,
    height: projection.height_cm / projection.scale,
    scale: projection.scale,
    printArea: getDesignerPrintableArea(ctx),
    dragSnapOptions: {
      gridSnap: options.gridSnap,
      gridSize: getDesignerGridSizeCm(ctx),
      gridThreshold: workspaceLengthToDesignerLength(
        GRID_SNAP_THRESHOLD_CM,
        ctx,
        "x",
      ),
      elementSnap: options.elementSnap,
      elementSnapThreshold: workspaceLengthToDesignerLength(
        options.elementSnapThresholdCm,
        ctx,
        "x",
      ),
      otherElements: designerTargets,
    },
  };
}

export interface PointerDragDiagnosticInput {
  phase: "pointer";
  layerId: string;
  clientX: number;
  clientY: number;
  deltaPx: number;
  deltaPy: number;
  designerX: number;
  designerY: number;
  layer: DesignLayer;
  ctx: DesignerCoordinateContext;
  printArea: PrintAreaCmBounds;
  snapOptions: DesignerDragSnapOptions;
  workspaceBeforeSnap: { x: number; y: number };
  workspaceAfterDesignerSnap: { x: number; y: number };
  workspaceAfterFit: { x: number; y: number };
  layerBefore: { x: number; y: number };
  elementSnapDistanceUi: number;
  elementSnapThresholdCm: number;
  workspaceOtherElements: SnapTarget[];
  committed: boolean;
}

export interface RafDragDiagnosticInput {
  phase: "raf";
  layerId: string;
  patch: { x_cm?: number; y_cm?: number };
  layerBefore: { x: number; y: number };
  layerAfter: { x: number; y: number };
  workspacePatch: { x_cm?: number; y_cm?: number };
  workspacePrintArea: PrintAreaCmBounds;
  gridSnapEnabled: boolean;
  elementSnapDistanceUi: number;
  elementSnapThresholdCm: number;
  otherElements: SnapTarget[];
  layer: DesignLayer;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function logPointerDragDiagnostic(input: PointerDragDiagnosticInput): void {
  if (!isDragSnapDiagnosticEnabled()) return;

  const markStart = `drag-snap-pointer-${input.layerId}`;
  performance.mark(`${markStart}-start`);

  const designerTraceInput = buildDesignerSnapTraceOptions(
    input.layer,
    input.ctx,
    input.snapOptions,
  );
  const designerTrace = traceDragSnapSteps(
    input.designerX,
    input.designerY,
    designerTraceInput.width,
    designerTraceInput.height,
    designerTraceInput.scale,
    designerTraceInput.printArea,
    designerTraceInput.dragSnapOptions,
    "designer",
  );

  const layerScale =
    input.layer.type === "image" || input.layer.type === "shape"
      ? input.layer.scale
      : 1;

  const workspaceTrace = traceDragSnapSteps(
    input.workspaceAfterDesignerSnap.x,
    input.workspaceAfterDesignerSnap.y,
    input.layer.width_cm,
    input.layer.height_cm,
    layerScale,
    input.printArea,
    {
      gridSnap: input.snapOptions.gridSnap,
      elementSnap: input.snapOptions.elementSnap,
      elementSnapThreshold: input.elementSnapThresholdCm,
      otherElements: input.workspaceOtherElements,
    },
    "workspace",
  );

  const actualDelta = {
    dx: round3(input.workspaceAfterFit.x - input.layerBefore.x),
    dy: round3(input.workspaceAfterFit.y - input.layerBefore.y),
  };

  console.groupCollapsed(
    `[DragSnap] pointer · layer=${input.layerId} · others=${input.snapOptions.otherElements.length}`,
  );

  console.table({
    clientX: input.clientX,
    clientY: input.clientY,
    deltaPx: round3(input.deltaPx),
    deltaPy: round3(input.deltaPy),
  });

  console.table({
    designerBeforeSnap_x: round3(designerTrace.before.x),
    designerBeforeSnap_y: round3(designerTrace.before.y),
    designerAfterGrid_x: round3(designerTrace.afterGrid.x),
    designerAfterGrid_y: round3(designerTrace.afterGrid.y),
    designerAfterElement_x: round3(designerTrace.afterElement.x),
    designerAfterElement_y: round3(designerTrace.afterElement.y),
    designerAfterCenter_x: round3(designerTrace.afterCenter.x),
    designerAfterCenter_y: round3(designerTrace.afterCenter.y),
  });

  console.table({
    workspaceBeforeSnap_x: round3(input.workspaceBeforeSnap.x),
    workspaceBeforeSnap_y: round3(input.workspaceBeforeSnap.y),
    workspaceAfterDesignerSnap_x: round3(input.workspaceAfterDesignerSnap.x),
    workspaceAfterDesignerSnap_y: round3(input.workspaceAfterDesignerSnap.y),
    workspaceAfterWorkspaceSnap_x: round3(workspaceTrace.afterCenter.x),
    workspaceAfterWorkspaceSnap_y: round3(workspaceTrace.afterCenter.y),
    workspaceFinal_x: round3(input.workspaceAfterFit.x),
    workspaceFinal_y: round3(input.workspaceAfterFit.y),
  });

  console.table({
    gridSnapped: designerTrace.gridSnappedX || designerTrace.gridSnappedY,
    elementSnapped:
      designerTrace.elementSnappedX || designerTrace.elementSnappedY,
    centerSnapped:
      designerTrace.centerSnappedX || designerTrace.centerSnappedY,
    workspaceSnapped:
      workspaceTrace.elementSnappedX ||
      workspaceTrace.elementSnappedY ||
      workspaceTrace.gridSnappedX ||
      workspaceTrace.gridSnappedY ||
      workspaceTrace.centerSnappedX ||
      workspaceTrace.centerSnappedY,
    committed: input.committed,
  });

  console.table({
    GRID_SIZE_CM,
    GRID_SNAP_THRESHOLD_CM,
    ELEMENT_SNAP_THRESHOLD_CM_fallback: ELEMENT_SNAP_THRESHOLD_CM,
    elementSnapDistance_ui: input.elementSnapDistanceUi,
    elementSnapThreshold_runtime_cm: round3(input.elementSnapThresholdCm),
    designerElementThreshold: round3(
      designerTrace.thresholds.elementThreshold,
    ),
    workspaceElementThreshold: round3(
      workspaceTrace.thresholds.elementThreshold,
    ),
    centerThreshold: SNAP_THRESHOLD_CM,
    POSITION_EPSILON: DRAG_SNAP_POSITION_EPSILON,
  });

  if (designerTrace.elementProbe) {
    console.table({
      otherElements_length: designerTrace.elementProbe.otherCount,
      targetIds: designerTrace.elementProbe.targetIds.join(", "),
      bestX_dist: designerTrace.elementProbe.bestX?.dist ?? null,
      bestY_dist: designerTrace.elementProbe.bestY?.dist ?? null,
      bestX_newX: designerTrace.elementProbe.bestX?.newX ?? null,
      bestY_newY: designerTrace.elementProbe.bestY?.newY ?? null,
    });
  } else {
    console.table({
      otherElements_length: input.snapOptions.otherElements.length,
      targetIds:
        input.snapOptions.otherElements.map((t) => t.id).join(", ") || "(none)",
      bestX_dist: null,
      bestY_dist: null,
    });
  }

  console.table({
    layerBefore_x: round3(input.layerBefore.x),
    layerBefore_y: round3(input.layerBefore.y),
    layerAfter_x: round3(input.workspaceAfterFit.x),
    layerAfter_y: round3(input.workspaceAfterFit.y),
    actual_dx: actualDelta.dx,
    actual_dy: actualDelta.dy,
  });

  console.groupEnd();

  performance.mark(`${markStart}-end`);
  performance.measure(
    `drag-snap-pointer:${input.layerId}`,
    `${markStart}-start`,
    `${markStart}-end`,
  );
}

export function logRafDragDiagnostic(input: RafDragDiagnosticInput): void {
  if (!isDragSnapDiagnosticEnabled()) return;

  const markStart = `drag-snap-raf-${input.layerId}`;
  performance.mark(`${markStart}-start`);

  const scale =
    input.layer.type === "image" || input.layer.type === "shape"
      ? input.layer.scale
      : 1;

  const patchX = input.patch.x_cm ?? input.layerBefore.x;
  const patchY = input.patch.y_cm ?? input.layerBefore.y;

  const workspaceTrace = traceDragSnapSteps(
    patchX,
    patchY,
    input.layer.width_cm,
    input.layer.height_cm,
    scale,
    input.workspacePrintArea,
    {
      gridSnap: input.gridSnapEnabled,
      elementSnap: true,
      elementSnapThreshold: input.elementSnapThresholdCm,
      otherElements: input.otherElements,
    },
    "workspace",
  );

  console.groupCollapsed(
    `[DragSnap] RAF · layer=${input.layerId} · others=${input.otherElements.length}`,
  );

  console.table({
    patch_x: round3(patchX),
    patch_y: round3(patchY),
    workspacePatch_x: input.workspacePatch.x_cm ?? null,
    workspacePatch_y: input.workspacePatch.y_cm ?? null,
  });

  console.table({
    workspaceBeforeSnap_x: round3(patchX),
    workspaceBeforeSnap_y: round3(patchY),
    workspaceAfterWorkspaceSnap_x: round3(workspaceTrace.afterCenter.x),
    workspaceAfterWorkspaceSnap_y: round3(workspaceTrace.afterCenter.y),
    layerAfter_x: round3(input.layerAfter.x),
    layerAfter_y: round3(input.layerAfter.y),
  });

  console.table({
    gridSnapped:
      workspaceTrace.gridSnappedX || workspaceTrace.gridSnappedY,
    elementSnapped:
      workspaceTrace.elementSnappedX || workspaceTrace.elementSnappedY,
    centerSnapped:
      workspaceTrace.centerSnappedX || workspaceTrace.centerSnappedY,
  });

  if (workspaceTrace.elementProbe) {
    console.table({
      otherElements_length: workspaceTrace.elementProbe.otherCount,
      bestX_dist: workspaceTrace.elementProbe.bestX?.dist ?? null,
      bestY_dist: workspaceTrace.elementProbe.bestY?.dist ?? null,
    });
  }

  console.table({
    layerBefore_x: round3(input.layerBefore.x),
    layerBefore_y: round3(input.layerBefore.y),
    layerAfter_x: round3(input.layerAfter.x),
    layerAfter_y: round3(input.layerAfter.y),
    actual_dx: round3(input.layerAfter.x - input.layerBefore.x),
    actual_dy: round3(input.layerAfter.y - input.layerBefore.y),
  });

  console.groupEnd();

  performance.mark(`${markStart}-end`);
  performance.measure(
    `drag-snap-raf:${input.layerId}`,
    `${markStart}-start`,
    `${markStart}-end`,
  );
}
