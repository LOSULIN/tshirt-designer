"use client";

import { EntryRulesGate } from "@/components/EntryRulesGate";
import { ProUploadPanel } from "@/components/pro-upload/ProUploadPanel";

export function ProUploadPageClient() {
  return (
    <EntryRulesGate mode="pro">
      <main className="flex flex-1 items-center justify-center px-5 py-12 lg:py-16">
        <ProUploadPanel />
      </main>
    </EntryRulesGate>
  );
}
