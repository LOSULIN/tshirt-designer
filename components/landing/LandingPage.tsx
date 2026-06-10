import { CONTEST_ENABLED } from "@/lib/feature-flags";
import { DesignToolIllustration } from "./DesignToolIllustration";
import { LandingNav } from "./LandingNav";
import { OptionCard } from "./OptionCard";
import { UploadIllustration } from "./UploadIllustration";

const FREE_DESIGN_FEATURES = [
  "上傳圖片",
  "新增文字",
  "即時預覽",
  "模特展示",
  "自由拖曳編輯",
] as const;

const CONTEST_FEATURES = [
  "上傳圖片",
  "新增文字",
  "即時預覽",
  "模特展示",
  "自由拖曳編輯",
  "投稿作品審核",
] as const;

const PRO_UPLOAD_FEATURES = [
  "檔案格式檢查",
  "檔案大小檢查",
  "商品尺寸檢查",
  "套版預覽",
  "校稿確認",
  "TIIIGO 生產申請",
  "Marketplace 上架申請",
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f7f8fa]">
      <LandingNav />

      <main className="flex flex-1 items-center justify-center px-5 pt-2 pb-10 lg:pt-3">
        <div
          className={`grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 ${
            CONTEST_ENABLED
              ? "max-w-6xl lg:grid-cols-3"
              : "mx-auto max-w-4xl lg:grid-cols-2"
          }`}
        >
          {CONTEST_ENABLED && (
            <OptionCard
              theme="purple"
              title="徵選投稿專區"
              subtitle="適合參加 TIIGO 官方設計徵選活動的創作者。"
              features={[...CONTEST_FEATURES]}
              illustration={<DesignToolIllustration />}
              ctaLabel="開始投稿"
              ctaHref="/contest"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 0 1-5.394 3.09M15.75 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              }
            />
          )}

          <OptionCard
            theme="green"
            title="自由設計"
            subtitle="適合一般消費者、團體服、禮物客製"
            features={[...FREE_DESIGN_FEATURES]}
            illustration={<DesignToolIllustration />}
            ctaLabel="立即設計"
            ctaHref="/designer"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197V4.875c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H11.25a1.125 1.125 0 0 1-1.125-1.125V8.197Z"
                />
              </svg>
            }
          />

          <OptionCard
            theme="blue"
            title="專業設計師交稿"
            subtitle="適用於已有完整設計檔案的品牌、插畫家與設計師。"
            features={[...PRO_UPLOAD_FEATURES]}
            illustration={<UploadIllustration />}
            ctaLabel="上傳印刷檔"
            ctaHref="/pro-upload"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m3 0v-1.5m0 1.5h3.75m-9.75 0h3.75m0 0v-1.5m0 1.5H6.75"
                />
              </svg>
            }
          />
        </div>
      </main>
    </div>
  );
}
