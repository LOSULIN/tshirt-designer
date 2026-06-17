"use client";

import { useMemo, useState } from "react";
import type { Material, Size, SizeSuggestion } from "@/lib/constants";
import { getMaterialLabel, SIZES } from "@/lib/constants";
import { formatInspectorCm } from "@/lib/design-inspector";
import { getGarmentRecommendedPrintDisplayCm } from "@/lib/garment-print-config";
import { getShirtScale } from "@/lib/shirtScale";
import { getSizeMeasurement, toApparelSize } from "@/lib/sizes";
import { TshirtSizeGuideModal } from "./TshirtSizeGuideModal";

function InfoRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[11px]">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd
        className={`text-right text-zinc-900 ${mono ? "font-mono font-medium tabular-nums" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatRecommendedPrintLabel(widthCm: number, heightCm: number): string {
  return `${widthCm.toFixed(0)} × ${heightCm.toFixed(0)} cm`;
}

function RecommendedPrintSideBlock({
  sideLabel,
  widthCm,
  heightCm,
}: {
  sideLabel: string;
  widthCm: number;
  heightCm: number;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium text-zinc-800">{sideLabel}</p>
      <p className="text-[10px] text-zinc-500">建議印製區域</p>
      <p className="font-mono text-[11px] font-medium tabular-nums text-zinc-900">
        {formatRecommendedPrintLabel(widthCm, heightCm)}
      </p>
    </div>
  );
}

export function GarmentInfoPanel({
  size,
  material,
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
  size: Size;
  material: Material;
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

  const apparelSize = toApparelSize(size);
  const { chestCm, lengthCm } = getSizeMeasurement(apparelSize);
  const shirtScale = getShirtScale(size);
  const frontRecommended = useMemo(
    () => getGarmentRecommendedPrintDisplayCm("front", size),
    [size],
  );
  const backRecommended = useMemo(
    () => getGarmentRecommendedPrintDisplayCm("back", size),
    [size],
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Garment Info
          </h2>

          <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                衣服尺寸
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSizeChange(s)}
                    className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
                      size === s
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <dl className="space-y-1.5">
              <InfoRow
                label="材質 / 克重"
                value={getMaterialLabel(material)}
                mono={false}
              />
              <InfoRow
                label="胸寬"
                value={`${formatInspectorCm(chestCm, 0)}`}
              />
              <InfoRow
                label="衣長"
                value={`${formatInspectorCm(lengthCm, 0)}`}
              />
              <InfoRow
                label="Shirt scale"
                value={shirtScale.toFixed(3)}
              />
            </dl>

            <div className="space-y-3 border-t border-zinc-200 pt-3">
              <RecommendedPrintSideBlock
                sideLabel="正面"
                widthCm={frontRecommended.widthCm}
                heightCm={frontRecommended.heightCm}
              />
              <RecommendedPrintSideBlock
                sideLabel="背面"
                widthCm={backRecommended.widthCm}
                heightCm={backRecommended.heightCm}
              />
            </div>

            <p className="text-[10px] leading-relaxed text-zinc-500">
              真實穿著效果會因衣服版型、尺寸與人體曲線產生些微落差。
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
          <h2 className="mb-2 text-xs font-semibold text-zinc-900">身形資訊</h2>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-800">
                身高 (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-zinc-800">
                體重 (kg)
              </label>
              <input
                type="number"
                value={weightKg}
                onChange={(e) => onWeightChange(Number(e.target.value))}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onUpdateBody}
            className="mt-2 w-full rounded border border-zinc-300 bg-white py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
          >
            更新
          </button>
        </div>

        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-xs text-zinc-900">尺寸建議</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">
            建議尺寸：{suggestedSize}
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-blue-600 hover:underline"
            onClick={() => setShowSizeGuide(true)}
          >
            查看尺寸表
          </button>
        </div>
      </div>

      <TshirtSizeGuideModal
        open={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
      />

      <div className="mt-auto shrink-0 border-t border-zinc-200 p-4">
        <button
          type="button"
          disabled={isBusy || !hasDesign || designLocked}
          onClick={onSubmit}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </aside>
  );
}
