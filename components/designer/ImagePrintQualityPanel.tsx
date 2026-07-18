"use client";

import { useMemo } from "react";
import { createDesignerCoordinateContext } from "@/lib/designer-coordinate-facade";
import {
  getRasterMaxPrintSizeCm,
  isAtRasterPrintMaxSize,
  RASTER_PRINT_SIZE_A3_CM,
  RASTER_PRINT_SIZE_A4_CM,
} from "@/lib/image-print-quality";
import { getImageLayerDesignerPrintQuality } from "@/lib/image-print-quality-ui";
import { getImageLayerPrintReady } from "@/lib/print-ready";
import type { Side } from "@/lib/constants";
import type { ImageDesignLayer } from "@/lib/types";
import { PrintReadyFactoryCheck } from "./PrintReadyFactoryCheck";

/** Inspector 補充：Print Ready 工廠檢查 + 最大可印尺寸提醒 */
export function ImagePrintQualityPanel({
  layer,
  side,
  size,
  largePrintMode,
}: {
  layer: ImageDesignLayer;
  side: Side;
  size: string;
  largePrintMode: boolean;
}) {
  const coordinateContext = useMemo(
    () => createDesignerCoordinateContext(side, size),
    [side, size],
  );
  const printReady = useMemo(() => {
    const quality = getImageLayerDesignerPrintQuality(layer, coordinateContext);
    return getImageLayerPrintReady(
      layer,
      quality.designerWidthCm,
      quality.designerHeightCm,
    );
  }, [layer, coordinateContext]);

  const atMax = isAtRasterPrintMaxSize(layer, largePrintMode);
  const max = getRasterMaxPrintSizeCm(largePrintMode);

  return (
    <div className="space-y-1.5 border-t border-zinc-200 pt-1.5">
      <PrintReadyFactoryCheck printReady={printReady} compact />

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
