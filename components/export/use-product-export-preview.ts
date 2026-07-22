"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildProductExportPreview,
  type ProductExportInput,
  type ProductExportPreview,
} from "@/lib/export/product-export";
import { revokeObjectUrl } from "@/lib/export/download";

export function useProductExportPreview(
  exportInput: ProductExportInput,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;
  const { layers, shirtColor, side, size } = exportInput;
  const [preview, setPreview] = useState<ProductExportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPreview = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await buildProductExportPreview(exportInput);
      setPreview((prev) => {
        if (prev?.artworkUrl) revokeObjectUrl(prev.artworkUrl);
        return next;
      });
    } catch (err) {
      setPreview((prev) => {
        if (prev?.artworkUrl) revokeObjectUrl(prev.artworkUrl);
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
        if (prev?.artworkUrl) revokeObjectUrl(prev.artworkUrl);
        return null;
      });
    };
  }, [enabled, refreshPreview]);

  return { preview, loading, error, refreshPreview };
}
