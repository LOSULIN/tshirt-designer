# Preview Scale Contract

> **Version:** Step 10.2A  
> **Status:** Architecture only — no runtime changes  
> **Prerequisite:** Step 9 Template Calibration, Step 10.1 Preview Scale Analysis  
> **Related:** `public/guides/preview-scale-architecture-report.json`, `public/guides/preview-scale-flow.svg`

本文件定義設計器 Preview 中所有 **Scale** 的職責邊界。  
Production / Export / Layer cm 為真相來源；Preview Scale 僅影響螢幕呈現與操作體驗。

---

## DOM 層級（契約前提）

```
ShirtContainerFrame          ← Container Fit + Canvas Zoom（整體）
  └─ data-shirt-container    ← 1024×1536 邏輯座標
       ├─ ShirtVisualScale   ← Shirt Visual Scale（僅 PNG）
       └─ div[data-print-area]  ← Print Area Scale（藍框）
            ├─ GarmentPrintSafeZoneGuide  ← Orange（藍框內 %，無獨立 scale）
            ├─ PrintAreaGrid
            └─ PrintAreaElement           ← Layer（cm → 藍框內 %）
```

**關鍵契約：** Shirt PNG 與 Blue Print Area 為 **兄弟節點**。Shirt 的 CSS `transform` 不得假設會帶動 Blue、Orange、Layer。

---

## Scale 清單

### 1. Container Fit Ratio

| 欄位 | 內容 |
|------|------|
| **名稱** | Container Fit Ratio |
| **Owner** | `DesignCanvas` → `ShirtContainerFrame` |
| **來源** | `PREVIEW_FIT_RATIO = 0.9`（主畫布）；`FlatShirtDesignView` compact 模式 `0.95` |
| **影響範圍** | 邏輯 container 在 viewport 內的最大顯示尺寸（`min(100cqw × ratio, …)`） |
| **不得影響** | Layer cm、Export、Production、各子系統內部 scale 公式 |

**用途：** 避免寬螢幕下模特頭頂／底部被裁切；純 viewport 排版。

---

### 2. Canvas Zoom

| 欄位 | 內容 |
|------|------|
| **名稱** | Canvas Zoom |
| **Owner** | `DesignCanvas` → `ShirtContainerFrame` |
| **來源** | `ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75]`；`getDefaultZoomIndexForSize()` → `clamp(1 / getShirtScale(size), 0.75, 1.75)` |
| **影響範圍** | 整個 `ShirtContainerFrame` 的 CSS `transform: scale(zoom)`（Shirt + Blue + Orange + Layer 一併放大） |
| **不得影響** | Layer cm 狀態、Export、Production mm、儲存的設計資料 |

**用途：** 放大操作畫面；小尺碼預設較高 zoom 以補償視覺可讀性。

**附註：** `PrintAreaPreviewPanel`、`ClothingBrowseModal`、`TshirtSizeGuideModal` 各有獨立 `ZOOM_STEPS`，契約相同但 Owner 不同（次級 Preview UI）。

---

### 3. Garment Scale（胸寬比例）

| 欄位 | 內容 |
|------|------|
| **名稱** | Garment Scale |
| **Owner** | `lib/shirtScale.ts` — `getShirtScale(size)` |
| **來源** | 官方胸寬 / M 基準胸寬（`BASELINE_CHEST_CM`）；`product-size-config` 優先於 legacy `sizes.ts` |
| **影響範圍** | **共用輸入** — 被 Shirt Visual、Print Area、Orange % 計算、Canvas 預設 Zoom 引用 |
| **不得影響** | 直接修改 Layer cm；不寫入 export payload（export 用 production mm） |

**用途：** 單一尺碼比例真相（scale = 1.0 @ M）。

**契約：** 所有需要「依尺碼縮放」的 Preview 子系統應引用此函式，不得各自維護胸寬比例表。

---

### 4. Silhouette Scale（模板 PNG 補償）

| 欄位 | 內容 |
|------|------|
| **名稱** | Silhouette Scale |
| **Owner** | `lib/template-profile` → `ShirtVisualScale` |
| **來源** | `profile.measurement.silhouetteScale`（`adult-white-front`: **1.1127** = 612÷550） |
| **影響範圍** | 僅 `ShirtVisualScale` 內 `ProcessedTemplateImage` 的 CSS `transform` |
| **不得影響** | Blue DOM、Orange、Layer cm、Export、Production、Print Area anchor |

**用途：** 校正 PNG 腋下胸寬對齊印刷標定線（612px）；Step 9.1 套用。

**契約：** 此 scale 僅屬 **Garment Silhouette 座標系**，不屬 Print Overlay 座標系。

---

### 5. Shirt Visual Scale（合成）

| 欄位 | 內容 |
|------|------|
| **名稱** | Shirt Visual Scale |
| **Owner** | `ShirtVisualScale` |
| **來源** | `garmentScale = getShirtScale(size) × silhouetteScale` |
| **影響範圍** | 衣服 PNG 視覺大小與輪廓；`transform-origin: center center` |
| **不得影響** | Blue、Orange、Layer、Export、Production |

**用途：** 讓模板 PNG 在 Preview 中呈現正確衣身比例。

---

### 6. Print Area Base Pct（固定 cm → container %）

| 欄位 | 內容 |
|------|------|
| **名稱** | Print Area Base Pct |
| **Owner** | `lib/design-cm.ts` → `getPrintAreaCmToTemplateContainerPct()` |
| **來源** | 面別最大印刷區 cm（正面 35×50）× `ADULT_TSHIRT_TEMPLATE_PX_PER_CM`（12.24）÷ container 1024×1536 |
| **影響範圍** | 藍框 @ M 的基準 `widthPct` / `heightPct`（約 41.8% × 39.8%） |
| **不得影響** | 隨尺碼變化（本身不含 size）；不寫入 layer state |

**用途：** 將 production 印刷規格映射到模板 container 的固定比例。

**契約：** 這是 **常數比例**，不是尺碼 scale；尺碼縮放由 Print Area Scale 疊加。

---

### 7. Print Area Scale（Preview 藍框尺碼縮放）

| 欄位 | 內容 |
|------|------|
| **名稱** | Print Area Scale |
| **Owner** | `lib/coordinates/preview.ts` — `getPreviewPrintAreaScale()` |
| **來源** | `max(MIN_PREVIEW_PRINT_AREA_SCALE, getShirtScale(size))`；floor = **0.85** |
| **影響範圍** | `getPreviewPrintAreaContainerStyle()` 的 `widthPct × scale`、`heightPct × scale`；`div[data-print-area]` DOM 尺寸 |
| **不得影響** | Layer cm、Export、Production mm、儲存的设计座標 |

**用途：** 讓藍框隨尺碼縮放；0.85 floor 保留童碼可操作區。

**已知問題（Step 10.1）：** 90/130 時 `shirtScale < 0.85`，藍框大於衣身 → 與 Shirt Visual Scale 脫鉤。

**契約缺口：** Mockup 路徑（`lib/coordinates/mockup.ts`）**不套用**此 scale，與 editor 不一致。

---

### 8. Print Area Anchor（定位，非 scale）

| 欄位 | 內容 |
|------|------|
| **名稱** | Print Area Anchor |
| **Owner** | `lib/coordinates/garment.ts` → `getGarmentPrintReference()` |
| **來源** | Container 中心 (512, 768) + `GARMENT_TEMPLATE_OFFSET_PX`；`translate(-50%, -50%)` |
| **影響範圍** | 藍框在 container 內的 `left` / `top` 錨點 |
| **不得影響** | Layer cm、Export、Production |

**用途：** 固定藍框錨點，避免隨尺碼 collar 推算漂移。

**附註：** 非 scale，但與 Orange 的 collar-based 上緣計算策略不同（Step 9.2 QA 已記錄）。

---

### 9. Orange Safe Zone Layout

| 欄位 | 內容 |
|------|------|
| **名稱** | Orange Safe Zone Layout |
| **Owner** | `GarmentPrintSafeZoneGuide` → `lib/coordinates/garment.ts` |
| **來源** | `getGarmentPrintSafeZonePctInPrintArea()`：safe cm（`garment-print-config`）vs print cm → 藍框內 `left/top/width/height %` |
| **影響範圍** | 橘色虛線 Guide 在藍框 DOM 內的位置與大小 |
| **不得影響** | Layer 可編輯範圍、Export、Production；不得寫入 layer state |

**用途：** 尺碼建議安全區視覺提示。

**契約：** **不得擁有獨立 Scale 乘數。** 像素尺寸完全繼承 Blue DOM；% 計算引用 `getShirtScale` 與 `pxPerCm`，不引用 `previewPrintAreaScale`。

---

### 10. Layer Layout（cm → 藍框 %）

| 欄位 | 內容 |
|------|------|
| **名稱** | Layer Layout |
| **Owner** | `PrintAreaElement` / `FlatShirtDesignView.StaticDesignLayer` |
| **來源** | Layer state：`x_cm`, `y_cm`, `width_cm`, `height_cm`（`lib/design-cm.ts` ↔ `production.ts` mm） |
| **影響範圍** | 圖層在藍框內的 `left/top/width/height %`；拖曳／縮放換算 |
| **不得影響** | 被 Preview Scale 反向修改 cm 值（cm 為寫入真相） |

**用途：** 將 production cm 呈現於 Preview。

**契約：** Layer Layout **沒有 Preview scale 乘數**；藍框 DOM 變大/變小時，% 不變、像素跟著變。

---

### 11. Layer Content Scale（圖層內容縮放）

| 欄位 | 內容 |
|------|------|
| **名稱** | Layer Content Scale |
| **Owner** | `PrintAreaElement`；layer `scale` 欄位（image / shape） |
| **來源** | 使用者操作；儲存於 layer state |
| **影響範圍** | 圖層有效 cm 矩形（`getLayerEffectiveCmRect`）；**會進入 Export / Production** |
| **不得影響** | Preview 架構 scale 鏈（此為設計資料，非 UI 縮放） |

**用途：** 圖片／形狀在印刷區內的縮放。

**契約：** 屬 **設計狀態**，不屬 Preview Scale Contract 的 UI 縮放層；但必須與 Layer Layout 區分。

---

### 12. Overlay Px Per Cm（標定常數）

| 欄位 | 內容 |
|------|------|
| **名稱** | Overlay Px Per Cm |
| **Owner** | `lib/template-metrics.ts` — `ADULT_TSHIRT_TEMPLATE_PX_PER_CM = 12.24` |
| **來源** | 612px 標定胸寬 ÷ 50cm（legacy M 胸寬基準） |
| **影響範圍** | Print Area Base Pct、Blue/Orange px 換算、export overlay 像素密度 |
| **不得影響** | 隨尺碼變化；不替代 `getShirtScale` |

**用途：** Print Overlay 座標系與 Production cm 的橋接常數。

---

## Scale 依賴圖（簡表）

| Scale | 依賴 | 套用對象 |
|-------|------|----------|
| Container Fit | — | ShirtContainerFrame 尺寸 |
| Canvas Zoom | `getShirtScale`（預設值） | 整個 frame |
| Garment Scale | 胸寬表 | 共用輸入 |
| Silhouette Scale | template profile | Shirt PNG only |
| Shirt Visual | Garment × Silhouette | Shirt PNG only |
| Print Base Pct | 35×50cm, 12.24 | 藍框基準 % |
| Print Area Scale | Garment + 0.85 floor | 藍框 % 乘數 |
| Orange Layout | Garment, safe cm, Blue DOM | 橘框 % |
| Layer Layout | Layer cm, Blue DOM | 圖層 % |

---

## 重複、可刪除、應保留

### 目前有哪些 Scale 是重複的？

| 重複類型 | 說明 |
|----------|------|
| **Garment Scale 雙重套用（意圖重疊）** | `previewPrintAreaScale` 與 `getShirtScale` 本應同源，但 0.85 floor 使童碼脫鉤 |
| **小尺碼可讀性雙重補償** | `previewPrintAreaScale` floor（放大藍框）與 `getDefaultZoomIndexForSize`（放大整體 Canvas Zoom）同時試圖解決童碼太小問題 |
| **API 別名冗餘** | `getPreviewGarmentVisualScale()` / `getPreviewGarmentVisualTransform()` 僅轉呼叫 `getShirtScale` |
| **多處獨立 ZOOM_STEPS** | `DesignCanvas`、`PrintAreaPreviewPanel`、`ClothingBrowseModal`、`TshirtSizeGuideModal` 各自定義步進 |
| **Editor vs Mockup 藍框** | Editor 有 `previewPrintAreaScale`；Mockup 無 — 同一印刷區兩套 DOM 尺寸規則 |
| **Orange vs Blue 定位基準** | Orange 用 collar+offset；Blue 用 container center — 非 scale 重複，但是視覺錨點分裂 |

**不是重複（應視為疊加）：**

- `silhouetteScale` × `getShirtScale` on Shirt PNG — 兩個座標系（silhouette vs overlay）的刻意分離
- `Canvas Zoom` × 內部 scale — Zoom 為均勻外層放大，不改變相對比例

---

### 哪些可以刪除？

| 候選 | 理由 | 風險 |
|------|------|------|
| **`previewPrintAreaScale` 0.85 floor** | 造成 90/130 藍框大於衣身；Step 10.1 建議改 Blue = `getShirtScale()` | 需以 Canvas Zoom 補操作區；需同步 `garment.ts` Orange % |
| **`getPreviewGarmentVisualScale` 別名** | 無獨立邏輯，增加混淆 | 低；僅 debug-print-area 引用 |
| **部分重複 ZOOM_STEPS 定義** | 可抽共用常數 | 低優先；各面板需求可能不同 |
| **Mockup 與 Editor 藍框分歧** | 應統一為單一 Print Area Scale 規則 | 需回歸 mockup 視覺 |

**不應刪除：**

- `getShirtScale` — 尺碼比例唯一來源
- `silhouetteScale` — PNG 標定補償（Step 9 成果）
- `Canvas Zoom` — 純 UI，與 production 隔離
- Layer cm — production 真相

---

### 哪些應該保留？

| Scale | 保留理由 |
|-------|----------|
| **Garment Scale** (`getShirtScale`) | 胸寬比例單一真相；Production 與 Preview 共用輸入 |
| **Silhouette Scale** | PNG 與標定線對齊；不污染 overlay / export |
| **Canvas Zoom** | 唯一允許的「純螢幕放大」；不寫入設計狀態 |
| **Container Fit Ratio** | Viewport 排版；與尺碼無關 |
| **Print Area Base Pct + 12.24 px/cm** | Production cm 與 template container 的固定契約 |
| **Layer cm Layout** | Export / Factory 真相 |
| **Orange %（無獨立 scale）** | 正確模式：繼承 Blue DOM |

---

## 目標契約（Step 10.x 方向，尚未實作）

```
Garment Scale (getShirtScale)     →  Blue DOM 尺碼乘數（移除 0.85 floor）
Silhouette Scale                  →  Shirt PNG only（維持）
Canvas Zoom                       →  唯一 UI 放大層（維持）
Layer cm                          →  Production 真相（維持）
Orange                            →  藍框內 %，無獨立 scale（維持）
```

**禁止：** 任何 Preview Scale 寫入 layer state、export payload、production mm。

---

## 變更紀錄

| Step | 內容 |
|------|------|
| 9.1 | 套用 `silhouetteScale: 1.1127` |
| 10.1 | 識別 `previewPrintAreaScale` floor 為 90/130 脫鉤根因 |
| 10.2A | 本契約文件（architecture only） |
