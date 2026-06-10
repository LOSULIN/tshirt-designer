"use client";

import { useState } from "react";
import { DesignerApp } from "@/components/designer/DesignerApp";
import { ContestIntro } from "./ContestIntro";

export function ContestPageClient() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12 lg:py-16">
        <ContestIntro onStart={() => setStarted(true)} />
      </main>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <DesignerApp mode="contest" />
    </div>
  );
}
