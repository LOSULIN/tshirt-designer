# T 恤模板素材

將正式 PNG 放入此資料夾後，設計器會自動載入。

## 必要檔案（共 2 張）

| 檔名 | 用途 |
|------|------|
| `adult-tshirt-front.png` | 正面模板（設計器預覽、衣服瀏覽、模特縮圖） |
| `adult-tshirt-back.png` | 背面模板 |

路徑定義：`lib/constants.ts` → `ADULT_TSHIRT_TEMPLATE`

## 圖片規格

| 項目 | 數值 |
|------|------|
| 尺寸 | **1024 × 1536 px**（寬 × 高） |
| 格式 | **PNG** |
| 衣服 | 建議白色或淺色素 T，方便預覽設計 |

## 印刷區對位

藍色可印刷區由 `lib/print-area.ts` → `FRONT_PRINT_AREA` / `BACK_PRINT_AREA` 控制（成人 Unisex，1024×1536）。製作模板時請確保胸口／背部可印刷範圍與藍框對齊。

檢查方式：

```bash
npm run check:templates
```

## 圖層疊加

設計器 DOM 順序：模板底圖（`TemplateImage`）在下，可印刷區與設計圖層（`data-print-area`）在上。
