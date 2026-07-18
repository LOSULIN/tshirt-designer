"use client";

import { useCallback, useMemo, useState } from "react";
import type { Gender, ShirtColor, Side, Size } from "@/lib/constants";
import {
  exportAndDownloadDesignBundle,
  exportDesignBundle,
  hasExportableDesign,
  type DesignExportBundle,
} from "@/lib/design-export-system";
import { buildExportDebugReport } from "@/lib/export-debug";
import { formatPrintExportSpecLine } from "@/lib/print-export";
import type { DesignLayer } from "@/lib/types";

export function DesignExportModal({
  open,
  gender,
  side,
  shirtColor,
  size,
  layers,
  onClose,
}: {
  open: boolean;
  gender: Gender;
  side: Side;
  shirtColor: ShirtColor;
  size: Size;
  layers: DesignLayer[];
  onClose: () => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [printFormat, setPrintFormat] = useState<"png" | "pdf">("png");
  const [error, setError] = useState<string | null>(null);
  const [lastBundle, setLastBundle] = useState<DesignExportBundle | null>(null);

  const exportable = hasExportableDesign(layers);
  const sideLabel = side === "front" ? "正面" : "背面";
  const debugReport = useMemo(
    () => (exportable ? buildExportDebugReport(layers, side) : null),
    [exportable, layers, side],
  );

  const handleExport = useCallback(async () => {
    if (!exportable) return;
    setIsExporting(true);
    setError(null);
    try {
      const bundle = await exportAndDownloadDesignBundle({
        gender,
        side,
        shirtColor,
        size,
        layers,
        printFormat,
      });
      setLastBundle(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "匯出失敗");
    } finally {
      setIsExporting(false);
    }
  }, [exportable, gender, side, shirtColor, size, layers, printFormat]);

  const handlePreviewBundle = useCallback(async () => {
    if (!exportable) return;
    setIsExporting(true);
    setError(null);
    try {
      const bundle = await exportDesignBundle({
        gender,
        side,
        shirtColor,
        size,
        layers,
        printFormat,
      });
      setLastBundle(bundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "產生失敗");
    } finally {
      setIsExporting(false);
    }
  }, [exportable, gender, side, shirtColor, size, layers, printFormat]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="design-export-title"
      >
        <h3
          id="design-export-title"
          className="text-base font-semibold text-zinc-900"
        >
          校稿輸出
        </h3>
        <p className="mt-1 text-sm text-zinc-600">
          匯出目前「{sideLabel}」設計的三種校稿文件（依 cm 資料渲染，非螢幕截圖）。
        </p>

        <ul className="mt-4 space-y-2 text-sm text-zinc-800">
          <li className="flex gap-2">
            <span className="shrink-0 font-medium text-emerald-700">Mockup</span>
            <span>T-shirt 模板預覽圖（客戶確認用）</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-medium text-sky-700">Print</span>
            <span>
              Print Area Preview（校稿預覽）：全印刷區 @ 300 DPI，非工廠印刷檔
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 font-medium text-violet-700">Proof</span>
            <span>A4 PDF 尺碼與每元素 cm 明細</span>
          </li>
        </ul>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {formatPrintExportSpecLine(gender, side)}
        </div>

        {debugReport && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <p className="font-medium">匯出尺寸除錯</p>
            <p className="mt-1">
              Export：{debugReport.exportWidthPx}×{debugReport.exportHeightPx}{" "}
              px · DPI {debugReport.dpi}
            </p>
            <ul className="mt-2 space-y-1.5">
              {debugReport.objects.map((obj) => (
                <li key={obj.layerId}>
                  <span className="font-medium">{obj.label}</span>
                  <span className="ml-1 text-amber-900/80">
                    Width {obj.widthCm} cm · Height {obj.heightCm} cm →{" "}
                    {obj.exportWidthPx}×{obj.exportHeightPx} px
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-medium text-zinc-700">
            Print Area Preview 格式（校稿用）
          </p>
          <div className="mt-1.5 flex gap-2">
            {(["png", "pdf"] as const).map((format) => (
              <button
                key={format}
                type="button"
                disabled={isExporting}
                onClick={() => setPrintFormat(format)}
                className={`rounded-md border px-3 py-1 text-xs font-medium uppercase ${
                  printFormat === format
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </div>

        {!exportable && (
          <p className="mt-4 text-sm text-amber-800">
            此面向尚無可輸出的設計內容，請先上傳圖片或新增文字。
          </p>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {lastBundle && !error && (
          <p className="mt-4 text-xs text-zinc-500">
            已產生：{lastBundle.mockup.filename}、{lastBundle.print.filename}、
            {lastBundle.proof.filename}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            關閉
          </button>
          <button
            type="button"
            disabled={!exportable || isExporting}
            onClick={() => void handlePreviewBundle()}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isExporting ? "處理中…" : "僅產生"}
          </button>
          <button
            type="button"
            disabled={!exportable || isExporting}
            onClick={() => void handleExport()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isExporting ? "匯出中…" : "匯出全部"}
          </button>
        </div>
      </div>
    </div>
  );
}
