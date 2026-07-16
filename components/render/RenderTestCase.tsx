"use client";

import type { RenderValidationOutcome } from "@/lib/render/render-validation";
import type { RenderTestCaseDefinition } from "@/lib/render/render-testcases";

export interface RenderTestCaseProps {
  testCase: RenderTestCaseDefinition;
  outcome: RenderValidationOutcome | null;
  selected: boolean;
  onSelect: () => void;
}

function statusLabel(status: RenderValidationOutcome["status"] | undefined): string {
  if (status === "pass") return "PASS";
  if (status === "fail") return "FAIL";
  return "—";
}

function statusClass(status: RenderValidationOutcome["status"] | undefined): string {
  if (status === "pass") return "bg-emerald-100 text-emerald-800";
  if (status === "fail") return "bg-red-100 text-red-800";
  return "bg-zinc-100 text-zinc-600";
}

export function RenderTestCaseRow({
  testCase,
  outcome,
  selected,
  onSelect,
}: RenderTestCaseProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
        selected
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-zinc-900">
          Test {String(testCase.number).padStart(2, "0")} — {testCase.title}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500">{testCase.description}</p>
        {outcome?.details.length ? (
          <ul className="mt-2 space-y-0.5 text-xs text-zinc-600">
            {outcome.details.map((detail) => (
              <li key={detail.label}>
                {detail.label}: {detail.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(outcome?.status)}`}
      >
        {statusLabel(outcome?.status)}
      </span>
    </button>
  );
}
