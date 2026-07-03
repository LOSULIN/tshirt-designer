"use client";

import {
  getShirtColorName,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import { DEFAULT_PRINT_MODE, type PreviewPrintPositionMode } from "@/lib/printArea";
import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import type { DesignLayer } from "@/lib/types";
import { ds } from "./design-ui";
import { FlatShirtDesignView } from "./FlatShirtDesignView";
import { getPrintStatusBadgeView } from "./print-status-badge-ui";

function MagnifyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`${ds.icon.sm} ${className}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="6.75" cy="6.75" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.25 10.25L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 右側 T-shirt 視覺預覽（僅圖形，不含數據） */
export function ClothingBrowsePanel({
  gender,
  side,
  shirtColor,
  size,
  layers,
  printStatus,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  onExpand,
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: Size;
  layers: DesignLayer[];
  printStatus?: GarmentPrintStatus;
  previewPrintPositionMode?: PreviewPrintPositionMode;
  onExpand: () => void;
}) {
  const hasDesign = layers.length > 0;
  const colorName = getShirtColorName(shirtColor);
  const sideLabel = side === "front" ? "正面" : "背面";
  const statusBadge = printStatus ? getPrintStatusBadgeView(printStatus) : null;

  return (
    <aside
      data-layout-rail="preview"
      data-drawer-panel
      className={`relative z-20 flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-x border-zinc-200 ${ds.surface.panel} ${ds.layout.previewRail}`}
      aria-label="成品預覽"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${ds.space.gap4} ${ds.space.p4}`}>
        <div
          className={`flex min-h-0 flex-1 flex-col ${ds.surface.preview} ${ds.space.p4} ${ds.radius.preview} ${ds.shadow.previewLg} ${ds.motion.shadow}`}
        >
          <header className="shrink-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className={ds.type.cardTitle}>成品預覽</h3>
              {statusBadge && hasDesign ? (
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${ds.type.helper} ${statusBadge.className}`}
                  role="status"
                >
                  <span aria-hidden>{statusBadge.icon}</span>
                  <span>{statusBadge.label}</span>
                </span>
              ) : null}
            </div>
            <p className={ds.type.helper}>
              {colorName}｜{size}｜{sideLabel}
            </p>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center py-4">
            {hasDesign ? (
              <div
                className={`aspect-[2/3] w-full max-h-[15rem] max-w-[11rem] overflow-hidden ${ds.radius.preview}`}
              >
                <FlatShirtDesignView
                  gender={gender}
                  side={side}
                  shirtColor={shirtColor}
                  size={size}
                  layers={layers}
                  previewPrintPositionMode={previewPrintPositionMode}
                  compact
                />
              </div>
            ) : (
              <div
                className={`flex aspect-[2/3] w-full max-h-[15rem] max-w-[11rem] flex-col items-center justify-center gap-3 px-4 py-8 text-center`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl text-zinc-400 ${ds.shadow.card}`}
                >
                  👕
                </div>
                <div className="space-y-1">
                  <p className={`font-semibold text-zinc-700 ${ds.type.cardTitle}`}>
                    尚無設計
                  </p>
                  <p className={`leading-relaxed ${ds.type.helper}`}>
                    上傳圖片後即可預覽成品
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            title="查看完整預覽（正面與背面）"
            onClick={onExpand}
            className={`mt-auto flex w-full shrink-0 items-center justify-center gap-2 ${ds.button.secondary}`}
          >
            <MagnifyIcon />
            查看完整預覽
          </button>
        </div>
      </div>
    </aside>
  );
}
