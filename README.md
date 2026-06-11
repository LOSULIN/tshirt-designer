# DressUp 服飾設計器

線上服飾客製化設計平台，參考 DressUp 介面架構，**不含購物車與結帳功能**，專注於設計操作與申請送出。

## 功能架構

```
┌─────────────────────────────────────────────────────────────┐
│  Header：Logo · 導覽 · [儲存設計] [儲存並發送申請]           │
├────┬──────────┬─────────────────────────┬──────────────────┤
│圖示│ 設定面板  │      設計畫布          │   模特 / 尺寸     │
│導覽│ 商品/設計 │  模特預覽 + 圖層編輯   │   身形建議        │
│列  │ 文字/圖層│  正面/背面 · 縮放      │                   │
└────┴──────────┴─────────────────────────┴──────────────────┘
```

### 設計操作
- 商品選擇（款式、顏色、版型、材質、尺寸）
- 圖片上傳、文字圖層、拖曳/縮放/旋轉
- 圖層管理（順序、可見性、鎖定）
- 格線吸附與元素對齊

### 儲存與發送申請
點擊「儲存並發送申請」後：
1. 填寫申請人聯絡資訊
2. 設計檔案上傳至 **Supabase Storage**（雲端硬碟）
3. 透過 **Resend** 寄送 Email 通知（含檔案下載連結）

## 模特模板素材

正式 PNG 請放入 `public/templates/`，檔名與尺寸規格見：

**[public/templates/README.md](public/templates/README.md)**

放入後執行：

```bash
npm run check:templates
```

確認 `adult-tshirt-{color}-front.png` / `back.png`（10 色）皆為 **1024×1536 px**，並執行 `npm run check:template-alignment` 檢查印刷區對位。

## 快速開始

```bash
cd temp-project
npm install
cp .env.example .env.local
# 編輯 .env.local 填入 Supabase 與 Resend 設定
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 環境變數

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 專案 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key |
| `RESEND_API_KEY` | Resend API 金鑰 |
| `EMAIL_FROM` | 寄件者地址 |
| `ADMIN_EMAIL` | 接收申請通知的管理員 Email |
| `CRON_SECRET` | 保護草稿清理 API（**部署必填**，至少 16 字元） |

驗證指令：

```bash
npm run check:supabase
npm run check:email
```

未設定 Resend 時，申請仍可上傳雲端，但**不會寄信**；畫面會顯示實際狀態而非「已寄送 Email」。

## Supabase 設定（第二步）

完整圖文教學：**[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)**

快速流程：

1. [Supabase Dashboard](https://supabase.com/dashboard) 建立專案
2. SQL Editor 執行 [`supabase/schema.sql`](supabase/schema.sql)
3. 複製 Project URL + `service_role` 到 `.env.local`
4. 驗證：`npm run check:supabase`

## 部署至 Vercel

1. 推送程式碼並在 Vercel 建立專案
2. 設定環境變數（見上方表格，**含 `CRON_SECRET`**）
3. `vercel.json` 已設定每日 Cron 清理過期草稿
4. 部署後執行 `npm run check:supabase` 與 `npm run check:email`

詳見 [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) 的「Vercel 部署檢查清單」。

## 技術棧

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Storage（雲端儲存）
- Resend（Email 通知）
- Canvas API（設計匯出）
