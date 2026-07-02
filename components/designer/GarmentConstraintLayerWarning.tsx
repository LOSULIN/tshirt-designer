"use client";

import type { GarmentConstraintBadgeMeta } from "@/lib/garment-constraint-ux-polish";
import { GarmentConstraintBadge } from "./GarmentConstraintUxPrimitives";

/** 圖層級可印約束警告（疊加於圖層上，不修改定位） */
export function GarmentConstraintLayerWarning({
  label,
  badge,
}: {
  label: string;
  badge?: GarmentConstraintBadgeMeta;
}) {
  if (!label) {
    return null;
  }

  const level = badge?.level ?? "violation";
  const shortLabel = badge?.shortLabel ?? "超出";
  const tooltip = badge?.tooltip ?? label;

  return (
    <div
      data-garment-constraint-layer-warning
      data-garment-constraint-warning-level={level}
      className="pointer-events-auto absolute -top-6 left-0 z-30"
      role="status"
      aria-live="polite"
    >
      <GarmentConstraintBadge
        level={level}
        label={shortLabel}
        tooltip={tooltip}
        pulse={level !== "ok"}
        layerBadge
      />
    </div>
  );
}
