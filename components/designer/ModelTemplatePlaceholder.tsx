"use client";

import { TEMPLATES, type Gender, type Side } from "@/lib/constants";
import {
  DEFAULT_PRINT_MODE,
  getUiPrintAreaContainerStyle,
} from "@/lib/printArea";
import { ShirtContainerFrame } from "./ShirtContainerFrame";
import { ShirtVisualScale } from "./ShirtVisualScale";

function templateFileName(gender: Gender, side: Side): string {
  return TEMPLATES[gender][side].split("/").pop() ?? "template.png";
}

/** 模特 PNG 尚未放入時的對位佔位圖 */
export function ModelTemplatePlaceholder({
  gender,
  side,
  className = "",
  showGuide = true,
}: {
  gender: Gender;
  side: Side;
  className?: string;
  showGuide?: boolean;
}) {
  const fileName = templateFileName(gender, side);
  const printAreaStyle = getUiPrintAreaContainerStyle("model", side, {
    mode: DEFAULT_PRINT_MODE,
    size: "M",
  });

  const label =
    gender === "male"
      ? "成人男"
      : gender === "female"
        ? "成人女"
        : gender === "child-male"
          ? "孩童男"
          : "孩童女";

  return (
    <div className={className}>
      <ShirtContainerFrame width="100%">
        <ShirtVisualScale>
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <rect width={100} height={100} fill="#f4f4f5" />
            <ellipse cx={50} cy={10} rx={9} ry={5} fill="#e4e4e7" />
            <path
              fill="#e4e4e7"
              stroke="#d4d4d8"
              strokeWidth="0.4"
              d="
                M 35 28 L 33 42 L 31 78 L 37 96 L 50 98 L 63 96
                L 69 78 L 67 42 L 65 28 L 57 24 L 50 22 L 43 24 Z
              "
            />
          </svg>
        </ShirtVisualScale>
        {showGuide && (
          <div
            data-print-area
            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
            style={printAreaStyle}
          />
        )}
      </ShirtContainerFrame>

      <div className="pointer-events-none bg-white/90 px-2 py-2 text-center">
        <p className="text-[10px] font-semibold text-zinc-700">
          模板待放入 · {label} · {side === "front" ? "正面" : "背面"}
        </p>
        <p className="mt-0.5 font-mono text-[9px] text-zinc-500">{fileName}</p>
      </div>
    </div>
  );
}
