"use client";

import type { ReactNode, HTMLAttributes } from "react";
import type { GarmentConstraintWarningLevel } from "@/lib/garment-constraint-ux-polish";
import { GARMENT_CONSTRAINT_LEVEL_STYLES } from "@/lib/garment-constraint-ux-polish";

export function GarmentConstraintTooltip({
  label,
  children,
  className = "",
  ...rest
}: {
  label: string;
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`group/tt relative inline-flex ${className}`} {...rest}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-max max-w-[18rem] -translate-x-1/2 whitespace-pre-line rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-[10px] font-normal leading-snug text-zinc-700 shadow-md group-hover/tt:block group-focus-within/tt:block"
      >
        {label}
      </span>
    </span>
  );
}

export function GarmentConstraintBadge({
  level,
  label,
  tooltip,
  pulse = false,
  layerBadge = false,
  inspectorBadge = false,
}: {
  level: GarmentConstraintWarningLevel;
  label: string;
  tooltip?: string;
  pulse?: boolean;
  layerBadge?: boolean;
  inspectorBadge?: boolean;
}) {
  const styles = GARMENT_CONSTRAINT_LEVEL_STYLES[level];
  const badge = (
    <span
      {...(layerBadge ? { "data-garment-constraint-layer-badge": "" } : {})}
      {...(inspectorBadge ? { "data-garment-constraint-inspector-badge": "" } : {})}
      data-garment-constraint-warning-level={level}
      className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide transition-colors ${styles.badge} ${pulse ? "animate-garment-constraint-warning-pulse" : ""}`}
    >
      {level !== "ok" && <span aria-hidden>⚠</span>}
      {label}
    </span>
  );

  if (!tooltip) {
    return badge;
  }

  return <GarmentConstraintTooltip label={tooltip}>{badge}</GarmentConstraintTooltip>;
}
