"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Side } from "@/lib/constants";
import {
  getPlacementPresetsForSide,
  type PlacementPresetId,
} from "@/lib/placement-presets";
import { ds } from "./design-ui";
import { GarmentConstraintBadge } from "./GarmentConstraintUxPrimitives";

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

export function PlacementPresetToolbar({
  side,
  disabled,
  activePresetId = null,
  selectionOverflow = false,
  onApplyPreset,
  embedded = false,
  variant = "dropdown",
}: {
  side: Side;
  disabled: boolean;
  activePresetId?: PlacementPresetId | null;
  selectionOverflow?: boolean;
  onApplyPreset: (presetId: PlacementPresetId) => void;
  embedded?: boolean;
  variant?: "chips" | "dropdown";
}) {
  const size = usePlacementPresetSize();
  const presets = getPlacementPresetsForSide(side, size);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const activePreset = presets.find((preset) => preset.id === activePresetId);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (variant === "dropdown") {
    return (
      <div
        ref={rootRef}
        className={`relative shrink-0 ${embedded ? "" : "border-b border-zinc-100 bg-white px-3 py-1.5"}`}
        aria-label="推薦印刷版型"
      >
        {selectionOverflow && (
          <span
            data-garment-constraint-selection-warning
            data-garment-constraint-warning-level="violation"
            className="sr-only"
            role="status"
          >
            <GarmentConstraintBadge
              level="violation"
              label="選取超出"
              tooltip={`目前選取圖層超出尺碼 ${size} 可印範圍`}
              pulse
            />
          </span>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={`flex items-center gap-1.5 ${ds.button.toolbar}`}
        >
          <span>版型</span>
          {activePreset ? (
            <span className={`max-w-[8rem] truncate text-blue-700 ${ds.type.helper}`}>
              {activePreset.shortLabel}
            </span>
          ) : null}
          <span className={`${ds.type.helper} text-zinc-400`} aria-hidden>
            ▾
          </span>
        </button>
        {open && (
          <div
            role="listbox"
            className={`absolute left-0 top-full z-50 mt-1 min-w-[11rem] border border-zinc-200 bg-white py-1 ${ds.radius.button} ${ds.shadow.preview}`}
          >
            {presets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={disabled}
                  title={`${preset.label} · ${preset.width_cm}×${preset.height_cm} cm`}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left ${ds.type.body} ${
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                  onClick={() => {
                    onApplyPreset(preset.id);
                    setOpen(false);
                  }}
                >
                  <span className="w-3 shrink-0 text-center" aria-hidden>
                    {isActive ? "●" : "○"}
                  </span>
                  <span>{preset.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const presetButtonClass = `shrink-0 px-2 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-40 ${ds.radius.button} ${ds.type.helper}`;

  return (
    <div
      className={
        embedded
          ? `flex shrink-0 items-center ${ds.space.gap2} bg-transparent py-0 pl-0 pr-0`
          : `flex shrink-0 items-center ${ds.space.gap2} border-b border-zinc-100 bg-white px-3 py-1.5`
      }
      aria-label="推薦印刷版型"
    >
      <span className={`shrink-0 font-medium text-zinc-500 ${ds.type.helper}`}>
        版型
      </span>
      {selectionOverflow && (
        <span
          data-garment-constraint-selection-warning
          data-garment-constraint-warning-level="violation"
          className="shrink-0"
          role="status"
        >
          <GarmentConstraintBadge
            level="violation"
            label="選取超出"
            tooltip={`目前選取圖層超出尺碼 ${size} 可印範圍`}
            pulse
          />
        </span>
      )}
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
              className={`${presetButtonClass} ${
                isActive
                  ? "border border-blue-500 bg-blue-50 text-blue-700"
                  : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
              onClick={() => onApplyPreset(preset.id)}
            >
              {preset.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
