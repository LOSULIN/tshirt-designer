"use client";

import { useMemo } from "react";
import {
  canMoveLayerZIndex,
  getLayerTypeLabel,
  getMvpLayerListItems,
} from "@/lib/layer-system";
import type { DesignLayer } from "@/lib/types";

export function MvpLayerList({
  layers,
  selectedLayerId,
  isBusy,
  onSelect,
  onMove,
}: {
  layers: DesignLayer[];
  selectedLayerId: string | null;
  isBusy: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const items = useMemo(
    () => getMvpLayerListItems(layers, selectedLayerId),
    [layers, selectedLayerId],
  );

  return (
    <section
      className="flex max-h-44 min-h-0 shrink-0 flex-col border-t border-zinc-200"
      aria-label="Layer List"
    >
      <div className="shrink-0 px-3 py-2">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
          Layer List
        </h4>
      </div>

      {items.length === 0 ? (
        <p className="px-3 pb-3 text-[11px] text-zinc-500">尚無圖層</p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {items.map((item) => {
            const canUp = canMoveLayerZIndex(layers, item.id, "up");
            const canDown = canMoveLayerZIndex(layers, item.id, "down");
            const typeLabel = getLayerTypeLabel(item.type);

            return (
              <li key={item.id}>
                <div
                  className={`flex items-center gap-1 rounded-md border px-1.5 py-1 ${
                    item.isSelected
                      ? "border-sky-400 bg-sky-50/70"
                      : "border-zinc-200 bg-white hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex shrink-0 flex-col gap-0.5">
                    <button
                      type="button"
                      title="上移一層"
                      aria-label={`${item.name} 上移`}
                      disabled={isBusy || !canUp}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(item.id, "up");
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded border border-zinc-300 bg-white text-[10px] text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="下移一層"
                      aria-label={`${item.name} 下移`}
                      disabled={isBusy || !canDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(item.id, "down");
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded border border-zinc-300 bg-white text-[10px] text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(item.id)}
                  >
                    <span className="block truncate text-[11px] font-medium text-zinc-900">
                      {typeLabel} {item.name}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-zinc-500">
                      zIndex: {item.zIndex}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
