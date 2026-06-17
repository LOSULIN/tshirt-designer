"use client";

import { useEffect, useRef } from "react";
import { getTextLayerPlacementCmRect } from "@/lib/text-layer";
import { getRichTextDomStyle } from "@/lib/text-style";
import type { TextDesignLayer } from "@/lib/types";

export function CanvasInlineTextEditor({
  layer,
  onChange,
  onCommit,
  onCancel,
}: {
  layer: TextDesignLayer;
  onChange: (text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const placementRect = getTextLayerPlacementCmRect(layer);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [layer.id]);

  const textStyle = getRichTextDomStyle(layer, placementRect);

  return (
    <textarea
      ref={ref}
      value={layer.text}
      rows={Math.max(1, layer.text.split("\n").length)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onCommit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
        e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={onCommit}
      className="h-full w-full resize-none border-none bg-transparent p-0 text-center outline-none"
      style={{
        ...textStyle,
        lineHeight: textStyle.lineHeight ?? 1.3,
      }}
      placeholder="輸入文字"
      aria-label="文字內容"
    />
  );
}
