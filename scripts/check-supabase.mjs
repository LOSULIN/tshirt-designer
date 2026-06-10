import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "designs";
const TEST_ID = `test-${Date.now()}`;

let failed = false;

function fail(message) {
  console.log(`✗ ${message}`);
  failed = true;
}

function pass(message) {
  console.log(`✓ ${message}`);
}

console.log("檢查 Supabase 連線…\n");

if (!url || !serviceKey) {
  fail("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  console.log("\n請複製 .env.example → .env.local 並填入 Supabase 金鑰。");
  console.log("設定說明：docs/SUPABASE_SETUP.md");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

if (bucketError) {
  fail(`Storage 連線失敗：${bucketError.message}`);
} else {
  const designs = buckets?.find((b) => b.id === BUCKET);
  if (!designs) {
    fail(`找不到 bucket「${BUCKET}」— 請執行 supabase/schema.sql`);
  } else {
    pass(
      `Storage bucket「${BUCKET}」存在（public: ${designs.public ? "是" : "否"}）`,
    );
    if (designs.public) {
      console.log("  ⚠ 建議將 bucket 設為私有（public: false）");
    }
  }
}

const { error: tableReadError } = await supabase
  .from("design_submissions")
  .select("id")
  .limit(1);

if (tableReadError) {
  fail(`資料表 design_submissions 讀取失敗：${tableReadError.message}`);
} else {
  pass("資料表 design_submissions 可讀取");
}

const { error: submissionsReadError } = await supabase
  .from("submissions")
  .select("id")
  .limit(1);

if (submissionsReadError) {
  fail(`資料表 submissions 讀取失敗：${submissionsReadError.message}`);
} else {
  pass("資料表 submissions 可讀取");
}

const testPath = `drafts/${TEST_ID}/ping.json`;
const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(testPath, Buffer.from('{"ok":true}', "utf-8"), {
    contentType: "application/json",
    upsert: true,
  });

if (uploadError) {
  fail(`Storage 上傳測試失敗：${uploadError.message}`);
} else {
  pass("Storage 上傳測試成功");
  await supabase.storage.from(BUCKET).remove([testPath]);
}

const now = new Date().toISOString();
const expires = new Date(Date.now() + 60_000).toISOString();

const { error: insertError } = await supabase.from("design_submissions").insert({
  id: TEST_ID,
  created_at: now,
  template_type: "male",
  side: "front",
  status: "draft",
  storage_path: `drafts/${TEST_ID}`,
  expires_at: expires,
  submission_type: "normal",
  review_status: null,
  submission_no: `FD-${TEST_ID}`,
});

if (insertError) {
  fail(`資料表 design_submissions 寫入失敗：${insertError.message}`);
} else {
  pass("資料表 design_submissions 寫入測試成功");
  await supabase.from("design_submissions").delete().eq("id", TEST_ID);
}

const { error: submissionsInsertError } = await supabase.from("submissions").insert({
  id: TEST_ID,
  created_at: now,
  status: "pending",
  product: "basic-tshirt",
  fit: "male",
  print_side: "front",
  file_name: "test.pdf",
  file_format: "PDF",
  file_size_bytes: 1024,
  file_size_label: "1.0 KB",
  storage_path: `pro-uploads/${TEST_ID}`,
  inspection_checks: [],
  applicant_name: "測試",
  applicant_email: "test@example.com",
  applicant_phone: "0900000000",
  submission_no: `PD-${TEST_ID}`,
});

if (submissionsInsertError) {
  fail(`資料表 submissions 寫入失敗：${submissionsInsertError.message}`);
} else {
  pass("資料表 submissions 寫入測試成功");
  await supabase.from("submissions").delete().eq("id", TEST_ID);
}

const CONTEST_TEST_ID = `contest-${TEST_ID}`;

const { error: contestInsertError } = await supabase.from("design_submissions").insert({
  id: CONTEST_TEST_ID,
  created_at: now,
  template_type: "male",
  side: "front",
  status: "submitted",
  storage_path: `submitted/${CONTEST_TEST_ID}`,
  expires_at: null,
  submission_type: "contest",
  design_name: "測試作品",
  description: "測試投稿說明",
  author_name: "測試作者",
  author_email: "test@example.com",
  product_type: "basic-tshirt",
  review_status: "pending",
  submission_no: `CT-${CONTEST_TEST_ID}`,
});

if (contestInsertError) {
  fail(`design_submissions 徵選投稿寫入失敗：${contestInsertError.message}`);
} else {
  pass("design_submissions 徵選投稿寫入測試成功");
  await supabase.from("design_submissions").delete().eq("id", CONTEST_TEST_ID);
}

console.log("");

if (failed) {
  console.log("請依 docs/SUPABASE_SETUP.md 完成設定後再試。");
  process.exit(1);
}

console.log("Supabase 設定檢查通過，可進行儲存與申請送出測試。");
