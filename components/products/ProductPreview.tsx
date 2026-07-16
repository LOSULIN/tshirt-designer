"use client";

import { useEffect, useState } from "react";
import {
  getAssets,
  getProduct,
  validateProductRegistry,
} from "@/lib/products/product-registry";
import type {
  ProductRecord,
  ProductValidationResult,
} from "@/lib/products/product-types";

export interface ProductPreviewProps {
  productCode: string;
}

function StatusPill({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
      }`}
    >
      {label}: {active ? "Ready" : "Pending"}
    </span>
  );
}

export function ProductPreview({ productCode }: ProductPreviewProps) {
  const [record, setRecord] = useState<ProductRecord | null>(null);
  const [assetCount, setAssetCount] = useState(0);
  const [validation, setValidation] = useState<ProductValidationResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    Promise.all([
      getProduct(productCode),
      getAssets(productCode),
      validateProductRegistry(productCode),
    ])
      .then(([product, assets, result]) => {
        if (cancelled) return;
        setRecord(product);
        setAssetCount(assets.length);
        setValidation(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "載入失敗");
          setRecord(null);
          setAssetCount(0);
          setValidation(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productCode]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!record) {
    return (
      <div className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100" />
    );
  }

  const { catalog, profile } = record;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Product Preview
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            {profile.displayName}
          </h2>
          <p className="text-sm text-zinc-600">
            {catalog.brand} · {profile.code}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Calibration"
            active={validation?.calibrationReady ?? false}
          />
          <StatusPill label="Render" active={validation?.renderReady ?? false} />
        </div>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-zinc-500">品牌</dt>
          <dd className="font-medium text-zinc-900">{profile.brand}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">分類</dt>
          <dd className="font-medium text-zinc-900">{profile.category}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">可用顏色</dt>
          <dd className="font-medium text-zinc-900">
            {profile.availableColors.map((c) => c.label).join("、")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">可用尺寸</dt>
          <dd className="font-medium text-zinc-900">
            {profile.availableSizes.join(" / ")}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">素材數量</dt>
          <dd className="font-medium text-zinc-900">{assetCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">材質</dt>
          <dd className="font-medium text-zinc-900">
            {profile.fabricInfo.material}
            {profile.fabricInfo.weight ? ` · ${profile.fabricInfo.weight}` : ""}
          </dd>
        </div>
      </dl>

      {validation && validation.issues.length > 0 ? (
        <ul className="mt-4 space-y-1 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
          {validation.issues.map((issue) => (
            <li
              key={`${issue.level}-${issue.message}`}
              className={issue.level === "error" ? "text-red-700" : "text-amber-700"}
            >
              [{issue.level.toUpperCase()}] {issue.message}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-emerald-700">Registry 驗證通過</p>
      )}
    </article>
  );
}
