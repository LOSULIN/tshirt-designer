"use client";

import type { ReactNode } from "react";
import { ds } from "./design-ui";

export function AccordionSection({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section className={`h-auto shrink-0 ${ds.card}`}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 ${ds.motion.accordion}`}
      >
        <span className={ds.type.cardTitle}>{title}</span>
        <span className={`min-w-0 truncate font-medium ${ds.type.helper}`}>
          {open ? null : summary}
        </span>
        <span className={`shrink-0 ${ds.type.helper} text-zinc-400`} aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      {open ? (
        <div className="h-auto border-t border-zinc-100 px-4 pb-4 pt-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}
