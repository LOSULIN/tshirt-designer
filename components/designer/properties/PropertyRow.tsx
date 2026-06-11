"use client";

export function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] leading-tight">
      <span className="w-14 shrink-0 text-zinc-500">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
