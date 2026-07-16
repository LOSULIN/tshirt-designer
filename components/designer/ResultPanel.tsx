"use client";

import { memo, useMemo } from "react";
import {
  getShirtColorName,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import { DEFAULT_PRINT_MODE, type PreviewPrintPositionMode } from "@/lib/printArea";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";
import type { DesignLayer } from "@/lib/types";
import { ds } from "./design-ui";
import { FlatShirtDesignView } from "./FlatShirtDesignView";
import { getPrintStatusBadgeView } from "./print-status-badge-ui";
import { getResultPanelDpiView } from "./result-panel-dpi-ui";
import { ProductExportPanel } from "@/components/export/ProductExportPanel";

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

function PanelDivider() {
  return <div className="shrink-0 border-t border-zinc-200" role="separator" />;
}

export type ResultPanelSection = "preview" | "print" | "export" | "cta" | "all";

function sectionsEqual(
  a: ResultPanelSection | ResultPanelSection[] | undefined,
  b: ResultPanelSection | ResultPanelSection[] | undefined,
): boolean {
  if (a === b) return true;
  const normalize = (
    value: ResultPanelSection | ResultPanelSection[] | undefined,
  ) =>
    value === "all" || value == null
      ? ["preview", "print", "export", "cta"]
      : Array.isArray(value)
        ? value
        : [value];
  const left = normalize(a);
  const right = normalize(b);
  return (
    left.length === right.length && left.every((entry, index) => entry === right[index])
  );
}

function areResultPanelPropsEqual(
  prev: Readonly<{
    gender: Gender;
    side: Side;
    shirtColor: ShirtColor;
    size: Size;
    previewLayers: DesignLayer[];
    printStatus?: GarmentPrintStatus;
    printBounds: PrintAreaCmBounds;
    previewPrintPositionMode?: PreviewPrintPositionMode;
    isBusy: boolean;
    hasDesign: boolean;
    designLocked?: boolean;
    submitLabel?: string;
    sections?: ResultPanelSection | ResultPanelSection[];
  }>,
  next: Readonly<{
    gender: Gender;
    side: Side;
    shirtColor: ShirtColor;
    size: Size;
    previewLayers: DesignLayer[];
    printStatus?: GarmentPrintStatus;
    printBounds: PrintAreaCmBounds;
    previewPrintPositionMode?: PreviewPrintPositionMode;
    isBusy: boolean;
    hasDesign: boolean;
    designLocked?: boolean;
    submitLabel?: string;
    sections?: ResultPanelSection | ResultPanelSection[];
  }>,
): boolean {
  return (
    prev.previewLayers === next.previewLayers &&
    prev.gender === next.gender &&
    prev.side === next.side &&
    prev.shirtColor === next.shirtColor &&
    prev.size === next.size &&
    prev.printStatus === next.printStatus &&
    prev.printBounds === next.printBounds &&
    prev.previewPrintPositionMode === next.previewPrintPositionMode &&
    prev.isBusy === next.isBusy &&
    prev.hasDesign === next.hasDesign &&
    prev.designLocked === next.designLocked &&
    prev.submitLabel === next.submitLabel &&
    sectionsEqual(prev.sections, next.sections)
  );
}

export const ResultPanel = memo(function ResultPanel({
  gender,
  side,
  shirtColor,
  size,
  previewLayers,
  printStatus,
  printBounds,
  previewPrintPositionMode = DEFAULT_PRINT_MODE,
  isBusy,
  hasDesign,
  designLocked = false,
  onExpand,
  onSubmit,
  submitLabel = "確認送出",
  sections = "all",
}: {
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: Size;
  previewLayers: DesignLayer[];
  printStatus?: GarmentPrintStatus;
  printBounds: PrintAreaCmBounds;
  previewPrintPositionMode?: PreviewPrintPositionMode;
  isBusy: boolean;
  hasDesign: boolean;
  designLocked?: boolean;
  onExpand: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  sections?: ResultPanelSection | ResultPanelSection[];
}) {
  const hasDesignContent = previewLayers.length > 0;
  const colorName = getShirtColorName(shirtColor);
  const sideLabel = side === "front" ? "正面" : "背面";
  const garmentBadge = printStatus ? getPrintStatusBadgeView(printStatus) : null;
  const printableSizeLabel = formatGarmentPrintAreaCmPair(printBounds);

  const dpiView = useMemo(
    () => getResultPanelDpiView(previewLayers),
    [previewLayers],
  );

  const activeSections =
    sections === "all"
      ? ["preview", "print", "export", "cta"]
      : Array.isArray(sections)
        ? sections
        : [sections];
  const showPreview = activeSections.includes("preview");
  const showPrint = activeSections.includes("print");
  const showExport = activeSections.includes("export");
  const showCta = activeSections.includes("cta");

  const statusLine =
    hasDesignContent && garmentBadge && printStatus?.level !== "ok"
      ? {
          icon: garmentBadge.icon,
          label: garmentBadge.label,
          className: garmentBadge.className,
          useBadge: true as const,
        }
      : {
          icon: dpiView.statusIcon,
          label: dpiView.statusLabel,
          className: dpiView.statusClassName,
          useBadge: false as const,
        };

  return (
    <aside
      data-layout-rail="result"
      data-drawer-panel
      className={`relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-zinc-200 ${ds.surface.panel} ${ds.layout.resultRail}`}
      aria-label="成品展示"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${ds.space.panel}`}>
        <div
          className={`flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white shadow-sm`}
        >
          {showPreview ? (
            <div className="flex min-h-0 flex-[1_1_84%] flex-col">
              <header className="shrink-0 px-3 pb-1 pt-3">
                <h2 className="text-sm font-semibold leading-tight text-zinc-900">
                  成品預覽
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-zinc-600">
                  {colorName}｜{size}｜{sideLabel}
                </p>
              </header>

              <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-100 px-5 py-6">
                {hasDesignContent ? (
                  <div className="flex h-full w-full max-h-[90%] max-w-[92%] items-center justify-center">
                    <div className="h-full w-full [&_*]:object-contain">
                      <FlatShirtDesignView
                        gender={gender}
                        side={side}
                        shirtColor={shirtColor}
                        size={size}
                        previewLayers={previewLayers}
                        previewPrintPositionMode={previewPrintPositionMode}
                        compact
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex max-h-[90%] max-w-[92%] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl text-zinc-400 shadow-sm">
                      👕
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">尚無設計</p>
                    <p className="text-xs leading-5 text-zinc-600">
                      上傳圖片後即可預覽成品
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="flex shrink-0 flex-col items-start justify-start">
            {showPreview ? (
              <>
                <PanelDivider />
                <button
                  type="button"
                  title="查看完整預覽（正面與背面）"
                  onClick={onExpand}
                  className="flex w-full shrink-0 items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  <MagnifyIcon />
                  查看完整預覽
                </button>
              </>
            ) : null}

            {showPrint ? (
              <>
                <PanelDivider />
                <section
                  className="w-full shrink-0 items-start justify-start bg-transparent px-4 py-3 pb-3 min-h-[72px]"
                  aria-label="印刷資訊"
                >
                  <p className="text-xs leading-5 text-zinc-600">印刷資訊</p>
                  <div className="mt-1.5 flex flex-wrap items-start gap-3 text-xs font-medium leading-5">
                    <span className={`tabular-nums ${dpiView.dpiClassName}`}>
                      {dpiView.dpi} DPI
                    </span>
                    <span className="tabular-nums text-zinc-600">
                      {printableSizeLabel} cm
                    </span>
                    {statusLine.useBadge ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusLine.className}`}
                        role="status"
                      >
                        <span aria-hidden>{statusLine.icon}</span>
                        <span>{statusLine.label}</span>
                      </span>
                    ) : (
                      <span className={statusLine.className}>
                        <span aria-hidden>{statusLine.icon}</span>{" "}
                        <span>{statusLine.label}</span>
                      </span>
                    )}
                  </div>
                </section>
              </>
            ) : null}

            {showExport && hasDesignContent ? (
              <>
                <PanelDivider />
                <ProductExportPanel
                  layers={previewLayers}
                  side={side}
                  size={size}
                  shirtColor={shirtColor}
                  disabled={isBusy || designLocked}
                />
              </>
            ) : null}
          </div>

          {showCta ? (
            <>
              <PanelDivider />
              <div className="sticky bottom-0 z-10 mt-3 shrink-0 bg-white p-3 pt-0">
                <button
                  type="button"
                  disabled={isBusy || !hasDesign || designLocked}
                  onClick={onSubmit}
                  className={`w-full ${ds.button.primary}`}
                >
                  {submitLabel}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}, areResultPanelPropsEqual);
