import type { PrintQualityScore, ValidationResult } from "./types";

const SEVERITY_STAR_CEILING: Record<
  ValidationResult["severity"],
  number | null
> = {
  critical: 2,
  warning: 3,
  recommendation: 4,
  info: null,
};

const STAR_LABELS: Record<
  number,
  { label: PrintQualityScore["label"]; labelZh: string }
> = {
  5: { label: "Excellent", labelZh: "優秀" },
  4: { label: "Good", labelZh: "良好" },
  3: { label: "Needs Improvement", labelZh: "待改善" },
  2: { label: "Poor", labelZh: "需修正" },
  1: { label: "Poor", labelZh: "需修正" },
};

export function scoreValidationResults(
  results: ValidationResult[],
): PrintQualityScore {
  if (results.length === 0) {
    return { stars: 5, label: "Excellent", labelZh: "優秀" };
  }

  let starCap = 5;
  for (const result of results) {
    const ceiling = SEVERITY_STAR_CEILING[result.severity];
    if (ceiling != null) starCap = Math.min(starCap, ceiling);
  }

  const labels = STAR_LABELS[starCap] ?? STAR_LABELS[1];
  return { stars: starCap, ...labels };
}

export function scoreWorkspaceReports(
  reports: { results: ValidationResult[] }[],
): PrintQualityScore {
  const allResults = reports.flatMap((report) => report.results);
  return scoreValidationResults(allResults);
}

export function formatPrintQualityStars(score: PrintQualityScore): string {
  return "★".repeat(score.stars) + "☆".repeat(5 - score.stars);
}
