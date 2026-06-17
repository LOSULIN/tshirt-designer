# Supabase 建置指南（第二步）

本專案使用 Supabase 做兩件事：

1. **Storage** — 儲存設計草稿與送出檔案（PNG、JSON）
2. **Database** — 記錄草稿／申請狀態，供清理過期草稿

所有存取皆透過 **Next.js API + Service Role Key**（前端不直連 Supabase）。

---

## 步驟 1：建立 Supabase 專案

1. 前往 [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. **New project**
3. 填寫：
   - **Name**：例如 `dressup-designer`
   - **Database Password**：自行設定並**妥善保存**
   - **Region**：選離用戶最近的區域（台灣用戶可選 `Southeast Asia (Singapore)`）
4. 等待專案建立完成（約 1～2 分鐘）

---

## 步驟 2：執行 SQL 建立資料表與 Bucket

1. 左側選 **SQL Editor** → **New query**
2. 開啟本專案 [`supabase/schema.sql`](../supabase/schema.sql)，複製全部內容貼上
3. 按 **Run**

成功後應有：

| 項目 | 名稱 | 說明 |
|------|------|------|
| 資料表 | `design_submissions` | 草稿 + 已送出申請 |
| Storage bucket | `designs` | **私有**，單檔上限 50 MB |

### 手動確認（可選）

- **Table Editor** → 應看到 `design_submissions`
- **Storage** → 應看到 bucket `designs`（Public 為 **OFF**）

---

## 步驟 3：取得 API 金鑰

1. 左側 **Project Settings**（齒輪）→ **API**
2. 複製以下兩項到 `.env.local`：

| Supabase 畫面 | 環境變數 |
|---------------|----------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| service_role（secret） | `SUPABASE_SERVICE_ROLE_KEY` |

> **注意**：`service_role` 僅能放在伺服器端（`.env.local`、Vercel 環境變數），**絕不可**提交到 Git 或暴露給瀏覽器。

---

## 步驟 4：設定本機環境變數

```bash
cd temp-project
cp .env.example .env.local
```

編輯 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# 必填（部署）：保護草稿清理 API（至少 16 字元隨機字串）
CRON_SECRET=自行設定一組隨機字串

# Email 通知（選用，送出申請時寄信）
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=設計器 <noreply@yourdomain.com>
ADMIN_EMAIL=admin@yourdomain.com
```

---

## 步驟 5：驗證連線

```bash
npm run check:supabase
```

預期輸出：

```
✓ 連線成功
✓ Storage bucket「designs」存在
✓ 資料表 design_submissions 可讀寫
```

---

## 步驟 6：重啟開發伺服器並測試

```bash
npm run dev
```

1. 在設計器上傳圖片或新增文字
2. 點 **儲存設計**
3. 到 Supabase **Storage → designs** 應出現 `drafts/{id}/` 資料夾
4. **Table Editor → design_submissions** 應有一筆 `status = draft`

送出申請後：

- Storage：`submitted/{id}/`（含 `completed.png`、`design.json` 等）
- 資料表：`status = submitted`

---

## Storage 目錄結構

```
designs/
├── drafts/{draftId}/
│   ├── design.json
│   ├── texts.json      （若有文字圖層）
│   ├── preview.png     （若有圖片）
│   └── original.png    （第一張上傳原圖）
└── submitted/{designId}/
    ├── completed.png   （3779×4724 設計稿）
    ├── design.json
    ├── texts.json
    ├── applicant.json
    └── original.png    （若有）
```

---

## 草稿自動清理（部署）

草稿預設保留 **48 小時**（`DRAFT_TTL_MS`）。

專案已包含 `vercel.json`，每天 **03:00 UTC** 呼叫：

```
GET /api/cron/cleanup-drafts
Authorization: Bearer {CRON_SECRET}
```

### Vercel 部署檢查清單

1. 將專案連結至 Vercel，Root Directory 設為 `temp-project`（若從 monorepo 部署）
2. 在 Vercel **Environment Variables** 設定與 `.env.local` 相同變數，**務必包含 `CRON_SECRET`**
3. Vercel 偵測到 `CRON_SECRET` 後，Cron 請求會自動帶入 `Authorization: Bearer …`
4. 未設定 `CRON_SECRET` 時，清理 API 回傳 **503**（拒絕執行），避免被任意呼叫
5. 部署後執行 `npm run check:supabase`、`npm run check:email` 驗證

手動測試清理（本機或正式環境）：

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://你的網域/api/cron/cleanup-drafts
```

---

## 常見問題

### `缺少 Supabase 環境變數`
`.env.local` 未設定或變數名稱錯誤。修改後需**重啟** `npm run dev`。

### `Bucket not found`
未執行 `schema.sql`，或 bucket 名稱不是 `designs`。

### `new row violates row-level security policy`
資料表 RLS 已啟用但用了 anon key。請確認 API 使用 **service_role**（本專案 `lib/supabase/admin.ts` 已正確設定）。

### 上傳失敗 `Payload too large`
單檔超過 50 MB。可於 Supabase Storage 設定調高，或壓縮上傳圖片。

### 送出申請顯示「寫入資料庫失敗」
多半是資料表尚未套用 Proof Engine 等新欄位。請在 **SQL Editor** 執行：

[`supabase/migrations/APPLY_ALL.sql`](../supabase/migrations/APPLY_ALL.sql)

或至少執行：

[`supabase/migrations/20250611120000_add_proof_engine_fields.sql`](../supabase/migrations/20250611120000_add_proof_engine_fields.sql)

完成後再跑：

```bash
npm run check:supabase
```

應看到 `design_submissions Proof Engine 欄位寫入測試成功`。

---

## 下一步

完成本步驟後，繼續：

- **第三步**：設定 Resend Email（`RESEND_API_KEY`、`EMAIL_FROM`、`ADMIN_EMAIL`）
- **第四步**：部署至 Vercel 並設定正式環境變數
