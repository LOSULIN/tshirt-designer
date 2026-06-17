"use client";

import { EntryRulesGate } from "@/components/EntryRulesGate";
import { DesignerApp } from "@/components/designer/DesignerApp";
import { parsePreviewPrintPositionMode } from "@/lib/printArea";
import { useSearchParams } from "next/navigation";

export function DesignerPageClient() {
  const searchParams = useSearchParams();
  const initialDebugPrintArea =
    searchParams.get("debugPrintArea") === "1" ||
    searchParams.get("mockupCalibration") === "1";
  const initialPreviewPrintPositionMode = parsePreviewPrintPositionMode(
    searchParams.get("printPositionMode"),
  );

  return (
    <EntryRulesGate mode="free">
      <div className="min-h-0 flex-1">
        <DesignerApp
          mode="normal"
          initialDebugPrintArea={initialDebugPrintArea}
          initialPreviewPrintPositionMode={initialPreviewPrintPositionMode}
        />
      </div>
    </EntryRulesGate>
  );
}
