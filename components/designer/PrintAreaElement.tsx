"use client";

import { useCallback, useRef } from "react";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import {
  clientPointToPrintCm,
  computeHandleResizeCm,
  getResizeHandleCursor,
  type ResizeEdge,
  type ResizeHandle,
} from "@/lib/direct-manipulation";
import { guidesEqual, type SnapTarget } from "@/lib/element-snap";
import {
  applyDragSnap,
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

function ResizeHandleGrip({ handle }: { handle: ResizeHandle }) {
  if (isResizeEdge(handle)) {
    const vertical = handle === "n" || handle === "s";
    return (
      <span
        className={`block rounded-full border-2 border-blue-500 bg-white shadow-sm ${
          vertical ? "h-1.5 w-7" : "h-7 w-1.5"
        }`}
      />
    );
  }
  return (
    <span className="block h-4 w-4 rounded-sm border-2 border-blue-500 bg-white shadow-sm" />
  );
}

export function PrintAreaElement({
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
  children,
  className = "",
}: {
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
  children: React.ReactNode;
  className?: string;
}) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeRef = useRef<{
    handle: ResizeHandle;
    originX: number;
    originY: number;
    originWidth: number;
    originHeight: number;
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

  const applyPosition = useCallback(
    (nextX: number, nextY: number, useSnap: boolean) => {
      let px = nextX;
      let py = nextY;

      if (useSnap) {
        const snap = applyDragSnap(px, py, width, height, scale, printArea, {
          gridSnap: gridSnapRef.current,
          elementSnap: elementSnapRef.current,
          elementSnapThreshold: elementSnapDistanceRef.current,
          otherElements: otherElementsRef.current,
        });
        px = snap.x;
        py = snap.y;
        emitGuides({
          printCenterX: snap.printCenterSnapX,
          printCenterY: snap.printCenterSnapY,
          elementVertical: snap.elementGuides.vertical,
          elementHorizontal: snap.elementGuides.horizontal,
        });
      }

      const fitted = fitLayerTransform(
        px,
        py,
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
      originX: x,
      originY: y,
    };
    lastGuidesRef.current = EMPTY_GUIDES;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (resizeRef.current) return;
    if (!dragRef.current) return;
    const printRect = getPrintAreaRect(event.currentTarget);
    if (!printRect) return;

    const scaleX = printArea.width / printRect.width;
    const scaleY = printArea.height / printRect.height;

    const dx = (event.clientX - dragRef.current.startX) * scaleX;
    const dy = (event.clientY - dragRef.current.startY) * scaleY;

    applyPosition(
      dragRef.current.originX + dx,
      dragRef.current.originY + dy,
      true,
    );
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
        originX: x,
        originY: y,
        originWidth: scaled.width,
        originHeight: scaled.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    };

  const onResizePointerMove = (event: React.PointerEvent) => {
    if (!resizeRef.current || !onResizeChange) return;
    const printRect = getPrintAreaRect(event.currentTarget);
    if (!printRect) return;

    const pointer = clientPointToPrintCm(
      event.clientX,
      event.clientY,
      printRect,
      printArea.width,
      printArea.height,
    );

    const next = computeHandleResizeCm({
      handle: resizeRef.current.handle,
      pointerX: pointer.x,
      pointerY: pointer.y,
      originX: resizeRef.current.originX,
      originY: resizeRef.current.originY,
      originWidth: resizeRef.current.originWidth,
      originHeight: resizeRef.current.originHeight,
      rotation,
      lockAspect: !isResizeEdge(resizeRef.current.handle),
      maxWidth_cm: maxResizeWidth_cm,
      maxHeight_cm: maxResizeHeight_cm,
    });

    onResizeChange(next);
  };

  const onResizePointerUp = (event: React.PointerEvent) => {
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      data-layer-root
      className={`absolute ${locked ? "cursor-default" : isEditing ? "cursor-text" : "touch-none cursor-move"} ${className} ${
        isActive ? "ring-2 ring-blue-400 ring-offset-1" : ""
      } ${locked ? "opacity-90" : ""}`}
      style={{
        left: `${(x / printArea.width) * 100}%`,
        top: `${(y / printArea.height) * 100}%`,
        width: `${(scaled.width / printArea.width) * 100}%`,
        height: `${(scaled.height / printArea.height) * 100}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
    >
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
            <div className="absolute inset-0 border-2 border-dashed border-blue-500" />
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
                  <ResizeHandleGrip handle={handle} />
                </button>
              ))}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
