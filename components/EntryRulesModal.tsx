"use client";

import { ENTRY_RULES, type EntryRulesMode } from "@/lib/entry-rules";

type EntryRulesModalProps = {
  mode: EntryRulesMode;
  open: boolean;
  onConfirm: () => void;
};

const bodyTextClass =
  "text-[13px] leading-[1.45] tracking-[-0.03em] text-gray-600 sm:text-sm sm:leading-[1.45] sm:tracking-[-0.02em]";

const headingClass =
  "text-[13px] font-semibold leading-[1.4] tracking-[-0.03em] text-gray-900 sm:text-sm sm:leading-[1.4] sm:tracking-[-0.02em]";

export function EntryRulesModal({
  mode,
  open,
  onConfirm,
}: EntryRulesModalProps) {
  if (!open) return null;

  const config = ENTRY_RULES[mode];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
      <div
        className="flex max-h-[80vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-rules-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <h1
            id="entry-rules-title"
            className="text-center text-lg font-semibold leading-[1.35] tracking-[-0.03em] text-gray-900 sm:text-xl sm:tracking-[-0.02em]"
          >
            {config.title}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 sm:py-4">
          <section className="rounded-xl bg-gray-50 p-3.5 ring-1 ring-gray-100 sm:p-4">
            {config.sections ? (
              <div className="space-y-3 sm:space-y-3.5">
                {config.sections.map((section) => (
                  <div key={section.heading}>
                    <h2 className={headingClass}>{section.heading}</h2>
                    {section.text && (
                      <p className={`mt-1.5 ${bodyTextClass}`}>{section.text}</p>
                    )}
                    {section.items && (
                      <ul className={`mt-1.5 space-y-1 ${bodyTextClass}`}>
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-1.5">
                            <span className="shrink-0 text-gray-400">-</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <h2 className={headingClass}>
                  {config.rulesHeading ?? "投稿規範"}
                </h2>
                <ul className={`mt-2 space-y-1 ${bodyTextClass}`}>
                  {config.rules?.map((rule) => (
                    <li key={rule} className="flex gap-1.5">
                      <span className="shrink-0 text-gray-400">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>

        <footer className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6 sm:py-3.5">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full rounded-xl px-5 py-2.5 text-sm font-semibold leading-[1.4] tracking-[-0.02em] text-white transition-colors ${config.confirmButtonClassName}`}
          >
            {config.confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
