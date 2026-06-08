import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
  const path = join(import.meta.dirname, "..", ".env.local");
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const resendKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const fromEmail = process.env.EMAIL_FROM;
const cronSecret = process.env.CRON_SECRET;

let failed = false;

function fail(message) {
  console.log(`✗ ${message}`);
  failed = true;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.log(`⚠ ${message}`);
}

console.log("檢查 Email / Cron 環境變數…\n");

if (!resendKey || resendKey.includes("xxxxxxxx")) {
  fail("RESEND_API_KEY 未設定或仍為範例值");
} else if (!resendKey.startsWith("re_")) {
  warn("RESEND_API_KEY 格式可能不正確（通常以 re_ 開頭）");
} else {
  pass("RESEND_API_KEY 已設定");
}

if (!adminEmail || adminEmail.includes("yourdomain")) {
  fail("ADMIN_EMAIL 未設定或仍為範例值");
} else {
  pass(`ADMIN_EMAIL：${adminEmail}`);
}

if (!fromEmail || fromEmail.includes("yourdomain")) {
  warn("EMAIL_FROM 未設定，將使用 Resend 預設寄件者 onboarding@resend.dev");
} else {
  pass(`EMAIL_FROM：${fromEmail}`);
}

if (!cronSecret || cronSecret.includes("your-random")) {
  warn(
    "CRON_SECRET 未設定；部署後 /api/cron/cleanup-drafts 將拒絕執行（請在 Vercel 設定）",
  );
} else if (cronSecret.length < 16) {
  warn("CRON_SECRET 建議至少 16 字元");
} else {
  pass("CRON_SECRET 已設定");
}

console.log("");
if (failed) {
  console.log(
    "Email 通知尚未就緒；申請仍可送出至雲端，但不會寄信。請編輯 .env.local。",
  );
  process.exit(1);
}

console.log("Email 環境變數檢查通過，送出申請時應可寄送通知。");
