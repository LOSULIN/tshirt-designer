"use client";

import { useEffect, useRef } from "react";
import { TEXT_FONT_OPTIONS } from "@/lib/text-layer";
import type { TextDesignLayer, TextFontFamily } from "@/lib/types";

export function TextLayerEditor({
  layer,
  isBusy,
  locked,
  autoFocus,
  compact = false,
  onChange,
}: {
  layer: TextDesignLayer | null;
  isBusy: boolean;
  locked: boolean;
  autoFocus?: boolean;
  compact?: boolean;
  onChange: (patch: Partial<TextDesignLayer>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && layer && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus, layer?.id]);

  if (!layer) {
    return (
      <p className="text-xs text-zinc-800">
        點選「新增文字」或點擊畫布文字後可編輯
      </p>
    );
  }

  const disabled = isBusy || locked;

  if (compact) {
    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={layer.text}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          placeholder="請輸入文字"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={layer.fontFamily}
            disabled={disabled}
            onChange={(e) =>
              onChange({ fontFamily: e.target.value as TextFontFamily })
            }
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900"
          >
            {TEXT_FONT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="range"
            min={12}
            max={120}
            step={1}
            value={layer.fontSize}
            disabled={disabled}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-full"
            title={`字體大小 ${layer.fontSize}px`}
          />
          <input
            type="color"
            value={layer.color}
            disabled={disabled}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-8 w-full cursor-pointer rounded border border-zinc-300"
            title="文字顏色"
          />
          <select
            value={layer.fontWeight}
            disabled={disabled}
            onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs text-zinc-900"
          >
            <option value={400}>一般</option>
            <option value={500}>中等</option>
            <option value={600}>半粗</option>
            <option value={700}>粗體</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-900">
          文字內容
        </label>
        <input
          ref={inputRef}
          type="text"
          value={layer.text}
          disabled={disabled}
          onChange={(e) => onChange({ text: e.target.value })}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none"
          placeholder="請輸入文字"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-900">
          字體
        </label>
        <select
          value={layer.fontFamily}
          disabled={disabled}
          onChange={(e) =>
            onChange({ fontFamily: e.target.value as TextFontFamily })
          }
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {TEXT_FONT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-900">
          字體大小 ({layer.fontSize}px)
        </label>
        <input
          type="range"
          min={12}
          max={120}
          step={1}
          value={layer.fontSize}
          disabled={disabled}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-900">
          文字顏色
        </label>
        <input
          type="color"
          value={layer.color}
          disabled={disabled}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-10 w-full cursor-pointer rounded border border-zinc-300"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-900">
          字體粗細
        </label>
        <select
          value={layer.fontWeight}
          disabled={disabled}
          onChange={(e) => onChange({ fontWeight: Number(e.target.value) })}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          <option value={400}>一般 (400)</option>
          <option value={500}>中等 (500)</option>
          <option value={600}>半粗 (600)</option>
          <option value={700}>粗體 (700)</option>
        </select>
      </div>
    </div>
  );
}
