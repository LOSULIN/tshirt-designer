"use client";

import type { PanelTab } from "@/lib/types";
import { ds } from "./design-ui";

const NAV_ITEMS: { id: PanelTab; label: string; icon: string }[] = [
  { id: "product", label: "商品", icon: "👕" },
  { id: "help", label: "說明", icon: "?" },
];

const HIDDEN_TABS = new Set<PanelTab>(["model", "layers"]);

export function IconNav({
  active,
  onChange,
}: {
  active: PanelTab;
  onChange: (tab: PanelTab) => void;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col items-center border-r border-zinc-200 bg-white ${ds.layout.iconNav} ${ds.space.gap2} ${ds.space.py3}`}
    >
      {NAV_ITEMS.filter((item) => !HIDDEN_TABS.has(item.id)).map((item) => (
        <button
          key={item.id}
          type="button"
          title={item.label}
          onClick={() => onChange(item.id)}
          className={`flex w-11 flex-col items-center gap-0.5 py-2 text-[10px] duration-150 ${ds.radius.button} ${
            active === item.id
              ? "bg-zinc-900 text-white"
              : `text-zinc-600 hover:bg-zinc-100 ${ds.motion.hover}`
          }`}
        >
          <span className="text-base leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </aside>
  );
}
