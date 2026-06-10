"use client";

import { useState } from "react";
import {
  getAdultTshirtTemplateSrc,
  getShirtColorName,
  SHIRT_COLORS,
  type ShirtColor,
  type Side,
} from "@/lib/constants";
import {
  getFixedPrintAreaContainerPct,
  getFixedPrintAreaUiSize,
  getPrintAreaContainerStyle,
  getShirtContainerAspectRatio,
  PRINT_AREA,
  UI_SCALE,
} from "@/lib/printArea";
import { APPAREL_SIZES, type ApparelSize } from "@/lib/sizes";
import { PrintAreaTemplateOverlay } from "./PrintAreaTemplateOverlay";
import { getShirtScale } from "@/lib/shirtScale";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1] as const;

export function PrintAreaPreviewPanel() {
  const [side, setSide] = useState<Side>("front");
  const [shirtColor, setShirtColor] = useState<ShirtColor>("black");
  const [size, setSize] = useState<ApparelSize>("M");
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_STEPS[zoomIndex];

  const templateSrc = getAdultTshirtTemplateSrc(shirtColor, side);
  const printStyle = getPrintAreaContainerStyle(side);
  const { widthPct, heightPct } = getFixedPrintAreaContainerPct();
  const uiSize = getFixedPrintAreaUiSize();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          印刷區位置校驗
        </h1>
        <p className="text-sm text-zinc-600">
          Shirt container 固定 {getShirtContainerAspectRatio().replace(" / ", "×")}
          ；shirt scale={getShirtScale(size)} · 印刷區固定 {PRINT_AREA.widthCm}×
          {PRINT_AREA.heightCm} cm。
        </p>
        <p className="text-xs text-zinc-500">
          print area：{printStyle.width} × {printStyle.height} · ref=
          {printStyle.left},{printStyle.top} · {printStyle.transform}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-zinc-300 p-0.5">
          {(["front", "back"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                side === s
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {s === "front" ? "正面" : "背面"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          尺碼（驗證：shirt 變、框線不變）
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as ApparelSize)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {APPAREL_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          模板顏色
          <select
            value={shirtColor}
            onChange={(e) => setShirtColor(e.target.value as ShirtColor)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {SHIRT_COLORS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-600">縮放</span>
          <button
            type="button"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-40"
          >
            −
          </button>
          <span className="w-12 text-center text-sm font-medium text-zinc-800">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4">
        <ShirtContainerFrame
          className="mx-auto w-full max-w-md bg-white shadow-md transition-transform duration-200"
          width="100%"
          zoom={zoom}
        >
          <ShirtVisualScale size={size}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={templateSrc}
              alt={`${getShirtColorName(shirtColor)} T 恤${side === "front" ? "正面" : "背面"}`}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </ShirtVisualScale>
          <div
            data-print-area
            className="absolute border-2 border-dashed border-red-500/40"
            style={printStyle}
          />
          <PrintAreaTemplateOverlay size={size} side={side} />
        </ShirtContainerFrame>
      </div>

      <ul className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
        <li>
          Shirt：scale({getShirtScale(size)}) · container 外框固定
        </li>
        <li>
          Print area：{(widthPct * 100).toFixed(1)}% × {(heightPct * 100).toFixed(1)}%
          （{uiSize.width}×{uiSize.height} UI 單位 · cm×{UI_SCALE}）
        </li>
      </ul>
    </div>
  );
}
