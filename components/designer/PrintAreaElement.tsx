"use client";

import { useCallback, useRef } from "react";
import { PRINT_AREA } from "@/lib/constants";
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

export function PrintAreaElement({
  x,
  y,
  width,
  height,
  scale,
  rotation,
  isActive,
  locked,
  gridSnapEnabled,
  elementSnapEnabled,
  elementSnapDistance,
  otherElements,
  onSelect,
  onTransformChange,
  onSnapGuidesChange,
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
  locked: boolean;
  gridSnapEnabled: boolean;
  elementSnapEnabled: boolean;
  elementSnapDistance: number;
  otherElements: SnapTarget[];
  onSelect: (shiftKey: boolean) => void;
  onTransformChange: (next: { x: number; y: number }) => void;
  onSnapGuidesChange: (guides: SnapGuidesState) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
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
        const snap = applyDragSnap(px, py, width, height, scale, {
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
    const printArea = event.currentTarget.closest("[data-print-area]");
    if (!printArea) return;

    const printRect = printArea.getBoundingClientRect();
    const scaleX = PRINT_AREA.width / printRect.width;
    const scaleY = PRINT_AREA.height / printRect.height;

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

  return (
    <div
      className={`absolute ${locked ? "cursor-default" : "touch-none cursor-move"} ${className} ${
        isActive ? "ring-2 ring-blue-400 ring-offset-1" : ""
      } ${locked ? "opacity-90" : ""}`}
      style={{
        left: `${(x / PRINT_AREA.width) * 100}%`,
        top: `${(y / PRINT_AREA.height) * 100}%`,
        width: `${(scaled.width / PRINT_AREA.width) * 100}%`,
        height: `${(scaled.height / PRINT_AREA.height) * 100}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}
