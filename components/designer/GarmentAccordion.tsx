"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ds } from "./design-ui";

export function GarmentAccordion({
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !contentRef.current) return;
    contentRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [open]);

  return (
    <section className={`h-auto shrink-0 ${ds.card}`}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${ds.motion.accordion} hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600`}
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
        <div
          ref={contentRef}
          className={`h-auto border-t border-zinc-100 px-4 pb-4 pt-3 ${ds.motion.accordion}`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
