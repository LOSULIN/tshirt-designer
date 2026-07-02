"use client";

import type { Size } from "@/lib/constants";
import {
  getProductSizeRows,
  PRODUCT_SIZE_LINES,
} from "@/lib/product-size-config";

export function ProductSizeSelector({
  size,
  onSizeChange,
  disabled = false,
}: {
  size: Size;
  onSizeChange: (size: Size) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      {PRODUCT_SIZE_LINES.map((line) => {
        const rows =
          line.id === "children"
            ? getProductSizeRows("children")
            : line.id === "fit"
              ? getProductSizeRows("fit")
              : getProductSizeRows("adult-standard");

        return (
        <div key={line.id}>
          <p className="mb-1.5 text-[10px] font-semibold text-zinc-600">
            {line.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {rows.map((row) => (
              <button
                key={row.size}
                type="button"
                disabled={disabled}
                onClick={() => onSizeChange(row.size as Size)}
                className={`min-w-[2.25rem] rounded-lg border px-2.5 py-1.5 text-sm transition-colors disabled:opacity-50 ${
                  size === row.size
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {row.size}
              </button>
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}
