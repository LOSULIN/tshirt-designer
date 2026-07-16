"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/products/product-registry";
import type { ProductCatalogItem } from "@/lib/products/product-types";

export interface ProductSelectorProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ProductSelector({
  value,
  onChange,
  className,
  disabled = false,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((items) => {
        if (!cancelled) setProducts(items);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <label className={`flex flex-col gap-1 text-xs text-zinc-600 ${className ?? ""}`}>
      <span className="font-medium">商品</span>
      <select
        value={value}
        disabled={disabled || loading}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-[160px] rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-900 disabled:opacity-50"
      >
        {products.map((product) => (
          <option key={product.code} value={product.code}>
            {product.code} — {product.name}
          </option>
        ))}
      </select>
    </label>
  );
}
