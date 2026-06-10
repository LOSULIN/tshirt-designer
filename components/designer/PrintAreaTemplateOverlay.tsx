"use client";

import { ADULT_UNISEX_PRINT_SPEC } from "@/lib/print-area";
import {
  getPrintAreaContainerStyle,
  PRINT_REFERENCE,
} from "@/lib/printArea";
import type { ApparelSize } from "@/lib/sizes";
import type { Side } from "@/lib/constants";

const FONT = "system-ui, -apple-system, sans-serif";

/** 印刷區標示（cm 推算，僅 overlay；不影響 shirt container） */
export function PrintAreaTemplateOverlay({
  size,
  side,
  showReferenceAnchor = true,
  showScaleInfo = true,
}: {
  size: ApparelSize;
  side: Side;
  showReferenceAnchor?: boolean;
  showScaleInfo?: boolean;
}) {
  const containerStyle = getPrintAreaContainerStyle(side);
  const boxWidth = parseFloat(containerStyle.width);
  const boxHeight = parseFloat(containerStyle.height);
  const centerX = PRINT_REFERENCE.x * 100;
  const centerY = PRINT_REFERENCE.y * 100;
  const boxLeft = centerX - boxWidth / 2;
  const boxTop = centerY - boxHeight / 2;

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <line
        x1={centerX}
        y1={0}
        x2={centerX}
        y2={100}
        stroke="#ef4444"
        strokeWidth={0.15}
        strokeDasharray="0.8 0.5"
        opacity={0.85}
      />

      {showReferenceAnchor && (
        <>
          <line
            x1={8}
            y1={centerY}
            x2={92}
            y2={centerY}
            stroke="#f97316"
            strokeWidth={0.2}
            strokeDasharray="0.4 0.3"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={0.5}
            fill="#f97316"
            opacity={0.9}
          />
          <text
            x={centerX + 1.2}
            y={centerY - 0.8}
            fill="#c2410c"
            fontSize={1.2}
            fontFamily={FONT}
            fontWeight={600}
            dominantBaseline="middle"
          >
            ref ({PRINT_REFERENCE.x}, {PRINT_REFERENCE.y})
          </text>
        </>
      )}

      <rect
        x={boxLeft}
        y={boxTop}
        width={boxWidth}
        height={boxHeight}
        fill="rgba(239, 68, 68, 0.08)"
        stroke="#ef4444"
        strokeWidth={0.25}
      />

      <text
        x={centerX}
        y={boxTop + boxHeight / 2}
        fill="#dc2626"
        fontSize={1.8}
        fontFamily={FONT}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {size} · {ADULT_UNISEX_PRINT_SPEC.printWidthCm}×
        {ADULT_UNISEX_PRINT_SPEC.printHeightCm} cm
      </text>

      {showScaleInfo && (
        <text
          x={boxLeft + 0.6}
          y={boxTop + 1.6}
          fill="#7f1d1d"
          fontSize={1}
          fontFamily="ui-monospace, monospace"
        >
          {containerStyle.width} × {containerStyle.height}
        </text>
      )}
    </svg>
  );
}
