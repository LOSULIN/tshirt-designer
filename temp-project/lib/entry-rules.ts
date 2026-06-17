export type EntryRulesMode = "contest" | "free" | "pro";

export type EntryRulesSection = {
  heading: string;
  text?: string;
  items?: string[];
};

export type EntryRulesConfig = {
  title: string;
  rulesHeading?: string;
  rules?: string[];
  sections?: EntryRulesSection[];
  confirmLabel: string;
  confirmButtonClassName: string;
};

export const ENTRY_RULES: Record<EntryRulesMode, EntryRulesConfig> = {
  contest: {
    title: "【徵選投稿專區｜投稿規範】",
    sections: [
      {
        heading: "🟡 活動說明",
        text: "本投稿用於設計徵選活動，作品將進入官方審核與評選流程。",
      },
      {
        heading: "⚠️ 投稿規範",
        items: [
          "僅接受指定類型設計（白色 T-Shirt 設計）",
          "作品需為原創設計",
          "禁止使用未授權素材、品牌 Logo 或他人作品",
          "不符合規範作品將不進入評選",
        ],
      },
      {
        heading: "📌 審核流程",
        items: [
          "投稿後將進入平台審核流程",
          "通過審核後才進入評選或展示",
        ],
      },
      {
        heading: "💡 建議事項",
        items: [
          "注意印刷可行性與清晰度",
          "避免過於複雜或難以輸出的設計",
        ],
      },
    ],
    confirmLabel: "確認並進入投稿",
    confirmButtonClassName: "bg-violet-500 hover:bg-violet-600",
  },
  free: {
    title: "【自由設計模式｜精簡商用提醒】",
    sections: [
      {
        heading: "🟢 創作說明",
        text: "自由設計適用於個人創作、練習與設計測試。",
      },
      {
        heading: "⚠️ 使用規範",
        items: [
          "設計需為原創或已合法授權素材",
          "禁止使用未授權品牌、Logo 或他人作品",
          "請避免侵權或抄襲內容",
        ],
      },
      {
        heading: "🧑‍⚖️ 商用提醒",
        items: [
          "若用於商業用途，請自行確認授權合法性",
          "侵權責任由設計者自行承擔",
        ],
      },
      {
        heading: "💡 建議",
        items: [
          "使用可商用或原創素材（CC0 / 自製）",
          "建議輸出高解析度（300 DPI）",
          "建議保留原始設計檔（AI / PSD）",
        ],
      },
      {
        heading: "📌 使用範圍",
        text: "適用於個人創作、測試與非正式商用設計",
      },
    ],
    confirmLabel: "我已了解並同意",
    confirmButtonClassName: "bg-emerald-500 hover:bg-emerald-600",
  },
  pro: {
    title: "【專業設計模式｜商用設計提醒】",
    sections: [
      {
        heading: "🔴 商用說明",
        text: "本模式適用於可能用於商業用途（販售 / 印刷 / 品牌應用）的設計作品。",
      },
      {
        heading: "⚠️ 使用規範",
        items: [
          "設計需為原創或已取得合法授權素材",
          "禁止使用未授權品牌 Logo、角色或他人作品",
          "設計者需自行負責作品合法性與授權確認",
          "若涉及侵權，平台有權下架或停止使用",
        ],
      },
      {
        heading: "💼 商用提醒",
        items: [
          "作品可能用於商業販售或品牌用途",
          "請務必確認所有素材可商用",
          "建議避免任何潛在侵權風險",
        ],
      },
      {
        heading: "💡 設計建議",
        items: [
          "建議使用高解析度設計（300 DPI）",
          "建議提供 AI / PSD 可編輯源檔",
          "避免使用網路未授權圖片或素材",
        ],
      },
      {
        heading: "📌 使用範圍",
        text: "適用於商業設計、品牌合作與商品化應用",
      },
    ],
    confirmLabel: "確認並進入專業設計",
    confirmButtonClassName: "bg-blue-500 hover:bg-blue-600",
  },
};
