"use client";

import { TEXT_FONT_OPTIONS } from "@/lib/text-layer";
import {
  isTextBold,
  toggleTextBold,
  toggleTextItalic,
} from "@/lib/text-style";
import type { TextDesignLayer } from "@/lib/types";
import { PropertyRow } from "./PropertyRow";

const selectClass =
  "w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-[10px] text-zinc-900 disabled:bg-zinc-100";

const toggleClass = (active: boolean) =>
  `rounded border px-1.5 py-0.5 text-[10px] font-medium ${
    active
      ? "border-blue-500 bg-blue-50 text-blue-800"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
  } disabled:opacity-50`;

export function TextPropertiesPanel({
  layer,
  disabled,
  onPatch,
}: {
  layer: TextDesignLayer;
  disabled: boolean;
  onPatch: (patch: Partial<TextDesignLayer>) => void;
}) {
  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Text Properties
      </p>

      <PropertyRow label="字型">
        <select
          className={selectClass}
          disabled={disabled}
          value={layer.fontFamily}
          onChange={(e) =>
            onPatch({
              fontFamily: e.target.value as TextDesignLayer["fontFamily"],
            })
          }
        >
          {TEXT_FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </PropertyRow>

      <PropertyRow label="樣式">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={disabled}
            className={toggleClass(isTextBold(layer))}
            onClick={() => onPatch(toggleTextBold(layer))}
          >
            粗體
          </button>
          <button
            type="button"
            disabled={disabled}
            className={toggleClass(layer.fontStyle === "italic")}
            onClick={() => onPatch(toggleTextItalic(layer))}
          >
            斜體
          </button>
        </div>
      </PropertyRow>

      <PropertyRow label="顏色">
        <input
          type="color"
          disabled={disabled}
          value={layer.color}
          className="h-6 w-full cursor-pointer rounded border border-zinc-300 bg-white p-0.5"
          onChange={(e) => onPatch({ color: e.target.value })}
        />
      </PropertyRow>

      <PropertyRow label="透明度">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          disabled={disabled}
          value={layer.opacity}
          className="w-full"
          onChange={(e) => onPatch({ opacity: Number(e.target.value) })}
        />
      </PropertyRow>
    </div>
  );
}
