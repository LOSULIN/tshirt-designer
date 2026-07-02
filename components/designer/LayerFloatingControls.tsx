"use client";

import { useCallback, useMemo, useRef } from "react";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import type { DesignerCssPercentStyle } from "@/lib/designer-coordinate-facade";
import {
  applyDesignerFloatingMove,
  clientPixelDeltaToDesignerCm,
  createDesignerFloatingControlContext,
  createDesignerFloatingDragState,
  inferSideFromWorkspacePrintArea,
  projectDesignerFloatingResultToWorkspace,
  type DesignerFloatingDragState,
} from "@/lib/designer-coordinate-controller";
import { useLiveDesignState } from "./LiveDesignStateContext";

function normalizeRotation(degrees: number) {
  let next = degrees;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return next;
}

/** 浮動於印刷區外層：縮放、拖曳、旋轉、刪除 */
export function LayerFloatingControls({
  printArea,
  x,
  y,
  width,
  height,
  rotation,
  onMove,
  onScaleDown,
  onScaleUp,
  onRotationChange,
  onRotateLeft90,
  onRotateRight90,
  onDelete,
  displayPercentStyle,
}: {
  printArea: PrintAreaCmBounds;
  /** Step 13.0D：Display Layer 定位 */
  displayPercentStyle?: DesignerCssPercentStyle;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  onMove: (next: { x_cm: number; y_cm: number }) => void;
  onScaleDown?: () => void;
  onScaleUp?: () => void;
  onRotationChange?: (rotation: number) => void;
  onRotateLeft90?: () => void;
  onRotateRight90?: () => void;
  onDelete?: () => void;
}) {
  const { designState } = useLiveDesignState();
  const floatingContext = useMemo(
    () =>
      createDesignerFloatingControlContext(
        inferSideFromWorkspacePrintArea(printArea),
        designState.garment.size,
      ),
    [printArea, designState.garment.size],
  );

  const moveRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    drag: DesignerFloatingDragState;
  } | null>(null);
  const rotateRef = useRef<{
    originRotation: number;
    startAngle: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const getPrintAreaRect = useCallback(() => {
    const container = anchorRef.current?.closest("[data-shirt-container]");
    const printAreaEl = container?.querySelector("[data-print-area]");
    return printAreaEl?.getBoundingClientRect() ?? null;
  }, []);

  const onMovePointerDown = (event: React.PointerEvent) => {
    event.stopPropagation();
    const workspaceOrigin = { x_cm: x, y_cm: y };
    moveRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
      drag: createDesignerFloatingDragState(workspaceOrigin, floatingContext),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onMovePointerMove = (event: React.PointerEvent) => {
    if (!moveRef.current) return;
    const printRect = getPrintAreaRect();
    if (!printRect) return;

    const deltaDesigner = clientPixelDeltaToDesignerCm(
      event.clientX - moveRef.current.startX,
      event.clientY - moveRef.current.startY,
      printRect,
      floatingContext,
    );
    const patch = applyDesignerFloatingMove(
      floatingContext,
      moveRef.current.drag,
      deltaDesigner,
    );
    onMove(
      projectDesignerFloatingResultToWorkspace(
        { x_cm: moveRef.current.originX, y_cm: moveRef.current.originY },
        patch,
      ),
    );
  };

  const onMovePointerUp = (event: React.PointerEvent) => {
    moveRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onRotatePointerDown = (event: React.PointerEvent) => {
    if (!onRotationChange) return;
    event.stopPropagation();
    const root = anchorRef.current;
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

  const anchorStyle =
    displayPercentStyle ??
    ({
      left: `${(x / printArea.width) * 100}%`,
      top: `${(y / printArea.height) * 100}%`,
      width: `${(width / printArea.width) * 100}%`,
      height: `${(height / printArea.height) * 100}%`,
    } satisfies DesignerCssPercentStyle);

  return (
    <div
      ref={anchorRef}
      className="pointer-events-none absolute"
      style={anchorStyle}
    >
      <div
        className="pointer-events-auto absolute top-full left-1/2 z-50 mt-1.5 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-lg"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onScaleDown && (
          <button
            type="button"
            title="縮小"
            aria-label="縮小"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            onClick={(e) => {
              e.stopPropagation();
              onScaleDown();
            }}
          >
            −
          </button>
        )}
        {onScaleUp && (
          <button
            type="button"
            title="放大"
            aria-label="放大"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            onClick={(e) => {
              e.stopPropagation();
              onScaleUp();
            }}
          >
            +
          </button>
        )}
        <button
          type="button"
          title="拖曳移動"
          aria-label="拖曳移動"
          className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-md text-sm text-blue-700 hover:bg-blue-50 active:cursor-grabbing"
          onPointerDown={onMovePointerDown}
          onPointerMove={onMovePointerMove}
          onPointerUp={onMovePointerUp}
          onPointerCancel={onMovePointerUp}
        >
          ⋮⋮
        </button>
        {onRotateLeft90 && (
          <button
            type="button"
            title="左轉 90°"
            aria-label="左轉 90 度"
            className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none text-zinc-700 hover:bg-zinc-100"
            onClick={(e) => {
              e.stopPropagation();
              onRotateLeft90();
            }}
          >
            ⟲
          </button>
        )}
        {onRotateRight90 && (
          <button
            type="button"
            title="右轉 90°"
            aria-label="右轉 90 度"
            className="flex h-7 w-7 items-center justify-center rounded-md text-base leading-none text-zinc-700 hover:bg-zinc-100"
            onClick={(e) => {
              e.stopPropagation();
              onRotateRight90();
            }}
          >
            ⟳
          </button>
        )}
        {onRotationChange && (
          <button
            type="button"
            title="拖曳旋轉"
            aria-label="拖曳旋轉"
            className="flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-md text-sm text-blue-600 hover:bg-blue-50 active:cursor-grabbing"
            onPointerDown={onRotatePointerDown}
            onPointerMove={onRotatePointerMove}
            onPointerUp={onRotatePointerUp}
            onPointerCancel={onRotatePointerUp}
          >
            ↻
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            title="刪除"
            aria-label="刪除圖層"
            className="flex h-7 w-7 items-center justify-center rounded-md text-sm text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
