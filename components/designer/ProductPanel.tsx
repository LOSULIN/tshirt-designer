"use client";

import type { Material, Product, ShirtColor, Size } from "@/lib/constants";
import {
  FIT_LABEL,
  MATERIAL_OPTIONS,
  PRODUCT_LIST,
  PRODUCTS,
  SHIRT_COLORS,
  SIZES,
} from "@/lib/constants";

export function ProductPanel({
  product,
  shirtColor,
  material,
  size,
  onProductChange,
  onColorChange,
  onMaterialChange,
  onSizeChange,
  hideColorPicker = false,
}: {
  product: Product;
  shirtColor: ShirtColor;
  material: Material;
  size: Size;
  onProductChange: (product: Product) => void;
  onColorChange: (color: ShirtColor) => void;
  onMaterialChange: (material: Material) => void;
  onSizeChange: (size: Size) => void;
  hideColorPicker?: boolean;
}) {
  return (
    <div className="flex w-60 shrink-0 flex-col gap-5 overflow-y-auto border-r border-zinc-200 bg-white p-4">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-zinc-900">選擇商品</h2>
        <select
          value={product}
          onChange={(e) => onProductChange(e.target.value as Product)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
        >
          {PRODUCT_LIST.map((key) => (
            <option key={key} value={key}>
              {PRODUCTS[key].name}
            </option>
          ))}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {PRODUCT_LIST.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onProductChange(key)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-center text-[10px] transition-colors ${
                product === key
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <div className="flex h-12 w-full items-center justify-center rounded bg-zinc-100 text-lg">
                👕
              </div>
              <span className="text-zinc-700">{PRODUCTS[key].name}</span>
            </button>
          ))}
        </div>
      </div>

      {!hideColorPicker && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">顏色選擇</h2>
          <div className="flex flex-wrap gap-2">
            {SHIRT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                title={color.name}
                onClick={() => onColorChange(color.id as ShirtColor)}
                className={`h-8 w-8 rounded-full border-2 transition-all ${
                  shirtColor === color.id
                    ? "border-zinc-900 scale-110"
                    : "border-zinc-300"
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
        >
          尺寸表
        </button>
      </div>
    </div>
  );
}
