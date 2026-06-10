"use client";

import type { Size } from "@/lib/constants";
import type { DesignLayer } from "@/lib/types";
import { MvpLayerList } from "./MvpLayerList";
import { PreviewInfoPanel } from "./PreviewInfoPanel";

/** 預覽畫布左側空白區 — 整合顯示設計數據與 Layer List */
export function CanvasInfoPanel({
  size,
  layers,
  selectedLayerId,
  isBusy,
  readOnly = false,
  onSelectLayer,
  onMoveLayer,
  onTextPatch,
  onImageTransform,
  onImageResize,
  onRotationChange,
}: {
  size: Size;
  layers: DesignLayer[];
  selectedLayerId: string | null;
  isBusy: boolean;
  readOnly?: boolean;
  onSelectLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down") => void;
  onTextPatch: (
    id: string,
    patch: {
      text?: string;
      fontSize_cm?: number;
      x_cm?: number;
      y_cm?: number;
      rotation?: number;
    },
  ) => void;
  onImageTransform: (
    id: string,
    patch: { x_cm?: number; y_cm?: number; scale?: number; rotation?: number },
  ) => void;
  onImageResize: (
    id: string,
    next: { x_cm: number; y_cm: number; width_cm: number; height_cm: number },
  ) => void;
  onRotationChange: (id: string, rotation: number) => void;
}) {
  return (
    <aside
      className="flex h-full min-h-0 w-44 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white sm:w-52"
      aria-label="設計數據 Info Panel"
    >
      <div className="shrink-0 border-b border-zinc-100 px-2.5 py-2">
        <h3 className="text-xs font-semibold text-zinc-900">Info Panel</h3>
        <p className="mt-0.5 text-[10px] text-zinc-500">Inspector ↔ Canvas（cm）</p>
      </div>

      <PreviewInfoPanel
        size={size}
        layers={layers}
        selectedLayerId={selectedLayerId}
        readOnly={readOnly}
        isBusy={isBusy}
        onTextPatch={onTextPatch}
        onImageTransform={onImageTransform}
        onImageResize={onImageResize}
        onRotationChange={onRotationChange}
        className="min-h-0 flex-1 overflow-y-auto"
      />

      <MvpLayerList
        layers={layers}
        selectedLayerId={selectedLayerId}
        isBusy={isBusy || readOnly}
        onSelect={onSelectLayer}
        onMove={onMoveLayer}
      />
    </aside>
  );
}
