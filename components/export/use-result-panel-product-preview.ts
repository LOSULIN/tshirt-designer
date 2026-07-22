"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProductExportInput } from "@/lib/export/product-export";
import { buildResultPanelProductPreview } from "@/lib/result-panel/build-result-panel-product-preview";
import {
  isResultPanelDisplayPreview,
  type ResultPanelDisplayPreview,
} from "@/lib/result-panel/result-panel-display-preview";
import { revokeObjectUrl } from "@/lib/export/download";

function revokeResultPanelPreviewUrls(
  preview: ResultPanelDisplayPreview | null | undefined,
) {
  if (!preview) return;
  revokeObjectUrl(preview.artworkUrl);
  if (isResultPanelDisplayPreview(preview)) {
    revokeObjectUrl(preview.display.mockupArtworkUrl);
  }
}

/** ResultPanel hero preview — reality calibration display (export path unchanged). */
export function useResultPanelProductPreview(
  exportInput: ProductExportInput,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const { layers, shirtColor, side, size } = exportInput;
  const [preview, setPreview] = useState<ResultPanelDisplayPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPreview = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await buildResultPanelProductPreview(exportInput);
      setPreview((prev) => {
        revokeResultPanelPreviewUrls(prev);
        return next;
      });
    } catch (err) {
      setPreview((prev) => {
        revokeResultPanelPreviewUrls(prev);
        return null;
      });
      setError(err instanceof Error ? err.message : "預覽產生失敗");
    } finally {
      setLoading(false);
    }
  }, [enabled, exportInput, layers, shirtColor, side, size]);

  useEffect(() => {
    if (!enabled) return;
    void refreshPreview();
    return () => {
      setPreview((prev) => {
        revokeResultPanelPreviewUrls(prev);
        return null;
      });
    };
  }, [enabled, refreshPreview]);

  return { preview, loading, error, refreshPreview };
}
