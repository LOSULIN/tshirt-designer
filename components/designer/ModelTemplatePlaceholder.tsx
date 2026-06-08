"use client";

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TEMPLATES,
  type Gender,
  type Side,
} from "@/lib/constants";
import { getPrintAreaForGender } from "@/lib/print-area";

function templateFileName(gender: Gender, side: Side): string {
  return TEMPLATES[gender][side].split("/").pop() ?? "template.png";
}

/** 模特 PNG 尚未放入時的對位佔位圖（含印刷區標示） */
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
  const printArea = getPrintAreaForGender(gender);
  const printLeft = (printArea.x / CANVAS_WIDTH) * 100;
  const printTop = (printArea.y / CANVAS_HEIGHT) * 100;
  const printWidth = (printArea.width / CANVAS_WIDTH) * 100;
  const printHeight = (printArea.height / CANVAS_HEIGHT) * 100;

  const label =
    gender === "male"
      ? "成人男"
      : gender === "female"
        ? "成人女"
        : gender === "child-male"
          ? "孩童男"
          : "孩童女";

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-b from-zinc-100 to-zinc-200 ${className}`}
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        className="h-full w-full"
        aria-hidden
      >
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#f4f4f5" />
        <ellipse
          cx={CANVAS_WIDTH / 2}
          cy={CANVAS_HEIGHT * 0.1}
          rx={CANVAS_WIDTH * 0.09}
          ry={CANVAS_HEIGHT * 0.05}
          fill="#e4e4e7"
        />
        <path
          fill="#e4e4e7"
          stroke="#d4d4d8"
          strokeWidth="2"
          d="
            M 360 280
            L 340 420
            L 320 900
            L 380 1180
            L 500 1220
            L 640 1180
            L 700 900
            L 680 420
            L 660 280
            L 580 240
            L 512 220
            L 440 240
            Z
          "
        />
        <path
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="2"
          d="M 300 360 L 220 400 L 200 520 L 240 560 M 724 360 L 804 400 L 824 520 L 784 560"
        />
        {showGuide && (
          <rect
            x={printArea.x}
            y={printArea.y}
            width={printArea.width}
            height={printArea.height}
            fill="rgba(59,130,246,0.08)"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="8 6"
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-white/90 px-2 py-2 text-center">
        <p className="text-[10px] font-semibold text-zinc-700">
          模板待放入 · {label} · {side === "front" ? "正面" : "背面"}
        </p>
        <p className="mt-0.5 font-mono text-[9px] text-zinc-500">{fileName}</p>
        <p className="mt-0.5 text-[9px] text-zinc-400">
          1024×1536 · 藍框為印刷區
        </p>
      </div>
    </div>
  );
}
