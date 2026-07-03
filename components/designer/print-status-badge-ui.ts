import type { GarmentPrintStatus } from "@/lib/garment-constraint-ux-polish";

export interface PrintStatusBadgeView {
  icon: string;
  label: string;
  className: string;
}

/** UI-only mapping from existing garment print status */
export function getPrintStatusBadgeView(
  status: GarmentPrintStatus,
): PrintStatusBadgeView {
  if (status.level === "ok") {
    return {
      icon: "✓",
      label: "可印刷",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }
  if (status.level === "caution") {
    return {
      icon: "△",
      label: "接近安全邊界",
      className: "border-amber-200 bg-amber-50 text-amber-900",
    };
  }
  return {
    icon: "✕",
    label: "超出印刷範圍",
    className: "border-red-200 bg-red-50 text-red-800",
  };
}
