"use client";

import type { CalibrationViewMetrics } from "@/lib/coordinates/mockup-calibration";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";

const VIEW_COLORS: Record<
  CalibrationViewMetrics["id"],
  { border: string; bg: string; anchor: string }
> = {
  editor_preview: {
    border: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    anchor: "#ea580c",
  },
  flat_shirt_preview: {
    border: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    anchor: "#2563eb",
  },
  flat_mockup: {
    border: "#16a34a",
    bg: "rgba(22,163,74,0.12)",
    anchor: "#15803d",
  },
  model_mockup: {
    border: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    anchor: "#7e22ce",
  },
};

function ShirtSilhouette() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <rect width={100} height={100} fill="#f4f4f5" />
      <path
        fill="#e4e4e7"
        stroke="#d4d4d8"
        strokeWidth="0.4"
        d="M 22 8 L 38 14 L 50 11 L 62 14 L 78 8 L 88 22 L 72 26 L 72 92 L 28 92 L 28 26 L 12 22 Z"
      />
    </svg>
  );
}

/** 校準用：固定 M 尺碼、僅顯示印刷區與錨點 */
export function MockupCalibrationFrame({
  view,
  showDelta = true,
}: {
  view: CalibrationViewMetrics;
  showDelta?: boolean;
}) {
  const colors = VIEW_COLORS[view.id];
  const { ref, rectPx, deltaFromEditorPx } = view;

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{view.label}</p>
        <p className="text-[10px] text-zinc-500">{view.subtitle}</p>
      </div>
      <ShirtContainerFrame width="100%">
        <ShirtVisualScale size="M">
          <ShirtSilhouette />
        </ShirtVisualScale>
        <div
          className="absolute border-2 border-dashed"
          style={{
            ...view.style,
            borderColor: colors.border,
            backgroundColor: colors.bg,
          }}
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={ref.x * 100}
            y1={0}
            x2={ref.x * 100}
            y2={100}
            stroke={colors.anchor}
            strokeWidth={0.15}
            strokeDasharray="0.5 0.4"
            opacity={0.85}
          />
          <line
            x1={0}
            y1={ref.y * 100}
            x2={100}
            y2={ref.y * 100}
            stroke={colors.anchor}
            strokeWidth={0.15}
            strokeDasharray="0.5 0.4"
            opacity={0.85}
          />
          <circle
            cx={ref.x * 100}
            cy={ref.y * 100}
            r={0.55}
            fill={colors.anchor}
          />
        </svg>
      </ShirtContainerFrame>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[10px] text-zinc-600">
        <dt>ref.y</dt>
        <dd>{ref.y.toFixed(6)}</dd>
        <dt>center Y</dt>
        <dd>{Math.round(rectPx.centerY)} px</dd>
        <dt>top</dt>
        <dd>{Math.round(rectPx.top)} px</dd>
        {showDelta && view.id !== "editor_preview" && (
          <>
            <dt>Δ vs Editor</dt>
            <dd
              className={
                deltaFromEditorPx.y === 0
                  ? "text-emerald-600"
                  : "font-semibold text-amber-700"
              }
            >
              Y {deltaFromEditorPx.y > 0 ? "+" : ""}
              {Math.round(deltaFromEditorPx.y)} px
            </dd>
          </>
        )}
      </dl>
    </div>
  );
}
