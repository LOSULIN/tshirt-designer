"use client";

import { useState, type ReactNode } from "react";
import { EntryRulesModal } from "@/components/EntryRulesModal";
import type { EntryRulesMode } from "@/lib/entry-rules";

type EntryRulesGateProps = {
  mode: EntryRulesMode;
  children: ReactNode;
};

export function EntryRulesGate({ mode, children }: EntryRulesGateProps) {
  const [accepted, setAccepted] = useState(false);

  if (!accepted) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12 lg:py-16">
        <EntryRulesModal
          mode={mode}
          open
          onConfirm={() => setAccepted(true)}
        />
      </main>
    );
  }

  return children;
}
