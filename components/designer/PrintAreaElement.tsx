"use client";

import { useCallback, useRef } from "react";
import type { PrintAreaBounds } from "@/lib/print-area";
import { guidesEqual, type SnapTarget } from "@/lib/element-snap";
import {
  applyDragSnap,
  clampPositionToPrintArea,
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

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return next;
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
  gridSnapEnabled,
  elementSnapEnabled,
  elementSnapDistance,
  otherElements,
  onSelect,
  onTransformChange,
  onRotationChange,
  onDuplicate,
  onDelete,
  onSnapGuidesChange,
  printArea,
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
  gridSnapEnabled: boolean;
  elementSnapEnabled: boolean;
  elementSnapDistance: number;
  otherElements: SnapTarget[];
  onSelect: (shiftKey: boolean) => void;
  onTransformChange: (next: { x: number; y: number }) => void;
  onRotationChange?: (rotation: number) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSnapGuidesChange: (guides: SnapGuidesState) => void;
  printArea: PrintAreaBounds;
  children: React.ReactNode;
  className?: string;
}) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const rotateRef = useRef<{
    originRotation: number;
    startAngle: number;
    centerX: number;
    centerY: number;
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

      const clamped = clampPositionToPrintArea(
        px,
        py,
        width,
        height,
        scale,
        rotation,
        printArea,
      );

      if (
        Math.abs(clamped.x - x) > POSITION_EPSILON ||
        Math.abs(clamped.y - y) > POSITION_EPSILON
      ) {
        onTransformChange(clamped);
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

  const onPointerDown = (event: React.PointerEvent) => {
    if (locked) return;
    event.stopPropagation();
    onSelect(event.shiftKey);
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
    if (!dragRef.current) return;
    const printAreaEl = event.currentTarget.closest("[data-print-area]");
    if (!printAreaEl) return;

    const printRect = printAreaEl.getBoundingClientRect();
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

  const onPointerUp = () => {
    dragRef.current = null;
    emitGuides(EMPTY_GUIDES);
  };

  const onRotatePointerDown = (event: React.PointerEvent) => {
    if (!onRotationChange) return;
    event.stopPropagation();
    const root = event.currentTarget.closest("[data-layer-root]");
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    rotateRef.current = {
      originRotation: rotation,
      startAngle:
        (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) /
        Math.PI,
      centerX,
      centerY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onRotatePointerMove = (event: React.PointerEvent) => {
    if (!rotateRef.current || !onRotationChange) return;
    const { originRotation, startAngle, centerX, centerY } = rotateRef.current;
    const currentAngle =
      (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) /
      Math.PI;
    onRotationChange(normalizeRotation(originRotation + currentAngle - startAngle));
  };

  const onRotatePointerUp = (event: React.PointerEvent) => {
    rotateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const stopControlEvent = (event: React.PointerEvent | React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      data-layer-root
      className={`absolute ${locked ? "cursor-default" : "touch-none cursor-move"} ${className} ${
        isActive && !showControls ? "ring-2 ring-blue-400 ring-offset-1" : ""
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
    >
      <div
        className="relative flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        {showControls && (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 border-2 border-dashed border-blue-500" />
            {(
              [
                "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
                "right-0 top-0 translate-x-1/2 -translate-y-1/2",
                "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
                "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
              ] as const
            ).map((position) => (
              <span
                key={position}
                className={`absolute h-2.5 w-2.5 rounded-sm border-2 border-blue-500 bg-white ${position}`}
              />
            ))}
          </div>
        )}

        {children}

        {showControls && onRotationChange && (
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-full flex-col items-center">
            <button
              type="button"
              title="拖曳旋轉"
              aria-label="拖曳旋轉"
              className="pointer-events-auto flex h-5 w-5 cursor-grab touch-none items-center justify-center rounded-full border-2 border-blue-500 bg-white text-[10px] text-blue-600 shadow-sm active:cursor-grabbing"
              onPointerDown={onRotatePointerDown}
              onPointerMove={onRotatePointerMove}
              onPointerUp={onRotatePointerUp}
              onPointerCancel={onRotatePointerUp}
            >
              ↻
            </button>
            <span className="h-4 w-px bg-blue-500" />
          </div>
        )}
      </div>

      {showControls && (onDuplicate || onDelete) && (
        <div
          className="absolute top-0 left-full z-30 ml-2 flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg"
          onPointerDown={stopControlEvent}
        >
          {onDuplicate && (
            <button
              type="button"
              title="複製"
              aria-label="複製圖層"
              className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-zinc-700 hover:bg-zinc-100"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
            >
              ⧉
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="刪除"
              aria-label="刪除圖層"
              className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-zinc-700 hover:bg-red-50 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              🗑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
