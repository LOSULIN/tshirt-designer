"use client";

import { memo, useCallback, useRef } from "react";
import { getDesignerSnapTargetsForLayer } from "@/lib/designer/snap-target-cache";
import { arePrintAreaElementPropsEqual } from "@/lib/designer/print-area-element-memo";
import type {
  PrintAreaElementProps,
  SnapGuidesState,
} from "@/lib/designer/print-area-element-memo";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import {
  applyDesignerDragSnap,
  clientPixelDeltaToDesignerCm,
  clientPointToDesignerCm,
  createDesignerPointerDragState,
  createDesignerPointerResizeState,
  projectWorkspaceMaxResizeToDesigner,
  resolveDesignerHandleResizeWorkspacePatch,
  setLayerDesignerPosition,
  type DesignerPointerDragState,
  type DesignerPointerResizeState,
} from "@/lib/designer-coordinate-controller";
import type {
  DesignerCoordinateContext,
} from "@/lib/designer-coordinate-facade";
import { toCssPercent } from "@/lib/coordinate-runtime";
import { GarmentConstraintLayerWarning } from "./GarmentConstraintLayerWarning";
import type { DesignLayer } from "@/lib/types";
import {
  computeHandleResizeCm,
  getResizeHandleCursor,
  type ResizeEdge,
  type ResizeHandle,
} from "@/lib/direct-manipulation";
import { guidesEqual, type SnapTarget } from "@/lib/element-snap";
import {
  fitLayerTransform,
  getScaledSize,
} from "@/lib/geometry";
import {
  logPointerDragDiagnostic,
  projectDesignerSnapTargetsToWorkspace,
} from "@/lib/designer/drag-snap-diagnostic";
import { uiElementSnapDistanceToWorkspaceCm } from "@/lib/designer/element-snap-threshold";

const POSITION_EPSILON = 0.25;

export type { SnapGuidesState } from "@/lib/designer/print-area-element-memo";

const EMPTY_GUIDES: SnapGuidesState = {
  printCenterX: false,
  printCenterY: false,
  elementVertical: [],
  elementHorizontal: [],
};

const HANDLE_POSITIONS: Record<ResizeHandle, string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2",
  sw: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
  se: "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  s: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
};

const CORNER_HANDLES: ResizeHandle[] = ["nw", "ne", "se", "sw"];
const ALL_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/** 小於此尺寸僅顯示四角把手，避免把手重疊 */
const COMPACT_SIZE_CM = 9;

function isResizeEdge(handle: ResizeHandle): handle is ResizeEdge {
  return handle === "n" || handle === "e" || handle === "s" || handle === "w";
}

function ResizeHandleGrip({
  handle,
  isOverflow,
}: {
  handle: ResizeHandle;
  isOverflow?: boolean;
}) {
  const borderClass = isOverflow ? "border-red-500" : "border-zinc-900";
  if (isResizeEdge(handle)) {
    const vertical = handle === "n" || handle === "s";
    return (
      <span
        className={`block rounded-full border-2 bg-white shadow-sm ${borderClass} ${
          vertical ? "h-1.5 w-7" : "h-7 w-1.5"
        }`}
      />
    );
  }
  return (
    <span
      className={`block h-4 w-4 rounded-sm border-2 bg-white shadow-sm ${borderClass}`}
    />
  );
}

export type { PrintAreaElementProps } from "@/lib/designer/print-area-element-memo";

function PrintAreaElementInner({
  layer,
  layerId,
  designerPointerContext,
  designerSnapTargetCacheRef,
  x,
  y,
  width,
  height,
  scale,
  rotation,
  isActive,
  showControls,
  locked,
  isEditing,
  gridSnapEnabled,
  elementSnapEnabled,
  elementSnapDistance,
  onSelect,
  onTransformChange,
  onResizeChange,
  onDoubleClick,
  onSnapGuidesChange,
  onDragTransformFlush,
  onDragTransformCancel,
  printArea,
  maxResizeWidth_cm,
  maxResizeHeight_cm,
  hasPrintAreaOverflow = false,
  constraintWarningLabel = null,
  constraintBadge = null,
  displayPercentStyle,
  children,
  className = "",
}: PrintAreaElementProps) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    designerDrag: DesignerPointerDragState;
  } | null>(null);
  const resizeRef = useRef<{
    handle: ResizeHandle;
    designerResize: DesignerPointerResizeState;
  } | null>(null);
  const lastGuidesRef = useRef<SnapGuidesState>(EMPTY_GUIDES);
  const gridSnapRef = useRef(gridSnapEnabled);
  const elementSnapRef = useRef(elementSnapEnabled);
  const elementSnapDistanceRef = useRef(elementSnapDistance);
  const otherElementsRef = useRef<SnapTarget[]>([]);
  const pointerDiagRef = useRef<{
    clientX: number;
    clientY: number;
    deltaPx: number;
    deltaPy: number;
  } | null>(null);
  const onTransformChangeRef = useRef(onTransformChange);
  const onSnapGuidesChangeRef = useRef(onSnapGuidesChange);
  gridSnapRef.current = gridSnapEnabled;
  elementSnapRef.current = elementSnapEnabled;
  elementSnapDistanceRef.current = elementSnapDistance;
  onTransformChangeRef.current = onTransformChange;
  onSnapGuidesChangeRef.current = onSnapGuidesChange;

  const refreshOtherElementsRef = useCallback(() => {
    const cache = designerSnapTargetCacheRef.current;
    if (!cache) return;
    otherElementsRef.current = getDesignerSnapTargetsForLayer(cache, layerId);
  }, [designerSnapTargetCacheRef, layerId]);

  const scaled = getScaledSize(width, height, scale);
  const isCompact =
    scaled.width < COMPACT_SIZE_CM || scaled.height < COMPACT_SIZE_CM;
  const activeHandles = isCompact ? CORNER_HANDLES : ALL_HANDLES;

  const emitGuides = useCallback(
    (guides: SnapGuidesState) => {
      const prev = lastGuidesRef.current;
      if (
        prev.printCenterX === guides.printCenterX &&
        prev.printCenterY === guides.printCenterY &&
        guidesEqual(prev.elementVertical, guides.elementVertical) &&
        guidesEqual(prev.elementHorizontal, guides.elementHorizontal)
      ) {
        return;
      }
      lastGuidesRef.current = guides;
      onSnapGuidesChangeRef.current(guides);
    },
    [],
  );

  const layerRef = useRef(layer);
  const designerPointerContextRef = useRef(designerPointerContext);
  layerRef.current = layer;
  designerPointerContextRef.current = designerPointerContext;

  const applyWorkspacePosition = useCallback(
    (designerX: number, designerY: number, useSnap: boolean) => {
      let wsX = designerX;
      let wsY = designerY;
      const layerBefore = { x, y };

      if (useSnap) {
        const snapOptions = {
          gridSnap: gridSnapRef.current,
          elementSnap: elementSnapRef.current,
          elementSnapThresholdCm: uiElementSnapDistanceToWorkspaceCm(
            elementSnapDistanceRef.current,
          ),
          otherElements: otherElementsRef.current,
        };
        const unsnappedPatch = setLayerDesignerPosition(
          layerRef.current,
          designerPointerContextRef.current,
          { x_cm: designerX, y_cm: designerY },
        );
        const workspaceBeforeSnap = {
          x: unsnappedPatch.x_cm ?? x,
          y: unsnappedPatch.y_cm ?? y,
        };

        const snap = applyDesignerDragSnap(
          layerRef.current,
          { x_cm: designerX, y_cm: designerY },
          designerPointerContextRef.current,
          snapOptions,
        );
        if (
          snap.workspacePatch.x_cm === undefined ||
          snap.workspacePatch.y_cm === undefined
        ) {
          return;
        }
        wsX = snap.workspacePatch.x_cm;
        wsY = snap.workspacePatch.y_cm;
        emitGuides({
          printCenterX: snap.guides.printCenterX,
          printCenterY: snap.guides.printCenterY,
          elementVertical: snap.guides.elementVertical,
          elementHorizontal: snap.guides.elementHorizontal,
        });

        const fitted = fitLayerTransform(
          wsX,
          wsY,
          width,
          height,
          scale,
          rotation,
          printArea,
        );

        const committed =
          Math.abs(fitted.x - x) > POSITION_EPSILON ||
          Math.abs(fitted.y - y) > POSITION_EPSILON ||
          Math.abs(fitted.scale - scale) > POSITION_EPSILON;

        if (process.env.NODE_ENV === "development") {
          const pointerDiag = pointerDiagRef.current;
          if (pointerDiag) {
            logPointerDragDiagnostic({
              phase: "pointer",
              layerId,
              clientX: pointerDiag.clientX,
              clientY: pointerDiag.clientY,
              deltaPx: pointerDiag.deltaPx,
              deltaPy: pointerDiag.deltaPy,
              designerX,
              designerY,
              layer: layerRef.current,
              ctx: designerPointerContextRef.current,
              printArea,
              snapOptions,
              workspaceBeforeSnap,
              workspaceAfterDesignerSnap: { x: wsX, y: wsY },
              workspaceAfterFit: { x: fitted.x, y: fitted.y },
              layerBefore,
              elementSnapDistanceUi: elementSnapDistanceRef.current,
              elementSnapThresholdCm: uiElementSnapDistanceToWorkspaceCm(
                elementSnapDistanceRef.current,
              ),
              workspaceOtherElements: projectDesignerSnapTargetsToWorkspace(
                otherElementsRef.current,
                designerPointerContextRef.current,
              ),
              committed,
            });
          }
        }

        if (committed) {
          onTransformChangeRef.current(fitted);
        }
        return;
      } else {
        const patch = setLayerDesignerPosition(
          layerRef.current,
          designerPointerContextRef.current,
          { x_cm: designerX, y_cm: designerY },
        );
        if (patch.x_cm !== undefined && patch.y_cm !== undefined) {
          wsX = patch.x_cm;
          wsY = patch.y_cm;
        }
      }

      const fitted = fitLayerTransform(
        wsX,
        wsY,
        width,
        height,
        scale,
        rotation,
        printArea,
      );

      if (
        Math.abs(fitted.x - x) > POSITION_EPSILON ||
        Math.abs(fitted.y - y) > POSITION_EPSILON ||
        Math.abs(fitted.scale - scale) > POSITION_EPSILON
      ) {
        onTransformChangeRef.current(fitted);
      }
    },
    [width, height, scale, rotation, x, y, emitGuides, printArea, layerId],
  );

  const getPrintAreaRect = (target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest("[data-print-area]");
    return el?.getBoundingClientRect() ?? null;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (locked || isEditing) return;
    event.stopPropagation();
    onSelect(event.shiftKey);
    if (showControls) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    refreshOtherElementsRef();
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      designerDrag: createDesignerPointerDragState(
        layer,
        designerPointerContext,
      ),
    };
    lastGuidesRef.current = EMPTY_GUIDES;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (resizeRef.current) return;
    if (!dragRef.current) return;
    refreshOtherElementsRef();
    const printRect = getPrintAreaRect(event.currentTarget);
    if (!printRect) return;

    const deltaXPx = event.clientX - dragRef.current.startX;
    const deltaYPx = event.clientY - dragRef.current.startY;
    const deltaDesigner = clientPixelDeltaToDesignerCm(
      deltaXPx,
      deltaYPx,
      printRect,
      designerPointerContextRef.current,
    );
    const designerX =
      dragRef.current.designerDrag.originDesignerX_cm + deltaDesigner.dx_cm;
    const designerY =
      dragRef.current.designerDrag.originDesignerY_cm + deltaDesigner.dy_cm;

    pointerDiagRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      deltaPx: deltaXPx,
      deltaPy: deltaYPx,
    };
    applyWorkspacePosition(designerX, designerY, true);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (dragRef.current) {
      onDragTransformFlush?.();
    }
    dragRef.current = null;
    resizeRef.current = null;
    emitGuides(EMPTY_GUIDES);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onPointerCancel = (event: React.PointerEvent) => {
    if (dragRef.current) {
      onDragTransformCancel?.();
    }
    dragRef.current = null;
    resizeRef.current = null;
    emitGuides(EMPTY_GUIDES);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onResizePointerDown =
    (handle: ResizeHandle) => (event: React.PointerEvent) => {
      if (!onResizeChange || locked) return;
      event.stopPropagation();
      onSelect(event.shiftKey);
      resizeRef.current = {
        handle,
        designerResize: createDesignerPointerResizeState(
          layer,
          designerPointerContext,
        ),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    };

  const onResizePointerMove = (event: React.PointerEvent) => {
    if (!resizeRef.current || !onResizeChange) return;
    const printRect = getPrintAreaRect(event.currentTarget);
    if (!printRect) return;

    const pointer = clientPointToDesignerCm(
      event.clientX,
      event.clientY,
      printRect,
      designerPointerContextRef.current,
    );
    const designerMax = projectWorkspaceMaxResizeToDesigner(
      maxResizeWidth_cm,
      maxResizeHeight_cm,
      designerPointerContextRef.current,
    );
    const { designerResize } = resizeRef.current;

    const designerRect = computeHandleResizeCm({
      handle: resizeRef.current.handle,
      pointerX: pointer.x_cm,
      pointerY: pointer.y_cm,
      originX: designerResize.originDesignerX_cm,
      originY: designerResize.originDesignerY_cm,
      originWidth: designerResize.originDesignerWidth_cm,
      originHeight: designerResize.originDesignerHeight_cm,
      rotation,
      lockAspect: !isResizeEdge(resizeRef.current.handle),
      maxWidth_cm: designerMax.maxWidth_cm,
      maxHeight_cm: designerMax.maxHeight_cm,
    });

    const workspacePatch = resolveDesignerHandleResizeWorkspacePatch(
      layerRef.current,
      designerPointerContextRef.current,
      {
        x_cm: designerRect.x,
        y_cm: designerRect.y,
        width_cm: designerRect.width,
        height_cm: designerRect.height,
      },
    );

    if (
      workspacePatch.x_cm === undefined ||
      workspacePatch.y_cm === undefined ||
      workspacePatch.width_cm === undefined ||
      workspacePatch.height_cm === undefined
    ) {
      return;
    }

    onResizeChange({
      x: workspacePatch.x_cm,
      y: workspacePatch.y_cm,
      width: workspacePatch.width_cm,
      height: workspacePatch.height_cm,
    });
  };

  const onResizePointerUp = (event: React.PointerEvent) => {
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const ringClass = isActive
    ? hasPrintAreaOverflow
      ? "ring-2 ring-red-500 ring-offset-1"
      : "ring-2 ring-zinc-900/80 ring-offset-1"
    : "";
  const selectionBorderClass = hasPrintAreaOverflow
    ? "border-red-500"
    : "border-zinc-900";

  const percentStyle =
    displayPercentStyle ??
    toCssPercent({
      layerRect: {
        x_cm: x,
        y_cm: y,
        width_cm: scaled.width,
        height_cm: scaled.height,
      },
      printArea,
    });

  return (
    <div
      data-layer-root
      className={`absolute ${locked ? "cursor-default" : isEditing ? "cursor-text" : "touch-none cursor-move"} ${className} ${ringClass} ${locked ? "opacity-90" : ""}`}
      style={percentStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
      {constraintWarningLabel ? (
        <GarmentConstraintLayerWarning
          label={constraintWarningLabel}
          badge={constraintBadge ?? undefined}
        />
      ) : null}
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        {isActive && (
          <div
            className={`absolute inset-0 z-10 ${showControls ? "" : "pointer-events-none"}`}
          >
            <div
              className={`absolute inset-0 border-2 border-dashed transition-colors duration-150 ${selectionBorderClass}`}
            />
            {showControls &&
              activeHandles.map((handle) => (
                <button
                  key={handle}
                  type="button"
                  title="拖曳縮放"
                  aria-label="拖曳縮放"
                  className={`absolute z-20 flex h-9 w-9 touch-none items-center justify-center ${HANDLE_POSITIONS[handle]}`}
                  style={{ cursor: getResizeHandleCursor(handle) }}
                  onPointerDown={onResizePointerDown(handle)}
                  onPointerMove={onResizePointerMove}
                  onPointerUp={onResizePointerUp}
                  onPointerCancel={onResizePointerUp}
                >
                  <ResizeHandleGrip
                    handle={handle}
                    isOverflow={hasPrintAreaOverflow}
                  />
                </button>
              ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export const PrintAreaElement = memo(
  PrintAreaElementInner,
  arePrintAreaElementPropsEqual,
);
