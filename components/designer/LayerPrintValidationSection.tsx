"use client";

import { useMemo } from "react";
import type { Side } from "@/lib/constants";
import {
  buildFactoryPrintSummary,
  validateDesignLayer,
} from "@/lib/print-validation";
import type { DesignLayer } from "@/lib/types";
import { PrintValidationPanel } from "./PrintValidationPanel";

/** Read-only print validation — no layer mutation. */
export function LayerPrintValidationSection({
  layer,
  side,
  size,
  compact = false,
}: {
  layer: DesignLayer;
  side: Side;
  size: string;
  compact?: boolean;
}) {
  const report = useMemo(
    () => validateDesignLayer(layer, { side, size }),
    [layer, side, size],
  );

  const factorySummary = useMemo(
    () => buildFactoryPrintSummary(layer, { side, size }, report),
    [layer, side, size, report],
  );

  return (
    <PrintValidationPanel
      report={report}
      compact={compact}
      showFactorySummary
      factorySummary={factorySummary}
    />
  );
}
