"use client";

import type { Side } from "@/lib/constants";
import {
  getPlacementPresetsForSide,
  type PlacementPresetId,
} from "@/lib/placement-presets";

const buttonClass =
  "shrink-0 rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

export function PlacementPresetToolbar({
  side,
  disabled,
  onApplyPreset,
}: {
  side: Side;
  disabled: boolean;
  onApplyPreset: (presetId: PlacementPresetId) => void;
}) {
  const presets = getPlacementPresetsForSide(side);

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-white px-3 py-1.5"
      aria-label="推薦印刷版型"
    >
      <span className="shrink-0 text-[10px] font-medium text-zinc-500">版型</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={disabled}
            title={`${preset.label} · ${preset.width_cm}×${preset.height_cm} cm`}
            aria-label={`套用版型：${preset.label}`}
            className={buttonClass}
            onClick={() => onApplyPreset(preset.id)}
          >
            {preset.shortLabel}
          </button>
        ))}
      </div>
      <span className="hidden shrink-0 text-[10px] text-zinc-400 lg:inline">
        等比縮放至版型區
      </span>
    </div>
  );
}
