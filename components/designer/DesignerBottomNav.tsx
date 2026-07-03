"use client";

import { ds } from "./design-ui";

export type DesignerMobileNavTab = "product" | "design" | "preview" | "checkout";

const NAV_ITEMS: { id: DesignerMobileNavTab; label: string; icon: string }[] = [
  { id: "product", label: "商品", icon: "👕" },
  { id: "design", label: "設計", icon: "✏️" },
  { id: "preview", label: "預覽", icon: "👁" },
  { id: "checkout", label: "下單", icon: "🛒" },
];

export function DesignerBottomNav({
  active,
  onChange,
}: {
  active: DesignerMobileNavTab;
  onChange: (tab: DesignerMobileNavTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      aria-label="設計器導覽"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium duration-150 ${
                isActive
                  ? "text-zinc-900"
                  : `text-zinc-500 hover:text-zinc-700 ${ds.motion.hover}`
              }`}
            >
              <span className="text-base leading-none" aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
