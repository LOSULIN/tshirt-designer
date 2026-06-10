/** 將 Supabase insert/update 錯誤轉成可顯示的訊息（不含敏感資料） */
export function formatDbWriteError(error: {
  code?: string;
  message?: string;
}): string {
  const message = error.message?.trim() ?? "未知錯誤";

  if (message.includes("proof_version")) {
    return "資料庫缺少 Proof Engine 欄位，請在 Supabase SQL Editor 執行 supabase/migrations/20250611120000_add_proof_engine_fields.sql";
  }

  if (message.includes("shirt_color")) {
    return "資料庫缺少 shirt_color 欄位，請在 Supabase SQL Editor 執行 supabase/migrations/20250610140000_add_shirt_color.sql";
  }

  if (message.includes("submission_no")) {
    return "資料庫缺少 submission_no 欄位，請在 Supabase SQL Editor 執行 supabase/migrations/20250610130000_add_submission_no.sql";
  }

  if (error.code === "23505") {
    return "編號衝突，請稍後再試";
  }

  return `寫入資料庫失敗：${message}`;
}
