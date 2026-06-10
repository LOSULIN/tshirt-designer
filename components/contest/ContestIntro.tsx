type ContestIntroProps = {
  onStart: () => void;
};

export function ContestIntro({ onStart }: ContestIntroProps) {
  return (
    <div className="w-full max-w-xl">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">徵選投稿專區</h1>
      </div>

      <section className="mt-8 rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">投稿規範</h2>
        <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-gray-600">
          <li>• 僅接受白色 T-Shirt 設計</li>
          <li>• 作品需為原創</li>
          <li>• 禁止侵權素材</li>
          <li>• 投稿後將進入 TIIGO 審核流程</li>
        </ul>
      </section>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 w-full rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
      >
        開始設計
      </button>
    </div>
  );
}
