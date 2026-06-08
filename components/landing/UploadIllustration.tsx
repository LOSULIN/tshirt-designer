export function UploadIllustration() {
  return (
    <div className="flex h-full w-full max-w-[10.5rem] flex-col justify-center rounded-xl border border-dashed border-gray-300/80 bg-gray-50/80 p-3 text-center">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-500">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
        拖曳檔案到這裡
        <br />
        或
      </p>
      <div className="mx-auto mt-2 inline-block rounded-lg bg-blue-500 px-3 py-1 text-[11px] font-medium text-white">
        選擇檔案
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {["PDF（推薦）", "AI", "PSD"].map((type) => (
          <span
            key={type}
            className={`rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 ${
              type.startsWith("PDF")
                ? "bg-blue-50 text-blue-700 ring-blue-200"
                : "bg-white text-gray-500 ring-gray-200"
            }`}
          >
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
