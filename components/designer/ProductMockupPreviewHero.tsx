"use client";

import type { Size } from "@/lib/constants";
import { resolveGarmentStageStyles } from "@/lib/presentation/product-preview-camera";
import { ProductPreviewPresentation } from "./ProductPreviewPresentation";

export interface ProductMockupPreviewHeroProps {
  size: Size;
  hasDesignContent: boolean;
  loading: boolean;
  error: string | null;
  productUrl: string | null;
}

export function ProductMockupPreviewHero({
  size,
  hasDesignContent,
  loading,
  error,
  productUrl,
}: ProductMockupPreviewHeroProps) {
  const stageStyles = resolveGarmentStageStyles(size);

  return (
    <div
      className="hero-stage flex min-h-[min(72vh,36rem)] flex-1 items-center justify-center overflow-hidden bg-zinc-100 px-0 pt-0"
      style={stageStyles.stageStyle}
    >
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
      ) : loading ? (
        <p className="text-xs text-zinc-500">商品圖產生中…</p>
      ) : error ? (
        <p className="px-4 text-center text-xs text-red-600">{error}</p>
      ) : productUrl ? (
        <ProductPreviewPresentation productUrl={productUrl} size={size} />
      ) : (
        <p className="text-xs text-zinc-500">尚無商品預覽</p>
      )}
    </div>
  );
}
