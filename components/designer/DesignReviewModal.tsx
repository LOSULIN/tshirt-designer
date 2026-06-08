"use client";

import {
  EXPORT_DPI,
  type Gender,
} from "@/lib/constants";
import { getLayersForSlot } from "@/lib/design-state";
import { getExportDimensionsForGender } from "@/lib/print-area";
import type { DesignLayersByTemplate } from "@/lib/types";
import { ModelDesignPreview } from "./ModelDesignPreview";

export function DesignReviewModal({
  open,
  gender,
  layersByTemplate,
  onClose,
}: {
  open: boolean;
  gender: Gender;
  layersByTemplate: DesignLayersByTemplate;
  onClose: () => void;
}) {
  const frontLayers = getLayersForSlot(layersByTemplate, gender, "front");
  const backLayers = getLayersForSlot(layersByTemplate, gender, "back");
  const exportDims = getExportDimensionsForGender(gender);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="design-review-title"
        aria-modal="true"
      >
        <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="design-review-title"
                className="text-lg font-semibold text-zinc-900"
              >
                設計瀏覽
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                請確認模特正面與背面設計效果，作為最終校稿參考。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              aria-label="關閉"
            >
              <span className="text-xl leading-none" aria-hidden>
                ×
              </span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-center text-sm font-semibold text-zinc-800">
                正面
              </h3>
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <ModelDesignPreview
                  gender={gender}
                  side="front"
                  layers={frontLayers}
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-center text-sm font-semibold text-zinc-800">
                背面
              </h3>
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                <ModelDesignPreview
                  gender={gender}
                  side="back"
                  layers={backLayers}
                />
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            印刷規格：{exportDims.width}×{exportDims.height} px · {EXPORT_DPI}{" "}
            DPI · 透明 PNG
          </p>
        </div>

        <div className="shrink-0 border-t border-zinc-100 px-5 py-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
