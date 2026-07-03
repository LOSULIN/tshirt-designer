"use client";

import { useState } from "react";
import type { DesignLayer } from "@/lib/types";
import type { Side } from "@/lib/constants";
import { ds } from "./design-ui";
import { DesignerTooltip } from "./DesignerTooltip";
import { LayerPanel } from "./LayerPanel";

/** 預覽畫布左側 — Layer Manager（排序、鎖定、隱藏、刪除） */
export function CanvasInfoPanel({
  layers,
  selectedLayerIds,
  isBusy,
  readOnly = false,
  onSelectLayer,
  onRenameLayer,
  onToggleVisible,
  onToggleLocked,
  onMoveLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onReorderDrag,
}: {
  layers: DesignLayer[];
  selectedLayerIds: string[];
  isBusy: boolean;
  readOnly?: boolean;
  onSelectLayer: (id: string, shiftKey: boolean) => void;
  onRenameLayer: (id: string, name: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onMoveLayer: (id: string, action: "top" | "up" | "down" | "bottom") => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onReorderDrag: (dragId: string, targetId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (layers.length === 0) {
    return null;
  }

  return (
    <>
      <DesignerTooltip content="圖層">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="canvas-layer-drawer"
          className={`absolute left-3 top-3 z-30 flex items-center gap-1.5 border border-zinc-200 bg-white px-2.5 py-1.5 font-medium text-zinc-800 transition-colors duration-150 ease-out hover:bg-zinc-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${ds.radius.button} ${ds.shadow.card} ${ds.type.helper}`}
        >
          <span aria-hidden>≡</span>
          <span>圖層</span>
          <span
            className={`rounded-full bg-zinc-900 px-1.5 py-0.5 font-semibold leading-none text-white ${ds.type.helper}`}
          >
            {layers.length}
          </span>
        </button>
      </DesignerTooltip>

      {open && (
        <>
          <button
            type="button"
            aria-label="關閉圖層面板"
            className={`absolute inset-0 z-40 bg-black/20 ${ds.motion.drawer}`}
            onClick={() => setOpen(false)}
          />
          <aside
            id="canvas-layer-drawer"
            className={`absolute left-0 top-0 z-50 flex h-full w-60 max-w-[85vw] flex-col overflow-hidden border-r border-zinc-200 bg-white shadow-xl ${ds.motion.drawer}`}
            aria-label="圖層管理"
          >
            <div
              className={`flex shrink-0 items-center justify-between border-b border-zinc-100 ${ds.space.px4} py-2.5`}
            >
              <h3 className={ds.type.cardTitle}>圖層</h3>
              <button
                type="button"
                aria-label="關閉"
                onClick={() => setOpen(false)}
                className={`px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 ${ds.radius.button} ${ds.type.body} ${ds.motion.hover}`}
              >
                ×
              </button>
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto ${ds.space.p2}`}>
              <LayerPanel
                layers={layers}
                selectedIds={selectedLayerIds}
                isBusy={isBusy}
                onSelect={onSelectLayer}
                onRename={onRenameLayer}
                onToggleVisible={onToggleVisible}
                onToggleLocked={onToggleLocked}
                onMove={onMoveLayer}
                onDuplicate={onDuplicateLayer}
                onDelete={onDeleteLayer}
                onReorderDrag={onReorderDrag}
              />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
