"use client";

import type { PanelTab } from "@/lib/types";

const NAV_ITEMS: { id: PanelTab; label: string; icon: string }[] = [
  { id: "product", label: "商品", icon: "👕" },
  { id: "model", label: "模特", icon: "🧍" },
  { id: "layers", label: "圖層", icon: "☰" },
  { id: "help", label: "說明", icon: "?" },
];

export function IconNav({
  active,
  onChange,
}: {
  active: PanelTab;
  onChange: (tab: PanelTab) => void;
}) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-zinc-200 bg-white py-3">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          onClick={() => onChange(item.id)}
          className={`flex w-11 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors ${
            active === item.id
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </aside>
  );
}
