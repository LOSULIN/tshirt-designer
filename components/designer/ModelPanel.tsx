"use client";

/**
 * 模特選擇面板 — 邏輯完整保留，暫由 GarmentInfoPanel 取代右側 UI。
 * 恢復：DesignerApp 改回 ModelPanel，並將 ui-visibility.showModelPanel 設為 true。
 */

import { useState } from "react";
import type { Gender, ModelType, Side, SizeSuggestion } from "@/lib/constants";
import { TemplateImage } from "./TemplateImage";
import { TshirtSizeGuideModal } from "./TshirtSizeGuideModal";
import {
  ADULT_MODEL_OPTIONS,
  CHILD_MODEL_OPTIONS,
  getModelType,
  MODEL_TYPE_OPTIONS,
} from "@/lib/constants";
import { ds } from "./design-ui";

function ModelChoiceCard({
  gender,
  label,
  preview,
  selected,
  onClick,
}: {
  gender: Gender;
  label: string;
  preview: string;
  selected: boolean;
  onClick: () => void;
}) {
  const side: Side = "front";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors ${
        selected
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-200 hover:border-zinc-400"
      }`}
    >
      <div className="flex h-24 w-full items-end justify-center overflow-hidden rounded bg-zinc-100">
        <TemplateImage
          gender={gender}
          side={side}
          src={preview}
          alt={label}
          className="h-full w-auto max-w-full object-contain object-bottom"
          showPlaceholderGuide={false}
        />
      </div>
      <span className="text-xs font-medium text-zinc-800">{label}</span>
    </button>
  );
}

export function ModelPanel({
  gender,
  heightCm,
  weightKg,
  suggestedSize,
  isBusy,
  hasDesign,
  onGenderChange,
  onHeightChange,
  onWeightChange,
  onUpdateBody,
  onSubmit,
  submitLabel = "確認發送申請",
  designLocked = false,
}: {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  suggestedSize: SizeSuggestion;
  isBusy: boolean;
  hasDesign: boolean;
  designLocked?: boolean;
  onGenderChange: (gender: Gender) => void;
  onHeightChange: (height: number) => void;
  onWeightChange: (weight: number) => void;
  onUpdateBody: () => void;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const modelType = getModelType(gender);
  const activeChildGender =
    gender === "child-female" ? "child-female" : "child-male";

  const handleModelTypeChange = (type: ModelType) => {
    if (type === "male") {
      onGenderChange("male");
      return;
    }
    if (type === "female") {
      onGenderChange("female");
      return;
    }
    onGenderChange(
      gender === "child-female" ? "child-female" : "child-male",
    );
  };

  const modelChoices =
    modelType === "child"
      ? CHILD_MODEL_OPTIONS
      : ADULT_MODEL_OPTIONS[modelType];

  return (
    <aside
      data-layout-rail="checkout"
      data-drawer-panel
      className={`relative flex h-full min-h-0 shrink-0 flex-col border-l border-zinc-200 ${ds.surface.panel} ${ds.layout.infoRail}`}
    >
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-zinc-900">模特類型</h2>
          <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 p-1">
            {MODEL_TYPE_OPTIONS.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleModelTypeChange(type.id)}
                className={`rounded-md px-1 py-1.5 text-[11px] font-medium transition-colors ${
                  modelType === type.id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <h2 className="mb-2 text-sm font-semibold text-zinc-900">模特選擇</h2>
          <div
            className={
              modelType === "child" ? "grid grid-cols-2 gap-2" : "grid gap-2"
            }
          >
            {modelChoices.map((model) => (
              <ModelChoiceCard
                key={model.id}
                gender={model.id}
                label={model.label}
                preview={model.preview}
                selected={gender === model.id}
                onClick={() => onGenderChange(model.id)}
              />
            ))}
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
