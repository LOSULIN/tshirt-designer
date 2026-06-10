"use client";

import { EntryRulesGate } from "@/components/EntryRulesGate";
import { DesignerApp } from "@/components/designer/DesignerApp";

export function DesignerPageClient() {
  return (
    <EntryRulesGate mode="free">
      <div className="min-h-0 flex-1">
        <DesignerApp mode="normal" />
      </div>
    </EntryRulesGate>
  );
}
