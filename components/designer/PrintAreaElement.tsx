"use client";

import { useCallback, useRef } from "react";
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
  DesignerCssPercentStyle,
} from "@/lib/designer-coordinate-facade";
import { toCssPercent } from "@/lib/coordinate-runtime";
import type { GarmentConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
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

const POSITION_EPSILON = 0.25;

export interface SnapGuidesState {
  printCenterX: boolean;
  printCenterY: boolean;
  elementVertical: number[];
  elementHorizontal: number[];
}

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

export function PrintAreaElement({
  layer,
  designerPointerContext,
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
  otherElements,
  onSelect,
  onTransformChange,
  onResizeChange,
  onDoubleClick,
  onSnapGuidesChange,
  printArea,
  maxResizeWidth_cm,
  maxResizeHeight_cm,
  hasPrintAreaOverflow = false,
  constraintWarningLabel = null,
  constraintBadge = null,
  displayPercentStyle,
  children,
  className = "",
}: {
  /** Step 13.0F：Drag 經 Controller 寫入 Storage */
  layer: DesignLayer;
  designerPointerContext: DesignerCoordinateContext;
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
  otherElements: SnapTarget[];
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
  printArea: PrintAreaCmBounds;
  /** 點陣圖最大印刷寬（cm）；省略則不限制 */
  maxResizeWidth_cm?: number;
  /** 點陣圖最大印刷高（cm）；省略則不限制 */
  maxResizeHeight_cm?: number;
  /** 超出 Blue Print Area — 僅 UI 警示，不修改 layer */
  hasPrintAreaOverflow?: boolean;
  /** Current Garment Constraint 圖層警告文案 */
  constraintWarningLabel?: string | null;
  /** Step 12.9D：圖層 badge 等級與 tooltip */
  constraintBadge?: GarmentConstraintBadgeMeta | null;
  /** Step 13.0D：Display Layer CSS %（Drag 使用 Designer Pointer + Controller） */
  displayPercentStyle?: DesignerCssPercentStyle;
  children: React.ReactNode;
  className?: string;
}) {
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
  const otherElementsRef = useRef(otherElements);
  gridSnapRef.current = gridSnapEnabled;
  elementSnapRef.current = elementSnapEnabled;
  elementSnapDistanceRef.current = elementSnapDistance;
  otherElementsRef.current = otherElements;

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
      onSnapGuidesChange(guides);
    },
    [onSnapGuidesChange],
  );

  const layerRef = useRef(layer);
  const designerPointerContextRef = useRef(designerPointerContext);
  layerRef.current = layer;
  designerPointerContextRef.current = designerPointerContext;

  const applyWorkspacePosition = useCallback(
    (designerX: number, designerY: number, useSnap: boolean) => {
      let wsX = designerX;
      let wsY = designerY;

      if (useSnap) {
        const snap = applyDesignerDragSnap(
          layerRef.current,
          { x_cm: designerX, y_cm: designerY },
          designerPointerContextRef.current,
          {
            gridSnap: gridSnapRef.current,
            elementSnap: elementSnapRef.current,
            elementSnapThresholdCm: elementSnapDistanceRef.current,
            otherElements: otherElementsRef.current,
          },
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
        onTransformChange(fitted);
      }
    },
    [
      width,
      height,
      scale,
      rotation,
      x,
      y,
      onTransformChange,
      emitGuides,
      printArea,
    ],
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

    applyWorkspacePosition(designerX, designerY, true);
  };

  const onPointerUp = (event: React.PointerEvent) => {
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
      onPointerCancel={onPointerUp}
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
