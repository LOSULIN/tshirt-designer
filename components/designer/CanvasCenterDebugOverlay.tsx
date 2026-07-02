"use client";

import { useMemo } from "react";
import type { Side, Size } from "@/lib/constants";
import { getGarmentPrintMetrics } from "@/lib/coordinates/garment";
import {
  getPreviewPrintReference,
  PREVIEW_CONTAINER,
  type PreviewPrintPositionMode,
} from "@/lib/coordinates/preview";
import { resolvePreviewPrintPositionMode } from "@/lib/printArea";
import { getShirtScale } from "@/lib/shirtScale";

const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";

interface CenterMarker {
  id: string;
  label: string;
  color: string;
  xPct: number;
  yPct: number;
  detail: string;
  dasharray?: string;
}

function CrosshairLines({
  xPct,
  yPct,
  color,
  dasharray,
}: {
  xPct: number;
  yPct: number;
  color: string;
  dasharray?: string;
}) {
  return (
    <>
      <line
        x1={xPct}
        y1={0}
        x2={xPct}
        y2={100}
        stroke={color}
        strokeWidth={0.22}
        strokeDasharray={dasharray}
        opacity={0.95}
      />
      <line
        x1={0}
        y1={yPct}
        x2={100}
        y2={yPct}
        stroke={color}
        strokeWidth={0.22}
        strokeDasharray={dasharray}
        opacity={0.95}
      />
      <circle
        cx={xPct}
        cy={yPct}
        r={0.55}
        fill="none"
        stroke={color}
        strokeWidth={0.2}
      />
      <circle cx={xPct} cy={yPct} r={0.18} fill={color} />
    </>
  );
}

/**
 * @temporary 中心點十字線 — 僅讀取既有座標，不修改定位邏輯。
 */
export function CanvasCenterDebugOverlay({
  side,
  size,
  previewPrintPositionMode,
}: {
  side: Side;
  size: Size;
  previewPrintPositionMode?: PreviewPrintPositionMode;
}) {
  const markers = useMemo((): CenterMarker[] => {
    const mode = resolvePreviewPrintPositionMode(previewPrintPositionMode);
    const printRef = getPreviewPrintReference(side, { mode, size });
    const metrics = getGarmentPrintMetrics({ side, size });
    const garmentScale = getShirtScale(size);
    const containerCenterX = PREVIEW_CONTAINER.width / 2;
    const containerCenterY = PREVIEW_CONTAINER.height / 2;

    return [
      {
        id: "template",
        label: "Template image",
        color: "#0ea5e9",
        xPct: 50,
        yPct: 50,
        detail: `(${containerCenterX}, ${containerCenterY}) px · object-contain center`,
      },
      {
        id: "shirt-visual",
        label: "Shirt visual",
        color: "#d946ef",
        xPct: 50,
        yPct: 50,
        detail: `scale ${garmentScale.toFixed(3)} · transform-origin center`,
        dasharray: "0.5 0.35",
      },
      {
        id: "print-area",
        label: "Print area",
        color: "#22c55e",
        xPct: printRef.x * 100,
        yPct: printRef.y * 100,
        detail: `(${printRef.x * PREVIEW_CONTAINER.width}, ${metrics.printCenterPx.toFixed(1)}) px · ref (${printRef.x.toFixed(4)}, ${printRef.y.toFixed(4)})`,
      },
    ];
  }, [side, size, previewPrintPositionMode]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[40]"
      data-canvas-center-debug
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {markers.map((marker) => (
          <g key={marker.id}>
            <CrosshairLines
              xPct={marker.xPct}
              yPct={marker.yPct}
              color={marker.color}
              dasharray={marker.dasharray}
            />
            <text
              x={Math.min(marker.xPct + 1.2, 72)}
              y={Math.max(marker.yPct - 1.2, 3)}
              fill={marker.color}
              fontSize={1.7}
              fontFamily={FONT}
            >
              {marker.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-2 left-2 max-w-[min(100%,300px)] rounded-md border border-zinc-800/20 bg-black/75 px-2.5 py-2 text-[10px] leading-relaxed text-zinc-200 shadow-lg backdrop-blur-sm">
        <p className="mb-1 font-semibold text-white">Center Debug</p>
        {markers.map((marker) => (
          <p key={marker.id} style={{ color: marker.color }}>
            <span className="font-medium">{marker.label}</span>{" "}
            <span className="text-zinc-400">
              {marker.xPct.toFixed(1)}%, {marker.yPct.toFixed(1)}%
            </span>
            <br />
            <span className="text-zinc-500">{marker.detail}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
