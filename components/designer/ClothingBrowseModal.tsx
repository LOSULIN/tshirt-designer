"use client";

import { useState } from "react";
import {
  EXPORT_DPI,
  type Gender,
  type ShirtColor,
} from "@/lib/constants";
import { getExportDimensionsForGender } from "@/lib/print-area";
import { getLayersForSlot } from "@/lib/design-state";
import type { DesignLayersByTemplate } from "@/lib/types";
import { FlatShirtDesignView } from "./FlatShirtDesignView";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5];

export function ClothingBrowseModal({
  open,
  gender,
  shirtColor,
  layersByTemplate,
  onClose,
}: {
  open: boolean;
  gender: Gender;
  shirtColor: ShirtColor;
  layersByTemplate: DesignLayersByTemplate;
  onClose: () => void;
}) {
  const frontLayers = getLayersForSlot(layersByTemplate, gender, "front");
  const backLayers = getLayersForSlot(layersByTemplate, gender, "back");
  const exportDims = getExportDimensionsForGender(gender);
  const [zoomIndex, setZoomIndex] = useState(1);
  const zoom = ZOOM_STEPS[zoomIndex];

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
        aria-labelledby="clothing-browse-title"
        aria-modal="true"
      >
        <div className="shrink-0 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="clothing-browse-title"
                className="text-lg font-semibold text-zinc-900"
              >
                衣服瀏覽
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                純衣服設計畫面（正面與背面），不含模特，供設計校稿參考。
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
          <div
            className="mx-auto grid max-w-4xl grid-cols-1 gap-5 transition-transform duration-200 md:grid-cols-2"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <div>
              <h3 className="mb-2 text-center text-sm font-semibold text-zinc-800">
                正面
              </h3>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <FlatShirtDesignView
                  gender={gender}
                  side="front"
                  shirtColor={shirtColor}
                  layers={frontLayers}
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-center text-sm font-semibold text-zinc-800">
                背面
              </h3>
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <FlatShirtDesignView
                  gender={gender}
                  side="back"
                  shirtColor={shirtColor}
                  layers={backLayers}
                />
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            印刷規格：{exportDims.width}×{exportDims.height} px · {EXPORT_DPI} DPI
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-zinc-100 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[3rem] text-center text-xs text-zinc-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              onClick={() =>
                setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
              }
              className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 disabled:opacity-40"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
