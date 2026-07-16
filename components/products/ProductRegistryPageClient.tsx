"use client";

import { useState } from "react";
import { ProductPreview } from "@/components/products/ProductPreview";
import { ProductSelector } from "@/components/products/ProductSelector";

export function ProductRegistryPageClient() {
  const [productCode, setProductCode] = useState("UA35001");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 lg:p-6">
      <header>
        <h1 className="text-xl font-semibold text-zinc-900">
          Product Platform RC-1
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Product Registry · Profile · Calibration · Assets
        </p>
      </header>
      <ProductSelector value={productCode} onChange={setProductCode} />
      <ProductPreview productCode={productCode} />
    </div>
  );
}
