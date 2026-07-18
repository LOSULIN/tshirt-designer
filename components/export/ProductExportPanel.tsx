"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductExportButton } from "@/components/export/ProductExportButton";
import { ProductExportDialog } from "@/components/export/ProductExportDialog";
import { ProductRenderPreview } from "@/components/export/ProductRenderPreview";
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
}

export function ProductExportPanel({
  layers,
  side,
  size,
  shirtColor,
  disabled = false,
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

  const refreshPreview = useCallback(async () => {
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
  }, [layers, shirtColor, side, size]);

  useEffect(() => {
    void refreshPreview();
    return () => {
      setPreview((prev) => {
        if (prev?.artworkUrl) revokeObjectUrl(prev.artworkUrl);
        return null;
      });
    };
  }, [refreshPreview]);

  const handleDownloadArtwork = async () => {
    setDownloading("artwork");
    setError(null);
    try {
      await downloadArtworkExport(exportInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "工廠 Artwork 下載失敗");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadProduct = async () => {
    setDownloading("product");
    setError(null);
    try {
      await downloadProductExport(exportInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "商品圖下載失敗");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <section className="w-full shrink-0 px-4 py-3" aria-label="商品圖匯出">
        <p className="text-xs leading-5 text-zinc-600">
          工廠印刷檔與商品預覽圖匯出
        </p>
        <div className="mt-2">
          <ProductRenderPreview
            artworkUrl={preview?.artworkUrl}
            productUrl={preview?.productUrl}
            artworkLabel="工廠 Artwork"
            productLabel="商品圖"
          />
        </div>
        {preview ? (
          <p className="mt-1.5 text-[10px] leading-4 text-zinc-500">
            {preview.artworkFileName} · {preview.productFileName}
          </p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        <div className="mt-2 flex gap-2">
          <ProductExportButton
            label="下載工廠 Artwork"
            title="工廠印刷使用：依 Artwork 實際尺寸輸出，可直接用於 Illustrator / RIP"
            onClick={() => void handleDownloadArtwork()}
            disabled={disabled}
            loading={downloading === "artwork" || loading}
          />
          <ProductExportButton
            label="下載商品圖"
            onClick={() => void handleDownloadProduct()}
            disabled={disabled}
            loading={downloading === "product" || loading}
            variant="primary"
          />
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
        preview={preview}
        loading={loading || downloading !== null}
        error={error}
        onClose={() => setDialogOpen(false)}
        onDownloadArtwork={() => void handleDownloadArtwork()}
        onDownloadProduct={() => void handleDownloadProduct()}
      />
    </>
  );
}
