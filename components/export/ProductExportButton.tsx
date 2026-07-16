"use client";

export interface ProductExportButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export function ProductExportButton({
  label,
  onClick,
  disabled = false,
  loading = false,
  variant = "secondary",
}: ProductExportButtonProps) {
  const className =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`h-8 flex-1 rounded-lg px-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? "處理中…" : label}
    </button>
  );
}
