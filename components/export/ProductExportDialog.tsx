"use client";

import { ProductExportButton } from "@/components/export/ProductExportButton";
import { ProductRenderPreview } from "@/components/export/ProductRenderPreview";
import type { ProductExportPreview } from "@/lib/export/product-export";

export interface ProductExportDialogProps {
  open: boolean;
  preview: ProductExportPreview | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onDownloadArtwork: () => void;
  onDownloadProduct: () => void;
}

export function ProductExportDialog({
  open,
  preview,
  loading = false,
  error,
  onClose,
  onDownloadArtwork,
  onDownloadProduct,
}: ProductExportDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-export-dialog-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-lg"
      >
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2
              id="product-export-dialog-title"
              className="text-sm font-semibold text-zinc-900"
            >
              商品圖匯出
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              工廠 Artwork（印刷尺寸）與商品圖預覽
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            關閉
          </button>
        </header>

        <ProductRenderPreview
          artworkUrl={preview?.artworkUrl}
          productUrl={preview?.productUrl}
          artworkLabel="工廠 Artwork"
          productLabel="商品圖"
        />

        {preview ? (
          <p className="mt-2 text-[10px] text-zinc-500">
            {preview.artworkFileName} · {preview.productFileName}
          </p>
        ) : null}

        {error ? (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        ) : null}

        <div className="mt-3 flex gap-2">
          <ProductExportButton
            label="下載工廠 Artwork"
            title="工廠印刷使用：依 Artwork 實際尺寸輸出，可直接用於 Illustrator / RIP"
            onClick={onDownloadArtwork}
            loading={loading}
          />
          <ProductExportButton
            label="下載商品圖"
            onClick={onDownloadProduct}
            loading={loading}
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}
