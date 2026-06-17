export function DesignToolIllustration() {
  return (
    <div className="flex h-full w-full max-w-[10.5rem] flex-col justify-center rounded-xl border border-gray-200/80 bg-gray-50/80 p-2.5 shadow-sm">
      <div className="flex gap-2.5">
        <div className="flex w-6 flex-col gap-1.5">
          <div className="h-1.5 w-full rounded bg-gray-200" />
          <div className="h-1.5 w-full rounded bg-gray-200" />
          <div className="h-1.5 w-full rounded bg-gray-200" />
        </div>
        <div className="flex flex-1 flex-col items-center rounded-lg bg-white p-3 ring-1 ring-gray-100">
          <div className="h-14 w-12 rounded-t-2xl bg-gray-100" />
          <div className="mt-1.5 h-1 w-12 rounded bg-gray-200" />
        </div>
        <div className="flex w-6 flex-col gap-1.5">
          <div className="h-1.5 w-full rounded bg-gray-200" />
          <div className="h-1.5 w-full rounded bg-gray-200" />
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-2">
        {["#111", "#3b82f6", "#ef4444", "#22c55e", "#f59e0b"].map((color) => (
          <div
            key={color}
            className="h-3 w-3 rounded-full ring-1 ring-gray-200"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}
