"use client";

import { useMemo } from "react";
import type { Side, Size } from "@/lib/constants";
import { getLayerEffectiveCmRect } from "@/lib/design-cm";
import {
  buildPlacementPresetCalibrationReport,
  getPlacementPresetTemplateCanvasPx,
  getPlacementPresetTemplatePxPerCm,
} from "@/lib/placement-presets";
import type { DesignLayer } from "@/lib/types";

function Row({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_1fr_auto] gap-1 text-[10px] leading-snug">
      <span className="text-zinc-500">{label}</span>
      <span className="font-mono tabular-nums text-zinc-800">{value}</span>
      {ok != null && (
        <span className={ok ? "text-emerald-600" : "text-amber-600"}>
          {ok ? "OK" : "!"}
        </span>
      )}
    </div>
  );
}

export function PlacementPresetCalibrationPanel({
  side,
  size,
  selectedLayer,
}: {
  side: Side;
  size: Size;
  selectedLayer?: DesignLayer | null;
}) {
  const pxPerCm = getPlacementPresetTemplatePxPerCm();
  const canvas = getPlacementPresetTemplateCanvasPx();
  const rows = useMemo(
    () => buildPlacementPresetCalibrationReport(side),
    [side],
  );
  const layerRect = selectedLayer
    ? getLayerEffectiveCmRect(selectedLayer)
    : null;

  const allOk = rows.every((row) => row.positionOk);

  return (
    <div
      className="shrink-0 border-b border-zinc-200 bg-zinc-900 px-3 py-2 text-zinc-100"
      data-placement-preset-calibration
      aria-label="版型校正檢查"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
          版型校正 · {side === "front" ? "正面" : "背面"} · {size}
        </p>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
            allOk ? "bg-emerald-900/60 text-emerald-300" : "bg-amber-900/60 text-amber-300"
          }`}
        >
          {allOk ? "位置符合" : "請檢查"}
        </span>
      </div>

      <Row
        label="Template"
        value={`${canvas.widthPx}×${canvas.heightPx} px · ${pxPerCm} px/cm`}
      />

      {rows.map((row) => (
        <div
          key={row.id}
          className="mt-2 border-t border-zinc-700/80 pt-2 first:mt-0 first:border-t-0 first:pt-0"
        >
          <p className="mb-1 text-[10px] font-medium text-zinc-200">
            {row.label}
          </p>
          <Row
            label="Template cm"
            value={`${row.templateCm.widthCm} × ${row.templateCm.heightCm} cm`}
            ok={row.positionOk}
          />
          <Row
            label="Canvas px"
            value={`${row.canvasPx.widthPx} × ${row.canvasPx.heightPx} px`}
          />
          <Row
            label="Anchor X/Y"
            value={`${row.position.anchorX_cm}, ${row.position.anchorY_cm} cm`}
          />
          <Row
            label="左上 X/Y"
            value={`${row.position.x_cm}, ${row.position.y_cm} cm`}
          />
          <Row
            label="領口→上緣"
            value={`${row.collarToTopCm} cm`}
            ok={row.positionOk}
          />
        </div>
      ))}

      {layerRect && (
        <div className="mt-2 border-t border-zinc-700 pt-2">
          <p className="mb-1 text-[10px] font-medium text-sky-300">
            目前選取圖層
          </p>
          <Row
            label="尺寸 cm"
            value={`${layerRect.width_cm.toFixed(1)} × ${layerRect.height_cm.toFixed(1)} cm`}
          />
          <Row
            label="Canvas px"
            value={`${(layerRect.width_cm * pxPerCm).toFixed(1)} × ${(layerRect.height_cm * pxPerCm).toFixed(1)} px`}
          />
          <Row
            label="位置 X/Y"
            value={`${layerRect.x_cm.toFixed(1)}, ${layerRect.y_cm.toFixed(1)} cm`}
          />
        </div>
      )}
    </div>
  );
}
