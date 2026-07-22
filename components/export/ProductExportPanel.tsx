"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductExportButton } from "@/components/export/ProductExportButton";
import { ProductExportDialog } from "@/components/export/ProductExportDialog";
import type { ShirtColor, Side, Size } from "@/lib/constants";
import {
  buildProductExportPreview,
  downloadArtworkExport,
  downloadProductExport,
  type ProductExportInput,
  type ProductExportPreview,
} from "@/lib/export/product-export";
import { revokeObjectUrl } from "@/lib/export/download";
import type { DesignLayer } from "@/lib/types";

export interface ProductExportPanelProps {
  layers: DesignLayer[];
  side: Side;
  size: Size;
  shirtColor: ShirtColor;
  disabled?: boolean;
  /** Shared export preview from ResultPanel — avoids duplicate render. */
  preview?: ProductExportPreview | null;
  previewLoading?: boolean;
  previewError?: string | null;
}

export function ProductExportPanel({
  layers,
  side,
  size,
  shirtColor,
  disabled = false,
  preview: previewProp,
  previewLoading: previewLoadingProp,
  previewError: previewErrorProp,
}: ProductExportPanelProps) {
  const [preview, setPreview] = useState<ProductExportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"artwork" | "product" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const exportInput: ProductExportInput = {
    layers,
    side,
    size,
    shirtColor,
  };

  const usesExternalPreview =
    previewProp !== undefined ||
    previewLoadingProp !== undefined ||
    previewErrorProp !== undefined;

  const refreshPreview = useCallback(async () => {
    if (usesExternalPreview) return;
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
  }, [exportInput, layers, shirtColor, side, size, usesExternalPreview]);

  useEffect(() => {
    if (usesExternalPreview) return;
    void refreshPreview();
    return () => {
      setPreview((prev) => {
        if (prev?.artworkUrl) revokeObjectUrl(prev.artworkUrl);
        return null;
      });
    };
  }, [refreshPreview, usesExternalPreview]);

  const resolvedPreview = usesExternalPreview ? (previewProp ?? null) : preview;
  const resolvedLoading = usesExternalPreview
    ? (previewLoadingProp ?? false)
    : loading;
  const resolvedError = usesExternalPreview
    ? (previewErrorProp ?? null)
    : error;

  const handleDownloadArtwork = async () => {
    setDownloading("artwork");
    if (!usesExternalPreview) setError(null);
    try {
      await downloadArtworkExport(exportInput);
    } catch (err) {
      if (!usesExternalPreview) {
        setError(err instanceof Error ? err.message : "工廠 Artwork 下載失敗");
      }
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadProduct = async () => {
    setDownloading("product");
    if (!usesExternalPreview) setError(null);
    try {
      await downloadProductExport(exportInput);
    } catch (err) {
      if (!usesExternalPreview) {
        setError(err instanceof Error ? err.message : "商品圖下載失敗");
      }
    } finally {
      setDownloading(null);
    }
  };

  const displayError = resolvedError;

  return (
    <>
      <section className="w-full shrink-0 px-4 py-3" aria-label="匯出下載">
        {displayError ? (
          <p className="mb-2 text-xs text-red-600">{displayError}</p>
        ) : null}

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium leading-5 text-zinc-800">
              工廠 Artwork
            </p>
            <ProductExportButton
              label="下載 Artwork PNG"
              title="工廠印刷使用：依 Artwork 實際尺寸輸出，可直接用於 Illustrator / RIP"
              onClick={() => void handleDownloadArtwork()}
              disabled={disabled}
              loading={downloading === "artwork" || resolvedLoading}
            />
          </div>

          <div>
            <p className="text-xs font-medium leading-5 text-zinc-800">商品圖</p>
            <ProductExportButton
              label="下載商品圖 PNG"
              onClick={() => void handleDownloadProduct()}
              disabled={disabled}
              loading={downloading === "product" || resolvedLoading}
              variant="primary"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="mt-2 text-[10px] font-medium text-zinc-500 underline-offset-2 hover:text-zinc-700 hover:underline"
        >
          展開匯出視窗
        </button>
      </section>

      <ProductExportDialog
        open={dialogOpen}
        preview={resolvedPreview}
        loading={resolvedLoading || downloading !== null}
        error={displayError}
        onClose={() => setDialogOpen(false)}
        onDownloadArtwork={() => void handleDownloadArtwork()}
        onDownloadProduct={() => void handleDownloadProduct()}
      />
    </>
  );
}
