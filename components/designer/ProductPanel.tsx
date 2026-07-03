"use client";

import { useState, type ReactNode } from "react";
import type { Material, ShirtColor, Size, SizeSuggestion } from "@/lib/constants";
import {
  FIT_LABEL,
  getProductCode,
  MATERIAL_OPTIONS,
  SHIRT_COLORS,
} from "@/lib/constants";
import {
  getProductSizeRows,
  PRODUCT_SIZE_LINES,
} from "@/lib/product-size-config";
import { ds } from "./design-ui";
import { TshirtSizeGuideModal } from "./TshirtSizeGuideModal";

const selectClassName = `h-9 w-full border border-zinc-200 bg-zinc-50/60 px-2.5 text-xs text-zinc-900 ${ds.radius.button} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`;
const inputClassName = `h-9 w-full border border-zinc-200 bg-zinc-50/60 px-2.5 text-zinc-900 ${ds.type.body} ${ds.radius.button} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`;

function ProductSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-b border-zinc-100 py-3 last:border-b-0 ${className}`}>
      <h3 className={ds.type.panelTitle}>{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function ProductPanel({
  shirtColor,
  material,
  size,
  heightCm,
  weightKg,
  suggestedSize,
  isBusy = false,
  designLocked = false,
  onColorChange,
  onMaterialChange,
  onSizeChange,
  onHeightChange,
  onWeightChange,
  onUpdateBody,
  hideColorPicker = false,
}: {
  shirtColor: ShirtColor;
  material: Material;
  size: Size;
  heightCm: number;
  weightKg: number;
  suggestedSize: SizeSuggestion;
  isBusy?: boolean;
  designLocked?: boolean;
  onColorChange: (color: ShirtColor) => void;
  onMaterialChange: (material: Material) => void;
  onSizeChange: (size: Size) => void;
  onHeightChange: (height: number) => void;
  onWeightChange: (weight: number) => void;
  onUpdateBody: () => void;
  hideColorPicker?: boolean;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  const colorName =
    SHIRT_COLORS.find((c) => c.id === shirtColor)?.name ?? shirtColor;
  const showHeatherNotice = shirtColor === "heather-grey";

  return (
    <div
      data-layout-rail="product"
      data-drawer-panel
      className={`flex h-full min-h-0 shrink-0 flex-col overflow-y-auto border-r border-zinc-200 ${ds.surface.panel} ${ds.layout.productRail} ${ds.space.panel}`}
    >
      <div className="flex flex-col">
        <ProductSection title="商品">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center bg-zinc-50 text-lg ring-1 ring-zinc-200 ${ds.radius.button}`}
            >
              👕
            </div>
            <div className="min-w-0 flex-1">
              <p className={`${ds.type.body} font-semibold text-zinc-900`}>
                {getProductCode()}
              </p>
              <p className={ds.type.helper}>{FIT_LABEL}</p>
              <p className={`mt-0.5 ${ds.type.body}`}>
                {colorName}｜{size}
              </p>
            </div>
          </div>
        </ProductSection>

        {!hideColorPicker && (
          <ProductSection title="顏色">
            <div className="grid grid-cols-8 gap-1.5">
              {SHIRT_COLORS.map((color) => {
                const selected = shirtColor === color.id;
                return (
                  <button
                    key={color.id}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={selected}
                    onClick={() => onColorChange(color.id)}
                    className={`h-7 w-7 rounded-full border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                      selected
                        ? "border-zinc-900 ring-2 ring-zinc-900/20"
                        : "border-zinc-300 hover:border-zinc-500"
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </ProductSection>
        )}

        <ProductSection title="尺寸">
          <label className={`mb-1 block ${ds.type.label}`}>尺寸</label>
          <select
            value={size}
            disabled={isBusy || designLocked}
            onChange={(e) => onSizeChange(e.target.value as Size)}
            className={selectClassName}
          >
            {PRODUCT_SIZE_LINES.map((line) => {
              const rows =
                line.id === "children"
                  ? getProductSizeRows("children")
                  : line.id === "fit"
                    ? getProductSizeRows("fit")
                    : getProductSizeRows("adult-standard");

              return (
                <optgroup key={line.id} label={line.label}>
                  {rows.map((row) => (
                    <option key={row.size} value={row.size}>
                      {row.size}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label className={`mb-1 block ${ds.type.label}`}>身高</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={`mb-1 block ${ds.type.label}`}>體重</label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => onWeightChange(Number(e.target.value))}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={ds.type.label}>推薦</span>
            <span className={`font-semibold text-zinc-900 ${ds.type.body}`}>
              {suggestedSize}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onUpdateBody}
              className={`w-full ${ds.button.secondary}`}
            >
              重新推薦尺寸
            </button>
            <button
              type="button"
              className={`font-medium text-blue-700 hover:underline ${ds.type.label}`}
              onClick={() => setShowSizeGuide(true)}
            >
              查看尺寸表
            </button>
          </div>
        </ProductSection>

        <ProductSection title="材質">
          <select
            value={material}
            onChange={(e) => onMaterialChange(e.target.value as Material)}
            className={selectClassName}
          >
            {MATERIAL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </ProductSection>

        {showHeatherNotice ? (
          <section
            className="mt-1 rounded-lg border border-amber-200/80 bg-amber-50/90 p-2.5"
            role="note"
            aria-label="材質提醒"
          >
            <p className={`font-semibold text-amber-950 ${ds.type.body}`}>注意</p>
            <p className={`mt-1 text-amber-900 ${ds.type.helper}`}>
              麻灰色布料 · 90% Cotton · 10% Polyester
            </p>
          </section>
        ) : null}
      </div>

      <TshirtSizeGuideModal
        open={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />
    </div>
  );
}
