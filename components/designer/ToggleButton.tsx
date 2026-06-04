export function ToggleButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${className} ${
        active
          ? "bg-zinc-900 text-white"
          : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
