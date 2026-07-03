"use client";

import {
  LAYER_ALIGNMENT_OPTIONS,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";
import { ds } from "./design-ui";

const iconButtonClass = `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 ${ds.type.body}`;

export function AlignmentToolbar({
  disabled,
  onAlign,
  inline = false,
}: {
  disabled: boolean;
  onAlign: (axis: LayerAlignmentAxis) => void;
  /** 固定 Icon Group — 無 Dropdown */
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div
        className="flex shrink-0 items-center gap-0.5"
        aria-label="對齊工具"
        role="toolbar"
      >
        {LAYER_ALIGNMENT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            title={option.title}
            aria-label={option.title}
            className={iconButtonClass}
            onClick={() => onAlign(option.id)}
          >
            <AlignIcon kind={option.id} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-3 py-1.5"
      aria-label="對齊工具"
    >
      <span className={`font-medium text-zinc-500 ${ds.type.helper}`}>對齊</span>
      <div className="flex items-center gap-0.5">
        {LAYER_ALIGNMENT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            title={option.title}
            aria-label={option.title}
            className={iconButtonClass}
            onClick={() => onAlign(option.id)}
          >
            <AlignIcon kind={option.id} />
          </button>
        ))}
      </div>
    </div>
  );
}

function AlignIcon({ kind }: { kind: LayerAlignmentAxis }) {
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
  if (kind === "center") {
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
      <span className={`absolute h-0.5 w-3 ${guide}`} />
      <span className={`h-2.5 w-2.5 ${bar}`} />
    </span>
  );
}
