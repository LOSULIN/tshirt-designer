"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CalibrationRect } from "@/lib/render/render-types";
import {
  moveCalibrationRect,
  resizeCalibrationRect,
  type ResizeHandle,
} from "@/lib/render/calibration-rect";

export interface CalibrationRectEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  rect: CalibrationRect;
  onChange: (rect: CalibrationRect) => void;
}

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

type DragMode =
  | { type: "move"; startRect: CalibrationRect; startClientX: number; startClientY: number }
  | {
      type: "resize";
      handle: ResizeHandle;
      startRect: CalibrationRect;
      startClientX: number;
      startClientY: number;
    };

export function CalibrationRectEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  rect,
  onChange,
}: CalibrationRectEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);

  const bounds = useMemo(
    () => ({ width: imageWidth, height: imageHeight }),
    [imageWidth, imageHeight],
  );

  const scale = useMemo(() => {
    const maxH = 640;
    return Math.min(1, maxH / imageHeight);
  }, [imageHeight]);

  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  const toImageDelta = useCallback(
    (clientDx: number, clientDy: number) => ({
      dx: clientDx / scale,
      dy: clientDy / scale,
    }),
    [scale],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragMode) return;
      const { dx, dy } = toImageDelta(
        event.clientX - dragMode.startClientX,
        event.clientY - dragMode.startClientY,
      );
      if (dragMode.type === "move") {
        onChange(moveCalibrationRect(dragMode.startRect, dx, dy, bounds));
        return;
      }
      onChange(
        resizeCalibrationRect(dragMode.startRect, dragMode.handle, dx, dy, bounds),
      );
    },
    [bounds, dragMode, onChange, toImageDelta],
  );

  const endDrag = useCallback((event: React.PointerEvent) => {
    if (
      containerRef.current?.hasPointerCapture(event.pointerId)
    ) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
    setDragMode(null);
  }, []);

  const rectStyle = {
    left: rect.x * scale,
    top: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };

  const onPointerDownMove = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      containerRef.current?.setPointerCapture(event.pointerId);
      setDragMode({
        type: "move",
        startRect: rect,
        startClientX: event.clientX,
        startClientY: event.clientY,
      });
    },
    [rect],
  );

  const onPointerDownResize = useCallback(
    (handle: ResizeHandle) => (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      containerRef.current?.setPointerCapture(event.pointerId);
      setDragMode({
        type: "resize",
        handle,
        startRect: rect,
        startClientX: event.clientX,
        startClientY: event.clientY,
      });
    },
    [rect],
  );

  return (
    <div
      ref={containerRef}
      className="relative inline-block select-none touch-none"
      style={{ width: displayWidth, height: displayHeight }}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      data-calibration-editor
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Garment asset"
        width={displayWidth}
        height={displayHeight}
        className="block h-auto max-w-full rounded-lg border border-zinc-200 bg-white"
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-0">
        <div
          className="pointer-events-auto absolute border-2 border-sky-500 bg-sky-400/15"
          style={rectStyle}
          onPointerDown={onPointerDownMove}
        >
          {HANDLES.map((handle) => (
            <span
              key={handle}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-white bg-sky-600 shadow"
              style={{
                cursor: HANDLE_CURSOR[handle],
                left: handle.includes("w")
                  ? 0
                  : handle.includes("e")
                    ? "100%"
                    : "50%",
                top: handle.includes("n")
                  ? 0
                  : handle.includes("s")
                    ? "100%"
                    : "50%",
              }}
              onPointerDown={onPointerDownResize(handle)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
