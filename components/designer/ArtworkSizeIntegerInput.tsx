"use client";

import { useEffect, useState } from "react";

const INPUT_CLASS =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-mono text-zinc-900 tabular-nums disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const BLOCKED_KEYS = new Set(["-", "+", "e", "E", ".", ","]);

export const ARTWORK_SIZE_CM_MIN = 1;
export const ARTWORK_SIZE_CM_MAX = 999;

export function clampArtworkSizeCm(value: number): number {
  return Math.min(
    ARTWORK_SIZE_CM_MAX,
    Math.max(ARTWORK_SIZE_CM_MIN, Math.round(value)),
  );
}

function formatArtworkSizeCm(value: number): string {
  return String(clampArtworkSizeCm(value));
}

function sanitizeArtworkSizeDraft(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (!digitsOnly) return "";
  const parsed = Number.parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, ARTWORK_SIZE_CM_MAX));
}

export function ArtworkSizeIntegerInput({
  value,
  disabled,
  ariaLabel,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onCommit: (next: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatArtworkSizeCm(value));

  useEffect(() => {
    if (!focused) {
      setDraft(formatArtworkSizeCm(value));
    }
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = clampArtworkSizeCm(
      Number.isNaN(parsed) ? value : parsed,
    );
    onCommit(next);
    setDraft(formatArtworkSizeCm(next));
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      step={1}
      min={ARTWORK_SIZE_CM_MIN}
      max={ARTWORK_SIZE_CM_MAX}
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      className={INPUT_CLASS}
      disabled={disabled}
      value={focused ? draft : formatArtworkSizeCm(value)}
      onFocus={(e) => {
        setFocused(true);
        setDraft(formatArtworkSizeCm(value));
        e.currentTarget.select();
      }}
      onChange={(e) => {
        setDraft(sanitizeArtworkSizeDraft(e.target.value));
      }}
      onBlur={() => {
        setFocused(false);
        commit(draft);
      }}
      onKeyDown={(e) => {
        if (BLOCKED_KEYS.has(e.key)) {
          e.preventDefault();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          commit(draft);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
