"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { Side } from "@/lib/constants";
import {
  getPlacementPresetsForSide,
  type PlacementPresetId,
} from "@/lib/placement-presets";

const PlacementPresetSizeContext = createContext<string | null>(null);

export function PlacementPresetSizeProvider({
  size,
  children,
}: {
  size: string;
  children: ReactNode;
}) {
  return (
    <PlacementPresetSizeContext.Provider value={size}>
      {children}
    </PlacementPresetSizeContext.Provider>
  );
}

function usePlacementPresetSize(): string {
  const size = useContext(PlacementPresetSizeContext);
  if (!size) {
    throw new Error(
      "PlacementPresetToolbar must be used within PlacementPresetSizeProvider",
    );
  }
  return size;
}

const buttonClass =
  "shrink-0 rounded border px-2 py-1 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40";

export function PlacementPresetToolbar({
  side,
  disabled,
  activePresetId = null,
  onApplyPreset,
}: {
  side: Side;
  disabled: boolean;
  activePresetId?: PlacementPresetId | null;
  onApplyPreset: (presetId: PlacementPresetId) => void;
}) {
  const size = usePlacementPresetSize();
  const presets = getPlacementPresetsForSide(side, size);

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-white px-3 py-1.5"
      aria-label="推薦印刷版型"
    >
      <span className="shrink-0 text-[10px] font-medium text-zinc-500">版型</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              title={`${preset.label} · ${preset.width_cm}×${preset.height_cm} cm`}
              aria-label={`套用版型：${preset.label}`}
              aria-pressed={isActive}
              className={`${buttonClass} ${
                isActive
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
              onClick={() => onApplyPreset(preset.id)}
            >
              {preset.shortLabel}
            </button>
          );
        })}
      </div>
      <span className="hidden shrink-0 text-[10px] text-zinc-400 lg:inline">
        {activePresetId ? "已選版型，新增物件將套用模板尺寸" : "點選版型套用尺寸"}
      </span>
    </div>
  );
}
