"use client";

import {
  LAYER_ALIGNMENT_OPTIONS,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";

const buttonClass =
  "flex h-7 min-w-[1.75rem] items-center justify-center rounded border border-zinc-300 bg-white px-1.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40";

export function AlignmentToolbar({
  disabled,
  onAlign,
}: {
  disabled: boolean;
  onAlign: (axis: LayerAlignmentAxis) => void;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-1.5"
      aria-label="對齊工具"
    >
      <span className="text-[10px] font-medium text-zinc-500">對齊</span>
      <div className="flex items-center gap-1">
        {LAYER_ALIGNMENT_OPTIONS.slice(0, 3).map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            title={option.title}
            aria-label={option.title}
            className={buttonClass}
            onClick={() => onAlign(option.id)}
          >
            {option.id === "left" ? (
              <AlignIcon kind="left" />
            ) : option.id === "center" ? (
              <AlignIcon kind="center-h" />
            ) : (
              <AlignIcon kind="right" />
            )}
          </button>
        ))}
      </div>
      <span className="h-4 w-px bg-zinc-200" aria-hidden />
      <div className="flex items-center gap-1">
        {LAYER_ALIGNMENT_OPTIONS.slice(3).map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            title={option.title}
            aria-label={option.title}
            className={buttonClass}
            onClick={() => onAlign(option.id)}
          >
            {option.id === "top" ? (
              <AlignIcon kind="top" />
            ) : option.id === "middle" ? (
              <AlignIcon kind="center-v" />
            ) : (
              <AlignIcon kind="bottom" />
            )}
          </button>
        ))}
      </div>
      <span className="hidden text-[10px] text-zinc-400 sm:inline">
        單選對齊設計工作區 · 多選對齊群組
      </span>
    </div>
  );
}

function AlignIcon({
  kind,
}: {
  kind: "left" | "center-h" | "right" | "top" | "center-v" | "bottom";
}) {
  const bar = "bg-zinc-600";
  const guide = "bg-blue-500";

  if (kind === "left") {
    return (
      <span className="flex h-4 w-4 items-center justify-start gap-0.5">
        <span className={`h-3 w-0.5 ${guide}`} />
        <span className={`h-2.5 w-2 ${bar}`} />
      </span>
    );
  }
  if (kind === "right") {
    return (
      <span className="flex h-4 w-4 items-center justify-end gap-0.5">
        <span className={`h-2.5 w-2 ${bar}`} />
        <span className={`h-3 w-0.5 ${guide}`} />
      </span>
    );
  }
  if (kind === "center-h") {
    return (
      <span className="relative flex h-4 w-4 items-center justify-center">
        <span className={`absolute h-3 w-0.5 ${guide}`} />
        <span className={`h-2.5 w-2.5 ${bar}`} />
      </span>
    );
  }
  if (kind === "top") {
    return (
      <span className="flex h-4 w-4 flex-col items-center justify-start gap-0.5">
        <span className={`h-0.5 w-3 ${guide}`} />
        <span className={`h-2 w-2.5 ${bar}`} />
      </span>
    );
  }
  if (kind === "bottom") {
    return (
      <span className="flex h-4 w-4 flex-col items-center justify-end gap-0.5">
        <span className={`h-2 w-2.5 ${bar}`} />
        <span className={`h-0.5 w-3 ${guide}`} />
      </span>
    );
  }
  return (
    <span className="relative flex h-4 w-4 items-center justify-center">
      <span className={`absolute w-3 h-0.5 ${guide}`} />
      <span className={`h-2.5 w-2.5 ${bar}`} />
    </span>
  );
}
