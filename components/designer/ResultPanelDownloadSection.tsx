"use client";

import { useState } from "react";
import {
  type ProductExportInput,
} from "@/lib/export/product-export";
import {
  downloadArtworkExportWithGeometryRuntime,
  downloadProductExportWithGeometryRuntime,
} from "@/lib/designer-geometry-v2/geometry-runtime-export";
import { useGeometryRuntime } from "@/lib/designer-geometry-v2/geometry-runtime-context";

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function ResultPanelDownloadSection({
  exportInput,
  disabled = false,
  loading = false,
  error,
}: {
  exportInput: ProductExportInput;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}) {
  const geometryRuntime = useGeometryRuntime();
  const [downloading, setDownloading] = useState<"artwork" | "product" | null>(
    null,
  );

  const handleDownloadArtwork = async () => {
    setDownloading("artwork");
    try {
      const version = geometryRuntime.getEffectiveGeometryVersion("png");
      await downloadArtworkExportWithGeometryRuntime(exportInput, version);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadProduct = async () => {
    setDownloading("product");
    try {
      const version = geometryRuntime.getEffectiveGeometryVersion("png");
      await downloadProductExportWithGeometryRuntime(exportInput, version);
    } finally {
      setDownloading(null);
    }
  };

  const isDisabled = disabled || loading || downloading !== null;

  return (
    <section className="result-panel__download-section" aria-label="下載">
      {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
      <p className="result-panel__download-label">下載</p>
      <div className="result-panel__download-row">
        <button
          type="button"
          className="result-panel__download-btn"
          title="工廠印刷使用：依 Artwork 實際尺寸輸出，可直接用於 Illustrator / RIP"
          disabled={isDisabled}
          onClick={() => void handleDownloadArtwork()}
        >
          <DownloadIcon />
          {downloading === "artwork" || loading ? "處理中…" : "Artwork PNG"}
        </button>
        <button
          type="button"
          className="result-panel__download-btn"
          disabled={isDisabled}
          onClick={() => void handleDownloadProduct()}
        >
          <DownloadIcon />
          {downloading === "product" || loading ? "處理中…" : "商品圖 PNG"}
        </button>
      </div>
    </section>
  );
}
