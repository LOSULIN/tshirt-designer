"use client";

import {
  LAYER_ALIGNMENT_OPTIONS,
  type LayerAlignmentAxis,
} from "@/lib/layer-alignment";
import { DesignerTooltip } from "./DesignerTooltip";
import { tb } from "./toolbar-interaction-ui";

const ALL_ALIGN: LayerAlignmentAxis[] = [
  "left",
  "center",
  "right",
  "top",
  "middle",
  "bottom",
];

function AlignIcon({ kind }: { kind: LayerAlignmentAxis }) {
  const bar = "bg-zinc-600";
  const guide = "bg-blue-500";

  if (kind === "left") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-start gap-0.5">
        <span className={`h-2.5 w-0.5 ${guide}`} />
        <span className={`h-2 w-1.5 ${bar}`} />
      </span>
    );
  }
  if (kind === "right") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-end gap-0.5">
        <span className={`h-2 w-1.5 ${bar}`} />
        <span className={`h-2.5 w-0.5 ${guide}`} />
      </span>
    );
  }
  if (kind === "center") {
    return (
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className={`absolute h-2.5 w-0.5 ${guide}`} />
        <span className={`h-2 w-2 ${bar}`} />
      </span>
    );
  }
  if (kind === "top") {
    return (
      <span className="flex h-3.5 w-3.5 flex-col items-center justify-start gap-0.5">
        <span className={`h-0.5 w-2.5 ${guide}`} />
        <span className={`h-1.5 w-2 ${bar}`} />
      </span>
    );
  }
  if (kind === "bottom") {
    return (
      <span className="flex h-3.5 w-3.5 flex-col items-center justify-end gap-0.5">
        <span className={`h-1.5 w-2 ${bar}`} />
        <span className={`h-0.5 w-2.5 ${guide}`} />
      </span>
    );
  }
  return (
    <span className="relative flex h-3.5 w-3.5 items-center justify-center">
      <span className={`absolute h-0.5 w-2.5 ${guide}`} />
      <span className={`h-2 w-2 ${bar}`} />
    </span>
  );
}

export function DesignerAlignmentToolbar({
  disabled,
  onAlign,
}: {
  disabled: boolean;
  onAlign: (axis: LayerAlignmentAxis) => void;
}) {
  const optionById = (id: LayerAlignmentAxis) =>
    LAYER_ALIGNMENT_OPTIONS.find((option) => option.id === id)!;

  return (
    <div
      className="flex shrink-0 items-center gap-0.5"
      aria-label="對齊工具"
      role="toolbar"
    >
      {ALL_ALIGN.map((id) => {
        const option = optionById(id);
        return (
          <DesignerTooltip key={id} content={option.title}>
            <button
              type="button"
              disabled={disabled}
              aria-label={option.title}
              className={tb.iconButton}
              onClick={() => onAlign(id)}
            >
              <AlignIcon kind={id} />
            </button>
          </DesignerTooltip>
        );
      })}
    </div>
  );
}
