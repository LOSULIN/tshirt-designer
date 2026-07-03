import { PRINT_QUALITY_TARGET_DPI } from "@/lib/image-print-quality";
import { getResultPanelRasterDpi } from "./result-panel-dpi-ui";
import type { DesignLayer } from "@/lib/types";

export type WorkspacePrintStatusKind = "violation" | "dpi" | "ok";

export interface WorkspacePrintStatusView {
  kind: WorkspacePrintStatusKind;
  emoji: string;
  label: string;
  badgeToken: "ok" | "violation" | "dpi";
  detail: string;
  printSizeAlert: boolean;
}

export function resolveWorkspacePrintStatus({
  layers,
  violationCount,
  hasOverflow,
  size,
}: {
  layers: DesignLayer[];
  violationCount: number;
  hasOverflow: boolean;
  size: string;
}): WorkspacePrintStatusView {
  if (hasOverflow || violationCount > 0) {
    return {
      kind: "violation",
      emoji: "🔴",
      label: "已超出印製範圍",
      badgeToken: "violation",
      detail: "部分圖層超出目前尺碼可印範圍，請拖回可印區域內。",
      printSizeAlert: true,
    };
  }

  const rasterDpi = getResultPanelRasterDpi(layers);
  if (rasterDpi !== null && rasterDpi < PRINT_QUALITY_TARGET_DPI) {
    return {
      kind: "dpi",
      emoji: "🟡",
      label: "圖片解析度不足",
      badgeToken: "dpi",
      detail: `目前最低解析度 ${rasterDpi} DPI，建議使用 300 DPI 以上圖片。`,
      printSizeAlert: false,
    };
  }

  return {
    kind: "ok",
    emoji: "🟢",
    label: "可印製",
    badgeToken: "ok",
    detail: `尺碼 ${size} · 所有圖層均在可印範圍內`,
    printSizeAlert: false,
  };
}
