"use client";

import { useState } from "react";
import type { ShirtColor, Size, SizeSuggestion } from "@/lib/constants";
import { PRODUCT, SHIRT_COLORS, getProductCode, getShirtColorName, SIZES } from "@/lib/constants";
import { ds } from "./design-ui";
import { TshirtSizeGuideModal } from "./TshirtSizeGuideModal";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={ds.type.helper}>{label}</dt>
      <dd className={`text-right font-medium text-zinc-900 ${ds.type.body}`}>
        {value}
      </dd>
    </div>
  );
}

function SectionDivider() {
  return <div className={`border-t ${ds.surface.divider}`} role="separator" />;
}

export function GarmentInfoPanel({
  shirtColor,
  size,
  onSizeChange,
  heightCm,
  weightKg,
  suggestedSize,
  isBusy,
  hasDesign,
  onHeightChange,
  onWeightChange,
  onUpdateBody,
  onSubmit,
  submitLabel = "確認發送申請",
  designLocked = false,
}: {
  shirtColor: ShirtColor;
  size: Size;
  onSizeChange: (size: Size) => void;
  heightCm: number;
  weightKg: number;
  suggestedSize: SizeSuggestion;
  isBusy: boolean;
  hasDesign: boolean;
  designLocked?: boolean;
  onHeightChange: (height: number) => void;
  onWeightChange: (weight: number) => void;
  onUpdateBody: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const colorName = getShirtColorName(shirtColor);
  const colorHex =
    SHIRT_COLORS.find((item) => item.id === shirtColor)?.hex ?? "#ffffff";

  return (
    <aside
      data-layout-rail="checkout"
      data-drawer-panel
      className={`relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-zinc-200 ${ds.surface.panel} ${ds.layout.infoRail}`}
    >
      <div
        className={`flex h-full min-h-0 flex-1 flex-col ${ds.space.gap4} overflow-y-auto ${ds.space.p4} pb-24`}
      >
        <div className="flex flex-wrap items-center gap-2" aria-label="商品摘要">
          <span
            className={`inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-semibold text-zinc-900 ${ds.type.body}`}
          >
            {getProductCode()}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-medium text-zinc-800 ${ds.type.body}`}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-zinc-200"
              style={{ backgroundColor: colorHex }}
              aria-hidden
            />
            {colorName}
          </span>
          <span
            className={`inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 font-semibold text-zinc-900 ${ds.type.body}`}
          >
            {size}
          </span>
        </div>

        <section
          className={`${ds.card} ${ds.space.p4}`}
          aria-label="商品資訊"
        >
          <h2 className={ds.type.cardTitle}>商品資訊</h2>

          <dl className={`${ds.space.section} space-y-2`}>
            <InfoRow label="商品名稱" value={PRODUCT.name} />
            <InfoRow label="顏色" value={colorName} />
            <InfoRow label="尺寸" value={size} />
          </dl>

          <SectionDivider />

          <div className={ds.space.section}>
            <label className={`mb-1.5 block ${ds.type.helper}`}>修改尺寸</label>
            <select
              value={size}
              disabled={isBusy || designLocked}
              onChange={(e) => onSizeChange(e.target.value as Size)}
              className={`h-10 w-full border border-zinc-200 bg-white px-3 text-zinc-900 ${ds.type.body} ${ds.radius.button} ${ds.motion.hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <SectionDivider />

          <div className={ds.space.section}>
            <h3 className={ds.type.cardTitle}>尺寸建議</h3>
            <div className={`mt-3 grid grid-cols-2 gap-3`}>
              <div>
                <label className={`mb-1.5 block ${ds.type.helper}`}>身高 (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => onHeightChange(Number(e.target.value))}
                  className={`h-10 w-full border border-zinc-200 bg-white px-3 text-zinc-900 ${ds.type.body} ${ds.radius.button} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`}
                />
              </div>
              <div>
                <label className={`mb-1.5 block ${ds.type.helper}`}>體重 (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => onWeightChange(Number(e.target.value))}
                  className={`h-10 w-full border border-zinc-200 bg-white px-3 text-zinc-900 ${ds.type.body} ${ds.radius.button} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`}
                />
              </div>
            </div>
            <dl className="mt-3 space-y-2">
              <InfoRow label="推薦尺寸" value={suggestedSize} />
            </dl>
            <button
              type="button"
              onClick={onUpdateBody}
              className={`mt-3 w-full ${ds.button.secondary}`}
            >
              重新推薦尺寸
            </button>
          </div>

          <SectionDivider />

          <button
            type="button"
            className={`mt-4 font-medium ${ds.accent.link} ${ds.type.body} hover:underline`}
            onClick={() => setShowSizeGuide(true)}
          >
            查看尺寸表
          </button>
        </section>
      </div>

      <TshirtSizeGuideModal
        open={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />

      <div
        className={`sticky bottom-0 z-10 shrink-0 border-t border-zinc-200 bg-white/95 backdrop-blur-sm ${ds.shadow.card} ${ds.space.p4}`}
      >
        <button
          type="button"
          disabled={isBusy || !hasDesign || designLocked}
          onClick={onSubmit}
          className={`w-full ${ds.button.primary}`}
        >
          {submitLabel}
        </button>
      </div>
    </aside>
  );
}
