"use client";

import { useEffect, useRef } from "react";
import { resolveFontFamily } from "@/lib/text-layer";
import type { TextDesignLayer } from "@/lib/types";

export function CanvasInlineTextEditor({
  layer,
  printAreaHeight,
  onChange,
  onCommit,
  onCancel,
}: {
  layer: TextDesignLayer;
  printAreaHeight: number;
  onChange: (text: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [layer.id]);

  const fontSizeCm = layer.fontSize_cm * layer.scale;

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
      className="h-full w-full resize-none border-none bg-transparent p-0 text-center leading-[1.3] text-zinc-900 outline-none"
      style={{
        fontFamily: resolveFontFamily(layer.fontFamily),
        fontSize: `calc(${fontSizeCm / printAreaHeight} * 100cqh)`,
        fontWeight: layer.fontWeight,
        color: layer.color,
        opacity: layer.opacity,
      }}
      placeholder="輸入文字"
      aria-label="文字內容"
    />
  );
}
