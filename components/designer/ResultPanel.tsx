"use client";

import { memo, useMemo } from "react";
import {
  getShirtColorName,
  type Gender,
  type ShirtColor,
  type Side,
  type Size,
} from "@/lib/constants";
import { createDesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import { resolveExportPipelineContext } from "@/lib/designer-geometry-v2/export-pipeline-context";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";
import { DEFAULT_PRINT_MODE, type PreviewPrintPositionMode } from "@/lib/printArea";
import type { PrintAreaCmBounds } from "@/lib/design-cm";
import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";
import { formatGarmentPrintAreaCmPair } from "@/lib/garment-constraint-ux";
import type { DesignLayer } from "@/lib/types";
import { useResultPanelProductPreview } from "@/components/export/use-result-panel-product-preview";
import { ResultPanelDownloadSection } from "./ResultPanelDownloadSection";
import { ResultPanelProductPreview } from "./ResultPanelProductPreview";
import { ds } from "./design-ui";
import { getPrintStatusBadgeView } from "./print-status-badge-ui";
import { getResultPanelDpiView } from "./result-panel-dpi-ui";
import "./ResultPanelProductPreview.css";

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
    backLabel?: string;
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
    backLabel?: string;
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
    prev.backLabel === next.backLabel &&
    sectionsEqual(prev.sections, next.sections)
  );
}

export const ResultPanel = memo(function ResultPanel({
  side,
  shirtColor,
  size,
  previewLayers,
  printStatus,
  printBounds,
  isBusy,
  hasDesign,
  designLocked = false,
  onSubmit,
  onBack,
  submitLabel = "確認送出",
  backLabel = "返回修改",
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
  onBack?: () => void;
  submitLabel?: string;
  backLabel?: string;
  sections?: ResultPanelSection | ResultPanelSection[];
}) {
  const hasDesignContent = previewLayers.length > 0;
  const colorName = getShirtColorName(shirtColor);
  const sideLabel = side === "front" ? "正面" : "背面";
  const garmentBadge = printStatus ? getPrintStatusBadgeView(printStatus) : null;
  const printableSizeLabel = formatGarmentPrintAreaCmPair(printBounds);

  const coordinateContext = useMemo(
    () => createDesignerCoordinateContext(side, size),
    [side, size],
  );

  const dpiView = useMemo(
    () => getResultPanelDpiView(previewLayers, coordinateContext),
    [previewLayers, coordinateContext],
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

  const geometryRuntime = useGeometryRuntime();

  const exportInput = useMemo(() => {
    const geometryVersion = geometryRuntime.getEffectiveGeometryVersion("png");
    const pipelineContext = resolveExportPipelineContext({
      side,
      size,
      surface: "png",
      geometryVersion,
    });
    return {
      layers: previewLayers,
      side,
      size,
      shirtColor,
      geometryVersion,
      pipelineContext,
    };
  }, [
    previewLayers,
    side,
    size,
    shirtColor,
    geometryRuntime.geometryVersion,
    geometryRuntime.preview,
  ]);

  const needsExportPreview = hasDesignContent && (showPreview || showExport);
  const resultPanelPreview = useResultPanelProductPreview(exportInput, {
    enabled: needsExportPreview,
  });

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
          useBadge: true as const,
        };

  const showFooter = showPrint || (showExport && hasDesignContent) || showCta;

  return (
    <aside
      data-layout-rail="result"
      data-drawer-panel
      className={`result-panel relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-l border-zinc-200 ${ds.surface.panel} ${ds.layout.resultRail}`}
      aria-label="成品展示"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${ds.space.panel}`}>
        <div className="result-panel__card rounded-xl border border-zinc-200 bg-white shadow-sm">
          {showPreview ? (
            <div className="result-panel__hero">
              <header className="result-panel__hero-header">
                <h2 className="text-sm font-semibold leading-tight text-zinc-900">
                  商品預覽
                </h2>
                <p className="mt-0.5 text-xs leading-5 text-zinc-600">
                  {colorName}｜{size}｜{sideLabel}
                </p>
              </header>

              <div className="result-panel__hero-stage">
                {!hasDesignContent ? (
                  <div className="flex max-w-[92%] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-xl text-zinc-400 shadow-sm">
                      👕
                    </div>
                    <p className="text-sm font-semibold text-zinc-700">尚無設計</p>
                    <p className="text-xs leading-5 text-zinc-600">
                      上傳圖片後即可預覽商品圖
                    </p>
                  </div>
                ) : resultPanelPreview.loading ? (
                  <p className="text-xs text-zinc-500">商品圖產生中…</p>
                ) : resultPanelPreview.error ? (
                  <p className="px-4 text-center text-xs text-red-600">
                    {resultPanelPreview.error}
                  </p>
                ) : resultPanelPreview.preview?.productUrl ? (
                  <ResultPanelProductPreview
                    productUrl={resultPanelPreview.preview.productUrl}
                    side={side}
                    size={size}
                    previewLayers={previewLayers}
                    display={resultPanelPreview.preview.display}
                  />
                ) : (
                  <p className="text-xs text-zinc-500">尚無商品預覽</p>
                )}
              </div>
            </div>
          ) : null}

          {showFooter ? (
            <div className="result-panel__footer">
              {showPrint ? (
                <>
                  {showPreview ? <PanelDivider /> : null}
                  <section
                    className="result-panel__print-section"
                    aria-label="印刷資訊"
                  >
                    <p className="result-panel__print-label">印刷資訊</p>
                    <div className="result-panel__badge-row">
                      <span
                        className={`result-panel__badge tabular-nums ${dpiView.dpiClassName}`}
                      >
                        {dpiView.dpi} DPI
                      </span>
                      <span className="result-panel__badge tabular-nums text-zinc-700">
                        {printableSizeLabel} cm
                      </span>
                      <span
                        className={`result-panel__badge result-panel__badge--status ${statusLine.className}`}
                        role="status"
                      >
                        <span aria-hidden>{statusLine.icon}</span>
                        <span>{statusLine.label}</span>
                      </span>
                    </div>
                  </section>
                </>
              ) : null}

              {showExport && hasDesignContent ? (
                <>
                  <PanelDivider />
                  <ResultPanelDownloadSection
                    exportInput={exportInput}
                    disabled={isBusy || designLocked}
                    loading={resultPanelPreview.loading}
                    error={resultPanelPreview.error}
                  />
                </>
              ) : null}

              {showCta ? (
                <>
                  <PanelDivider />
                  <div className="result-panel__cta">
                    {onBack ? (
                      <button
                        type="button"
                        onClick={onBack}
                        disabled={isBusy}
                        className={`result-panel__cta-back ${ds.button.secondary}`}
                      >
                        {backLabel}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isBusy || !hasDesign || designLocked}
                      onClick={onSubmit}
                      className={`result-panel__cta-submit ${onBack ? "" : "w-full "} ${ds.button.primary}`}
                    >
                      {submitLabel}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}, areResultPanelPropsEqual);
