"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatInspectorDimensionDisplay,
  formatInspectorDimensionPrecise,
  formatInspectorInputValue,
  getInspectorDimensionDisplay,
  shouldClearInspectorDimensionAnchor,
  isInspectorNumberDraft,
  parseInspectorNumber,
} from "@/lib/inspector-sync";

const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-mono text-zinc-900 tabular-nums disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const compactInputClass =
  "w-full min-w-0 rounded border border-zinc-300 bg-white px-1 py-0.5 text-[10px] font-mono leading-tight text-zinc-900 tabular-nums disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

type DimensionAnchor = { committedCm: number; display: string };

export function InspectorNumberInput({
  value,
  disabled,
  decimals,
  dimensionDisplay = false,
  ariaLabel,
  compact = false,
  className = "",
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  /** 失焦後顯示的小數位數；省略則保留實際數值 */
  decimals?: number;
  /** 寬高友善尺寸：round 至 1 位小數，commit 後不因內部微調跳動 */
  dimensionDisplay?: boolean;
  ariaLabel?: string;
  compact?: boolean;
  className?: string;
  onCommit: (next: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const dimensionAnchorRef = useRef<DimensionAnchor | null>(null);
  const [draft, setDraft] = useState(() =>
    dimensionDisplay
      ? formatInspectorDimensionDisplay(value)
      : formatInspectorInputValue(value, decimals),
  );

  const unfocusedDisplay = dimensionDisplay
    ? getInspectorDimensionDisplay(value, dimensionAnchorRef.current)
    : formatInspectorInputValue(value, decimals);

  useEffect(() => {
    if (focused) return;

    if (dimensionDisplay) {
      const anchor = dimensionAnchorRef.current;
      if (
        anchor &&
        shouldClearInspectorDimensionAnchor(value, anchor.committedCm)
      ) {
        dimensionAnchorRef.current = null;
      }
      setDraft(getInspectorDimensionDisplay(value, dimensionAnchorRef.current));
      return;
    }

    setDraft(formatInspectorInputValue(value, decimals));
  }, [value, focused, decimals, dimensionDisplay]);

  const commit = () => {
    const next = parseInspectorNumber(draft, value);
    onCommit(next);

    if (dimensionDisplay) {
      const display = formatInspectorDimensionDisplay(next);
      dimensionAnchorRef.current = { committedCm: next, display };
      setDraft(display);
      return;
    }

    setDraft(formatInspectorInputValue(next, decimals));
  };

  const focusDraft = () => {
    if (dimensionDisplay) {
      const anchor = dimensionAnchorRef.current;
      if (
        anchor &&
        !shouldClearInspectorDimensionAnchor(value, anchor.committedCm)
      ) {
        setDraft(anchor.display);
        return;
      }
      setDraft(formatInspectorDimensionDisplay(value));
      return;
    }

    setDraft(formatInspectorInputValue(value, decimals));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      aria-label={ariaLabel}
      title={dimensionDisplay ? formatInspectorDimensionPrecise(value) : undefined}
      className={`${compact ? compactInputClass : inputClass} ${className}`.trim()}
      disabled={disabled}
      value={focused ? draft : unfocusedDisplay}
      onFocus={(e) => {
        setFocused(true);
        focusDraft();
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (isInspectorNumberDraft(next)) {
          setDraft(next);
        }
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}
