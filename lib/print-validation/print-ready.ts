import type {
  PrintReadyBadge,
  PrintReadyStatus,
  ValidationResult,
  ValidationSeverity,
} from "./types";

const PRINT_READY_BADGES: Record<PrintReadyStatus, PrintReadyBadge> = {
  ready: {
    status: "ready",
    label: "PRINT READY",
    labelZh: "可送印",
    emoji: "🟢",
  },
  check_required: {
    status: "check_required",
    label: "CHECK REQUIRED",
    labelZh: "需確認",
    emoji: "🟡",
  },
  not_ready: {
    status: "not_ready",
    label: "NOT PRINT READY",
    labelZh: "不可送印",
    emoji: "🔴",
  },
};

export function derivePrintReadyStatus(
  results: ValidationResult[],
): PrintReadyStatus {
  if (results.some((r) => r.severity === "critical")) return "not_ready";
  if (results.some((r) => r.severity === "warning")) return "check_required";
  return "ready";
}

export function getPrintReadyBadge(
  results: ValidationResult[],
): PrintReadyBadge {
  return PRINT_READY_BADGES[derivePrintReadyStatus(results)];
}

export function countBySeverity(
  results: ValidationResult[],
): Record<ValidationSeverity, number> {
  return {
    info: results.filter((r) => r.severity === "info").length,
    recommendation: results.filter((r) => r.severity === "recommendation").length,
    warning: results.filter((r) => r.severity === "warning").length,
    critical: results.filter((r) => r.severity === "critical").length,
  };
}
