"use client";

import { useMemo, useState } from "react";
import type { Side } from "@/lib/constants";
import {
  buildMockupCalibrationReport,
  formatCalibrationPx,
} from "@/lib/coordinates/mockup-calibration";
import { getPreviewPrintReference } from "@/lib/coordinates/preview";
import {
  getFlatMockupPrintReference,
  getModelMockupPrintReference,
} from "@/lib/coordinates/mockup";
import { UI_GLOBAL_PRINT_OFFSET_Y_PX } from "@/lib/coordinates/ui-print-offset";
import { MockupCalibrationFrame } from "./MockupCalibrationFrame";

export function MockupCalibrationPanel() {
  const [side, setSide] = useState<Side>("front");
  const report = useMemo(() => buildMockupCalibrationReport(side), [side]);
  const { beforeAfter, yOffsetAnalysis, views } = report;

  const editorView = views.find((v) => v.id === "editor_preview")!;
  const flatShirtView = views.find((v) => v.id === "flat_shirt_preview")!;
  const flatMockupView = views.find((v) => v.id === "flat_mockup")!;
  const modelView = views.find((v) => v.id === "model_mockup")!;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Mockup Calibration Mode
        </h1>
        <p className="text-sm text-zinc-600">
          架構 A（衣服縮放、印刷區固定）· 僅校準視覺預覽錨點，不影響 Production
          35×50 cm 或工廠匯出。
        </p>
        <p className="text-xs text-zinc-500">
          UI_GLOBAL_PRINT_OFFSET_Y_PX = {UI_GLOBAL_PRINT_OFFSET_Y_PX}（負值＝向上）·
          可加{" "}
          <code className="text-zinc-700">?mockupCalibration=1</code> 於設計器
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
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          1. printArea.y 校準（調整前後）
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-500">
                <th className="py-2 pr-4">狀態</th>
                <th className="py-2 pr-4">ref.y</th>
                <th className="py-2 pr-4">中心 Y (px)</th>
                <th className="py-2">top (px)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-zinc-800">
              <tr className="border-b border-zinc-50">
                <td className="py-2 pr-4 text-red-700">調整前</td>
                <td className="py-2 pr-4">{beforeAfter.before.refY}</td>
                <td className="py-2 pr-4">{Math.round(beforeAfter.before.centerYPx)}</td>
                <td className="py-2">{Math.round(beforeAfter.before.topPx)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-emerald-700">調整後（現況）</td>
                <td className="py-2 pr-4">{beforeAfter.after.refY.toFixed(6)}</td>
                <td className="py-2 pr-4">{Math.round(beforeAfter.after.centerYPx)}</td>
                <td className="py-2">{Math.round(beforeAfter.after.topPx)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-600">
          Δ center Y ={" "}
          <strong>{formatCalibrationPx(beforeAfter.deltaCenterYPx)} px</strong>
          （負值＝向上）· width / height / scale 未變
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          2. 三視圖比較（{side === "front" ? "正面" : "背面"}）
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MockupCalibrationFrame view={editorView} showDelta={false} />
          <MockupCalibrationFrame view={flatShirtView} />
          <MockupCalibrationFrame view={flatMockupView} />
          <MockupCalibrationFrame view={modelView} />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          3. Mockup Mapping Y 偏移分析
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-100 text-zinc-500">
                <th className="py-2 pr-4">比較</th>
                <th className="py-2 pr-4">Δ center Y (px)</th>
                <th className="py-2">說明</th>
              </tr>
            </thead>
            <tbody className="text-zinc-800">
              <tr className="border-b border-zinc-50">
                <td className="py-2 pr-4">Flat Shirt vs Editor</td>
                <td className="py-2 pr-4 font-mono">
                  {formatCalibrationPx(flatShirtView.deltaFromEditorPx.y)}
                </td>
                <td className="py-2 text-zinc-600">同 Preview 座標，應為 0</td>
              </tr>
              <tr className="border-b border-zinc-50">
                <td className="py-2 pr-4">Flat Mockup vs Editor</td>
                <td className="py-2 pr-4 font-mono">
                  {formatCalibrationPx(yOffsetAnalysis.flatMockupVsEditorPx)}
                </td>
                <td className="py-2 text-zinc-600">
                  Mockup flat ref.y={getFlatMockupPrintReference(side).y.toFixed(4)}
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Model Mockup vs Editor</td>
                <td className="py-2 pr-4 font-mono font-semibold text-amber-800">
                  {formatCalibrationPx(yOffsetAnalysis.modelMockupVsEditorPx)}
                </td>
                <td className="py-2 text-zinc-600">
                  Model ref.y={getModelMockupPrintReference(side).y.toFixed(4)} ·
                  Preview ref.y={getPreviewPrintReference(side).y.toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-950">
          <p className="font-semibold">建議後續校準（僅 Mockup model，不動 Production）</p>
          <p className="mt-1 font-mono">
            正面：MOCKUP_MODEL ref.y +={" "}
            {yOffsetAnalysis.suggestedModelRefYDelta.front.toFixed(6)}（≈{" "}
            {formatCalibrationPx(yOffsetAnalysis.modelMockupVsEditorFrontPx)} px）
          </p>
          <p className="font-mono">
            背面：MOCKUP_MODEL ref.y +={" "}
            {yOffsetAnalysis.suggestedModelRefYDelta.back.toFixed(6)}（≈{" "}
            {formatCalibrationPx(yOffsetAnalysis.modelMockupVsEditorBackPx)} px）
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-xs text-zinc-600">
        <p className="font-medium text-zinc-800">比對圖檔</p>
        <p className="mt-1">
          <code className="text-zinc-700">public/guides/mockup-calibration-comparison.svg</code>
        </p>
        <p className="mt-1">
          執行{" "}
          <code className="text-zinc-700">npm run generate:mockup-calibration</code>{" "}
          重新產生
        </p>
      </section>
    </div>
  );
}
