"use client";

import type {
  FactoryPrintSummary,
  PrintReadyBadge,
  PrintQualityScore,
  PrintValidationReport,
  ValidationResult,
  ValidationSeverity,
} from "@/lib/print-validation";
import {
  formatPrintQualityStars,
} from "@/lib/print-validation";

const SEVERITY_STYLES: Record<
  ValidationSeverity,
  { box: string; icon: string; label: string }
> = {
  info: {
    box: "border-blue-200 bg-blue-50 text-blue-900",
    icon: "ℹ",
    label: "Info",
  },
  recommendation: {
    box: "border-sky-200 bg-sky-50 text-sky-900",
    icon: "💡",
    label: "Recommendation",
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: "⚠",
    label: "Warning",
  },
  critical: {
    box: "border-red-200 bg-red-50 text-red-900",
    icon: "✕",
    label: "Critical",
  },
};

const PRINT_READY_STYLES: Record<
  PrintReadyBadge["status"],
  { box: string }
> = {
  ready: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  check_required: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
  },
  not_ready: {
    box: "border-red-200 bg-red-50 text-red-900",
  },
};

function ValidationItem({ result }: { result: ValidationResult }) {
  const style = SEVERITY_STYLES[result.severity];
  return (
    <li
      className={`rounded-md border px-2 py-1.5 text-[11px] leading-snug ${style.box}`}
      role="status"
      data-print-validation-severity={result.severity}
      data-print-validation-rule-id={result.rule.ruleId}
      data-print-validation-category={result.rule.category}
    >
      <p className="font-medium">
        <span aria-hidden className="mr-1">
          {style.icon}
        </span>
        {result.rule.ruleId} · {result.rule.ruleName}
      </p>
      <p className="mt-0.5 whitespace-pre-line">{result.message}</p>
      {result.rule.suggestion ? (
        <p className="mt-0.5 opacity-90">{result.rule.suggestion}</p>
      ) : null}
    </li>
  );
}

function ScoreBadge({ score }: { score: PrintQualityScore }) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5"
      data-print-quality-score={score.stars}
    >
      <div>
        <p className="text-[10px] font-medium text-zinc-500">Print Quality</p>
        <p className="text-[11px] font-semibold text-zinc-800">{score.labelZh}</p>
      </div>
      <p
        className="text-sm tracking-tight text-amber-500"
        aria-label={`${score.stars} out of 5 stars`}
      >
        {formatPrintQualityStars(score)}
      </p>
    </div>
  );
}

export function PrintReadyBadgeView({
  badge,
  compact = false,
}: {
  badge: PrintReadyBadge;
  compact?: boolean;
}) {
  const style = PRINT_READY_STYLES[badge.status];
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.box}`}
      data-print-ready-status={badge.status}
      role="status"
      aria-label={badge.labelZh}
    >
      <span aria-hidden>{badge.emoji}</span>
      <span>{compact ? badge.labelZh : badge.label}</span>
      {!compact ? (
        <span className="font-normal normal-case opacity-80">({badge.labelZh})</span>
      ) : null}
    </div>
  );
}

export function FactoryPrintSummaryCard({
  summary,
}: {
  summary: FactoryPrintSummary;
}) {
  return (
    <div
      className="space-y-1.5 rounded-md border border-zinc-200 bg-white p-2"
      data-factory-print-summary
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Factory Summary
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
        <dt className="text-zinc-500">Printing Method</dt>
        <dd className="font-medium text-zinc-800">{summary.printingMethod}</dd>
        <dt className="text-zinc-500">Rule Set</dt>
        <dd className="font-medium text-zinc-800">
          {summary.ruleSetId} v{summary.ruleSetVersion}
        </dd>
        <dt className="text-zinc-500">Recommended DPI</dt>
        <dd className="font-medium text-zinc-800">{summary.recommendedDpi}</dd>
        {summary.currentDpi != null ? (
          <>
            <dt className="text-zinc-500">Current DPI</dt>
            <dd className="font-medium text-zinc-800">{summary.currentDpi}</dd>
          </>
        ) : null}
        {summary.artworkSizeCm ? (
          <>
            <dt className="text-zinc-500">Artwork Size</dt>
            <dd className="font-medium text-zinc-800">{summary.artworkSizeCm}</dd>
          </>
        ) : null}
        <dt className="text-zinc-500">Print Area</dt>
        <dd className="font-medium text-zinc-800">{summary.printAreaCm}</dd>
        <dt className="text-zinc-500">Print Quality</dt>
        <dd className="font-medium text-amber-600">
          {formatPrintQualityStars(summary.printQuality)}
        </dd>
      </dl>
      <PrintReadyBadgeView badge={summary.printReady} compact />
    </div>
  );
}

export function PrintValidationPanel({
  report,
  compact = false,
  showFactorySummary = false,
  factorySummary = null,
}: {
  report: PrintValidationReport | null;
  compact?: boolean;
  showFactorySummary?: boolean;
  factorySummary?: FactoryPrintSummary | null;
}) {
  if (!report) return null;

  const issues = report.results;

  if (issues.length === 0 && compact) {
    return (
      <div className="space-y-1.5" data-print-validation-panel>
        <PrintReadyBadgeView badge={report.printReady} compact />
        <ScoreBadge score={report.score} />
        {showFactorySummary && factorySummary ? (
          <FactoryPrintSummaryCard summary={factorySummary} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-print-validation-panel>
      <PrintReadyBadgeView badge={report.printReady} compact={compact} />
      <ScoreBadge score={report.score} />
      {showFactorySummary && factorySummary ? (
        <FactoryPrintSummaryCard summary={factorySummary} />
      ) : null}
      {issues.length > 0 ? (
        <ul className="space-y-1">
          {issues.map((result) => (
            <ValidationItem key={result.id} result={result} />
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-emerald-700" role="status">
          印刷規範檢查通過
        </p>
      )}
    </div>
  );
}

export function WorkspacePrintQualitySummary({
  score,
  printReady,
  issueCount,
}: {
  score: PrintQualityScore;
  printReady: PrintReadyBadge;
  issueCount: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      data-print-validation-workspace-summary
    >
      <PrintReadyBadgeView badge={printReady} compact />
      {issueCount > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-900"
          title={`Print Quality ${score.label}`}
        >
          <span aria-hidden>{formatPrintQualityStars(score)}</span>
          <span>{issueCount} 項</span>
        </span>
      ) : null}
    </span>
  );
}
