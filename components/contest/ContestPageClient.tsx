"use client";

import { EntryRulesGate } from "@/components/EntryRulesGate";
import { DesignerApp } from "@/components/designer/DesignerApp";

export function ContestPageClient() {
  return (
    <EntryRulesGate mode="contest">
      <div className="min-h-0 flex-1">
        <DesignerApp mode="contest" />
      </div>
    </EntryRulesGate>
  );
}
