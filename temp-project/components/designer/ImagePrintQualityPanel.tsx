"use client";

import {
  analyzeImagePrintQuality,
  getRasterMaxPrintSizeCm,
  isAtRasterPrintMaxSize,
  RASTER_PRINT_SIZE_A3_CM,
  RASTER_PRINT_SIZE_A4_CM,
} from "@/lib/image-print-quality";
import { formatInspectorDimensionDisplay } from "@/lib/inspector-sync";
import type { ImageDesignLayer } from "@/lib/types";

export function ImagePrintQualityPanel({
  layer,
  largePrintMode,
}: {
  layer: ImageDesignLayer;
  largePrintMode: boolean;
}) {
  const report = analyzeImagePrintQuality(layer);
  const atMax = isAtRasterPrintMaxSize(layer, largePrintMode);
  const max = getRasterMaxPrintSizeCm(largePrintMode);

  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        圖片資訊
      </p>

      <InfoLine
        label="圖片尺寸"
        value={`${report.imagePixelWidth} × ${report.imagePixelHeight} px`}
      />
      <InfoLine
        label="實際圖案"
        value={`${report.artworkPixelWidth} × ${report.artworkPixelHeight} px`}
      />
      <InfoLine
        label="目前印刷尺寸"
        value={`${formatInspectorDimensionDisplay(report.printWidth_cm)} × ${formatInspectorDimensionDisplay(report.printHeight_cm)} cm`}
      />
      <InfoLine label="目前解析度" value={`${report.dpi} DPI`} />

      <div className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] leading-relaxed">
        <p className="font-medium text-zinc-700">
          品質狀態：
          {report.meetsStandard ? (
            <span className="text-emerald-700"> 🟢 品質符合印刷需求</span>
          ) : (
            <span className="text-amber-700"> ⚠️ 圖片解析度不足</span>
          )}
        </p>
        {report.meetsStandard ? (
          <p className="mt-0.5 text-zinc-600">
            目前解析度：{report.dpi} DPI。此圖片可直接進行印刷。
          </p>
        ) : (
          <p className="mt-0.5 text-zinc-600">
            目前解析度：{report.dpi} DPI。建議縮小印刷尺寸，或更換高解析圖片以符合
            300 DPI 印刷標準。
          </p>
        )}
      </div>

      {atMax && (
        <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-900">
          <p className="font-medium">已達圖片最大建議尺寸</p>
          <p className="mt-0.5">
            A4：{RASTER_PRINT_SIZE_A4_CM.width_cm} ×{" "}
            {RASTER_PRINT_SIZE_A4_CM.height_cm} cm
            <br />
            A3：{RASTER_PRINT_SIZE_A3_CM.width_cm} ×{" "}
            {RASTER_PRINT_SIZE_A3_CM.height_cm} cm（大圖印刷模式）
          </p>
          <p className="mt-0.5">
            目前上限：{max.width_cm} × {max.height_cm} cm。若需更大尺寸，請使用向量檔（SVG
            / PDF / AI）。
          </p>
        </div>
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[10px] leading-tight">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="text-right font-mono tabular-nums text-zinc-800">{value}</span>
    </div>
  );
}
