"use client";

import { useState } from "react";
import type { Material, ShirtColor, Size } from "@/lib/constants";
import {
  FIT_LABEL,
  getProductName,
  PRODUCT,
  MATERIAL_OPTIONS,
  SHIRT_COLORS,
  SIZES,
} from "@/lib/constants";
import { TshirtSizeGuideModal } from "./TshirtSizeGuideModal";

export function ProductPanel({
  shirtColor,
  material,
  size,
  onColorChange,
  onMaterialChange,
  onSizeChange,
  hideColorPicker = false,
}: {
  shirtColor: ShirtColor;
  material: Material;
  size: Size;
  onColorChange: (color: ShirtColor) => void;
  onMaterialChange: (material: Material) => void;
  onSizeChange: (size: Size) => void;
  hideColorPicker?: boolean;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  return (
    <div className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-200 bg-white p-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">商品</h2>
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-xl ring-1 ring-zinc-200">
            👕
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">{getProductName()}</p>
            <p className="text-xs text-zinc-500">{PRODUCT.description}</p>
          </div>
        </div>
      </div>

      {!hideColorPicker && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">衣服顏色</h2>
          <p className="mb-2 text-xs text-zinc-500">
            已選：
            {SHIRT_COLORS.find((c) => c.id === shirtColor)?.name ?? shirtColor}
          </p>
          <div className="flex flex-wrap gap-2">
            {SHIRT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={shirtColor === color.id}
                onClick={() => onColorChange(color.id)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  shirtColor === color.id
                    ? "border-zinc-900 scale-110 ring-2 ring-zinc-900/20"
                    : "border-zinc-300 hover:border-zinc-500"
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">版型</h2>
        <div className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-center text-sm text-white">
          {FIT_LABEL}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">材質 / 克重</h2>
        <select
          value={material}
          onChange={(e) => onMaterialChange(e.target.value as Material)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {MATERIAL_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">尺寸</h2>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSizeChange(s)}
              className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                size === s
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-blue-600 hover:underline"
          onClick={() => setShowSizeGuide(true)}
        >
          尺寸表
        </button>
      </div>

      <TshirtSizeGuideModal
        open={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </div>
  );
}
