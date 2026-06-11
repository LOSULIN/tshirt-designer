# T 恤模板素材

設計器平面預覽與 mockup 使用 **依顏色分檔** 的成人 T 恤模板。

## 必要檔案（10 色 × 正背面 = 20 張）

檔名規則：

```
adult-tshirt-{color}-front.png
adult-tshirt-{color}-back.png
```

`{color}` 與 `lib/constants.ts` → `SHIRT_COLORS` 的 `id` 一致：

`white` · `black` · `heather-grey` · `navy` · `royal-blue` · `sky-blue` · `pink` · `hot-pink` · `light-yellow` · `mustard-green`

路徑解析：`lib/shirt-template.ts` → `getAdultTshirtTemplateSrc(color, side)`

## 圖片規格

| 項目 | 數值 |
|------|------|
| 畫布尺寸 | **1024 × 1536 px**（寬 × 高，2∶3） |
| 格式 | **PNG**（建議透明底） |
| 構圖 | 平面 T 恤置中；可印刷胸口／背部應落在畫布上方約 **y ≈ 0–300 px** 區間 |

> **注意：** 工廠印刷檔匯出為 **35×50 cm @ 300 DPI（4134×5906 px）**，與模板畫布像素不同；模板僅供 UI／mockup 視覺對位。

## 印刷區 overlay 對位

- 物理印刷規格：**35 × 50 cm**（固定，與尺碼無關）
- UI 錨點：`lib/coordinates/preview.ts`（`x=0.5`, `y≈0.514`，中心較基準上移 25px）
- 製作模板後請執行對位檢查，確認藍色印刷框與衣服可印區域重疊。

## 模特模板（選用）

以下供 **模特預覽**（`getModelTemplateSrc`），與顏色平面模板分開：

| 檔名 | 用途 |
|------|------|
| `adult-male-front.png` / `back` | 成人男模 |
| `adult-female-front.png` / `back` | 成人女模 |
| `child-male-front.png` / `back` | 孩童男模 |
| `child-female-front.png` / `back` | 孩童女模 |

## 檢查指令

```bash
npm run check:templates
npm run check:template-alignment
npm run check:print-area
```

## 圖層疊加（設計器）

`ShirtContainerFrame`（1024×1536）→ `ShirtVisualScale`（模板圖）→ 同層外框上疊加 `data-print-area`（35×50 cm overlay）與設計圖層。
