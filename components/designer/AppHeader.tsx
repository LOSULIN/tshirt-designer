"use client";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
          D
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">DressUp</p>
          <p className="text-[10px] text-zinc-500">Design Your Style</p>
        </div>
      </div>

      <nav className="hidden items-center gap-6 text-sm text-zinc-900 md:flex">
        <span className="font-medium text-zinc-900">設計</span>
        <span className="cursor-pointer hover:text-zinc-900">關於我們</span>
        <span className="cursor-pointer hover:text-zinc-900">幫助中心</span>
      </nav>

      <div className="w-9 md:hidden" aria-hidden />
    </header>
  );
}
