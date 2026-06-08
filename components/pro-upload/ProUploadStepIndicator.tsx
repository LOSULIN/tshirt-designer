const STEPS = [
  "商品選擇",
  "上傳設計檔案",
  "檔案檢查",
  "校稿確認",
  "案件資料",
  "送出申請",
] as const;

type ProUploadStepIndicatorProps = {
  current: 0 | 1 | 2 | 3 | 4 | 5;
};

export function ProUploadStepIndicator({ current }: ProUploadStepIndicatorProps) {
  return (
    <ol className="mb-8 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] text-gray-400 sm:gap-x-2 sm:text-xs">
      {STEPS.map((label, index) => {
        const isActive = index === current;
        const isDone = index < current;

        return (
          <li key={label} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 && <span className="text-gray-200">→</span>}
            <span
              className={
                isActive
                  ? "font-medium text-blue-600"
                  : isDone
                    ? "text-gray-600"
                    : "text-gray-400"
              }
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
