# Template Coordinate Contract

> **Version:** Step 11.1  
> **Status:** Architecture only — no runtime changes  
> **Prerequisite:** Step 10 Preview Scale convergence complete  
> **Related:** `docs/architecture/preview-scale-contract.md`, `public/template-profiles/*.json`

本文件描述設計器中 **Template 座標** 的完整架構、來源、邊界與不可混用規則。  
不包含修改任何公式或 runtime 行為。

---

## 總覽：Runtime 座標系

| # | 座標系 | 單位 | 核心常數 | 用途 |
|---|--------|------|----------|------|
| 1 | **Template Canvas Physical** | px @ 1024×1536 | `ADULT_TSHIRT_TEMPLATE_SPEC` | PNG 畫布、container DOM |
| 2 | **Print Overlay** | cm → 12.24 px/cm | `template-metrics` | 藍框、layer overlay、preview 換算 |
| 3 | **Garment Silhouette Visual** | px + scale | `template-profile.garment`, `silhouetteScale` | 衣服 PNG CSS transform |
| 4 | **Template Placement** | px / ref % | container center, `GARMENT_TEMPLATE_OFFSET_PX` | 藍框錨點、print reference |
| 5 | **Collar / Print Offset** | px + cm | `COLLAR_ANCHOR_Y_PX`, `PRINT_AREA_OFFSET_CM` | 橘框、metrics、proof metadata |
| 6 | **Production Physical** | mm @ 300 DPI | `production.ts` | Export、factory、layer 真相 |

**Production（#6）是唯一物理真相；其餘皆為 Preview / UI 呈現。**

---

## A. Template Physical Coordinate

### 來源模組

| 模組 | 常數 / API | 值（@ M baseline） |
|------|-----------|-------------------|
| `lib/template-metrics.ts` | `ADULT_TSHIRT_TEMPLATE_CHEST_PX` | **612** px（標定胸寬線） |
| `lib/template-metrics.ts` | `ADULT_TSHIRT_TEMPLATE_PX_PER_CM` | **12.24** px/cm |
| `lib/shirt-template.ts` | `ADULT_TSHIRT_TEMPLATE_SPEC` | **1024×1536** px, PNG path pattern |
| `lib/shirt-template.ts` | `getTemplatePxPerCm()` | → 12.24 |
| `lib/coordinates/preview.ts` | `PREVIEW_CONTAINER` | 1024×1536（與 SPEC 一致） |
| `lib/coordinates/garment.ts` | `GARMENT_UI_CONTAINER` | 1024×1536（重複定義） |
| `lib/coordinates/mockup.ts` | `MOCKUP_*_CONTAINER` | 1024×1536（重複定義） |

### 用途

- 定義成人 T 恤平面模板 PNG 的**像素畫布**
- 提供 **Print Overlay** 的 px/cm 換算（612 ÷ 50cm legacy M = 12.24）
- 作為 `design-cm` 將 cm 映射到 container `%` 的寬高基準

### Owner

`lib/template-metrics.ts`（底層常數）→ `lib/shirt-template.ts`（facade + path）

### 誰引用（Runtime）

| 消費者 | 引用 | Runtime? | Production? |
|--------|------|----------|-------------|
| `design-cm.ts` | `ADULT_TSHIRT_TEMPLATE_SPEC`, `getTemplatePxPerCm` | ✅ | ❌（overlay only） |
| `preview.ts` | `ADULT_TSHIRT_TEMPLATE_PX_PER_CM` | ✅ | ❌ |
| `print-area-offset.ts` | `getTemplatePxPerCm()` | ✅ | ❌ |
| `garment.ts` | `getTemplatePxPerCm()` | ✅ | ❌ |
| `placement-presets.ts` | SPEC + pxPerCm | ✅ | ❌ |
| `printArea.ts` | via preview `PREVIEW_CONTAINER` | ✅ | ❌ |
| `production.ts` | **不引用** | — | ✅ 獨立 mm |

### 備註

- `template-metrics.ts` **刻意無其他依賴**（避免 constants ↔ shirt-template 循環）
- 12.24 px/cm 屬 **Print Overlay 座標系**，不是 PNG 腋下剪影比例（~10.58）

---

## B. Template Visual Coordinate

### 來源

| 來源 | 內容 | Runtime 使用? |
|------|------|---------------|
| `template-profile` → `garment` | `armpitChestWidthPx: 550`, `bodyLengthPx: 903`, `pxPerCm: 10.577` | ❌ 僅 Profile / Script |
| `template-profile` → `measurement.silhouetteScale` | **1.1127** (612÷550) | ✅ `ShirtVisualScale` only |
| `shirtScale.ts` | `getShirtScale(size)` | ✅ PNG + Blue scale |
| `ShirtVisualScale.tsx` | `garmentScale = shirtScale × silhouetteScale` | ✅ PNG only |
| PNG bbox（calibration report） | shirtBBox min/max | Script / QA only |
| `garment-visual-calibration.ts` | `GARMENT_PREVIEW_PRINT_SCALE = 1.15` | ❌ **Dead code**（零 import） |

### 哪些只是 PNG 視覺

- `silhouetteScale` — 補償 PNG 腋下 550px vs 標定線 612px
- `getShirtScale(size)` 套用於 `ShirtVisualScale` — 衣身隨尺碼縮放
- `armpitChestWidthPx`, `bodyLengthPx`, `garment.pxPerCm` — 描述 PNG 剪影量測，**尚未接入 runtime 公式**

### 哪些是真正 Runtime

- `ShirtVisualScale` → `getCurrentTemplateProfile()` + `getTemplateSilhouetteScale()` + `getShirtScale()`
- 衣服 PNG CSS `transform: scale(...)`，`transform-origin: center center`

### 邊界

**Visual 不得影響：** layer cm、export mm、藍框 cm 尺寸、production。

---

## C. Template Placement Coordinate

### 來源

| 常數 / API | 值 | Owner |
|-----------|-----|-------|
| `GARMENT_TEMPLATE_OFFSET_PX` | front/back `{0,0}` | `garment-template-calibration.ts` |
| `containerCenterPx` | (512, 768) | Profile + hardcoded in garment/preview |
| `getGarmentPrintReference()` | ref.x=0.5, ref.y=0.5 + offset | `garment.ts` |
| `getPreviewPrintReference()` | → garment | `preview.ts` |
| `PREVIEW_REFERENCE_TRANSFORM` | `translate(-50%,-50%)` | `preview.ts` |
| `COLLAR_ANCHOR_Y_PX_BY_SIDE` | front/back **386** | `print-area-offset.ts` |
| `PRINT_AREA_OFFSET_CM` | front **7**, back **5** | `print-area-offset.ts` |

### 資料流

```
1024×1536 Template Canvas
        │
        ├─ Shirt PNG (ShirtVisualScale)
        │     transform-origin: center (512,768)
        │     scale: shirtScale × silhouetteScale
        │
        └─ Blue Print Area (sibling, NOT inside ShirtVisualScale)
              anchor: getGarmentPrintReference()
                = container center (512,768)
                + GARMENT_TEMPLATE_OFFSET_PX
                → ref (0.5, 0.5)
              style: left/top % + translate(-50%,-50%)
              size: designer cm × 12.24 × shirtScale → width/height %

Orange Safe Zone (inside Blue)
              % from getGarmentPrintSafeZonePctInPrintArea()
              uses: COLLAR_ANCHOR + PRINT_AREA_OFFSET_CM + shirtScale
              (collar-based — 與 Blue center anchor 策略不同)
```

### 關鍵分裂

- **Blue 錨點：** container 中心（穩定、不隨 collar 漂移）
- **Orange / printTopPx：** 領口錨點 + offset cm（garment-relative）
- Step 9.2 QA 已記錄此分裂；非 bug，為架構選擇

---

## D. Template Print Coordinate

### 35×50 / 38×45 來源鏈

| 層級 | 正面 | 背面 | 來源模組 |
|------|------|------|----------|
| **Designer 藍框 max** | 35×50 cm | 38×45 cm | `garment-print-config.ts` → `GARMENT_MAX_PRINT_AREA_CM` |
| **design-cm bounds** | via `getDesignerPrintAreaCmBounds(side)` | 同上 | `design-cm.ts` |
| **Production export** | 35×50 cm (=350×500mm) | 35×50 cm | `production.ts` `PRODUCTION_PRINT_AREA_MM` |
| **Profile mirror** | `print.maxPrintAreaCm` | 同上 | `template-profile`（文件/校準） |

> 背面設計器藍框 38×45，但 production export 固定 35×50 — 已知分歧。

### Overlay Px Per Cm 鏈

```
template-metrics.ts  ADULT_TSHIRT_TEMPLATE_PX_PER_CM = 12.24
        ↓
shirt-template.ts  getTemplatePxPerCm()
        ↓
design-cm.ts       getOverlayPxPerCm()
        ↓
preview.ts         getPreviewPxPerCm() / PREVIEW_UI_UNITS_PER_MM
        ↓
getPrintAreaCmToTemplateContainerPct()  → 藍框 widthPct/heightPct
getPreviewPrintAreaContainerStyle()     → DOM style
PrintAreaElement                        → layer % inside blue
```

### design-cm 角色

- **橋接層：** production mm ↔ layer `_cm` ↔ overlay px ↔ container %
- `getPrintAreaCmBounds()` → production 35×50（export）
- `getDesignerPrintAreaCmBounds(side)` → designer 35×50 / 38×45（preview 藍框）
- **不讀取 template-profile**

---

## E. Production Coordinate

### 來源：`lib/coordinates/production.ts`

| 常數 | 值 | 說明 |
|------|-----|------|
| `PRODUCTION_DPI` | 300 | 工廠輸出 |
| `PRODUCTION_PRINT_AREA_MM` | 350×500 mm | 固定印刷區 |
| `MM_TO_EXPORT_PX` | 300/25.4 | mm → export px |
| `legacyCmFieldToMm` | cm × 10 | layer `_cm` → mm |

### 完全不依賴 Template

- Export PNG/PDF 尺寸來自 **mm + DPI**
- Layer state `x_cm/y_cm/width_cm/height_cm` 為 production 契約
- `getProductionPrintAreaMm()` 不讀 1024×1536、不讀 silhouetteScale、不讀 collar px

### 與 Template 的唯一接觸點

- **Preview 顯示** 透過 `design-cm` 將同一組 cm 畫在 template overlay 上
- Export pipeline 讀 layer cm → production mm → DPI px（跳過 template PNG 比例）

---

## F. Profile Coordinate

### 模組：`lib/template-profile/`

| 區塊 | 欄位 | Runtime 使用 | Script 使用 | 未來 |
|------|------|-------------|-------------|------|
| `canvas` | widthPx, heightPx, pathPattern | ❌（hardcoded elsewhere） | ✅ JSON + calibration | 可統一 container 來源 |
| `garment` | armpitChestWidthPx, bodyLengthPx, pxPerCm | ❌ | ✅ QA reports | 可接入 visual QA |
| `print` | chestReferencePx, pxPerCm, maxPrintAreaCm, productionPrintAreaMm | ❌（duplicate constants） | ✅ | 可成單一真相 |
| `measurement.collarAnchorYPx` | front 494, back 386 | ❌（runtime 用 print-area-offset 386） | ✅ | 待對齊 |
| `measurement.calibrationLine` | 206–818 @ y=386 | ❌ | ✅ overlays | debug |
| `measurement.containerCenterPx` | 512, 768 | ❌（hardcoded） | ✅ | 可統一 |
| `measurement.silhouetteScale` | 1.1127 | ✅ **ShirtVisualScale only** | ✅ | 保留 |
| `getTemplateProfile(id)` | — | ❌（僅 repo API） | ✅ | 保留 |
| `getCurrentTemplateProfile()` | — | ✅ ShirtVisualScale | — | 保留 |
| `getTemplateSilhouetteScale()` | — | ✅ ShirtVisualScale | — | 保留 |

### JSON 鏡像

`public/template-profiles/adult-white-front.json` — 由 `measure-template-calibration.mjs` 產出；`check-template-profile.mjs` 驗證；**runtime 不讀 JSON**。

---

## 問答（Step 11.1）

### 1. 目前 Runtime Template Coordinate 總共有幾套？

**6 套**（見總覽表）：

1. Template Canvas Physical（1024×1536 px）
2. Print Overlay（12.24 px/cm，612 標定）
3. Garment Silhouette Visual（550px 腋下 + silhouetteScale）
4. Template Placement（center anchor + offset）
5. Collar / Print Offset（386px + 7/5 cm）
6. Production Physical（mm @ 300 DPI）

### 2. Physical / Visual / Production 分類

| 分類 | 座標系 |
|------|--------|
| **Physical** | #1 Canvas px、#2 Print overlay px/cm、#5 Collar px |
| **Visual** | #3 Garment silhouette（PNG transform only） |
| **Production** | #6 mm/DPI（與 template 像素無關） |
| **混合 UI** | #4 Placement（px 畫布上的錨點，服務 preview） |

### 3. 哪些彼此不能混用？

| 禁止混用 | 原因 |
|----------|------|
| **12.24 px/cm** ↔ **10.577 px/cm (garment)** | 標定胸寬 vs PNG 腋下量測 |
| **silhouetteScale** ↔ **Blue / Layer cm** | PNG 視覺補償 vs production overlay |
| **Designer 38×45 back** ↔ **Production 35×50** | 預覽藍框 vs 工廠固定區 |
| **Profile collar 494** ↔ **Runtime collar 386** | Profile 未接線；不可假設一致 |
| **Template container px** ↔ **Export DPI px** | Preview DOM vs 工廠輸出 |
| **Canvas Zoom** ↔ **Layer cm** | 純 UI 放大 vs 設計真相 |

### 4. 哪些未來可以逐步移除？

| 候選 | 理由 |
|------|------|
| `lib/garment-visual-calibration.ts` | 零 runtime import，舊 Preview 1.15 scale |
| 重複的 1024×1536 定義（preview/garment/mockup/shirt-template） | 可收斂至 profile.canvas 或單一 constant |
| `template-metrics.ts` 獨立常數 | 可收斂至 `template-profile.print`（需遷移） |
| `GARMENT_COLLAR_LOW_Y_PX_BY_SIDE` 等 deprecated aliases（garment.ts） | 已標 deprecated |
| `PRINT_COLLAR_OFFSET_CM` alias（print-area-offset.ts） | 已標 deprecated |
| Profile 中 runtime 未使用的欄位 | 保留至接線完成前作校準文件 |

### 5. 哪些必須永遠保留？

| 必須保留 | 理由 |
|----------|------|
| `production.ts` mm + 300 DPI | 工廠物理真相 |
| Layer `_cm` 契約 | 設計狀態 / export |
| `getShirtScale(size)` | 尺碼比例唯一來源 |
| Print overlay 12.24 px/cm（或其 successor 單一來源） | cm → preview DOM 橋接 |
| `silhouetteScale`（或等價 PNG 校準） | 衣身視覺對齊標定線 |
| Container 1024×1536 規格 | PNG + DOM 基準 |
| `getPreviewPrintReference` / center anchor 鏈 | 藍框定位 API |

---

## 變更紀錄

| Step | 內容 |
|------|------|
| 9.x | Template calibration + silhouetteScale |
| 10.x | Preview Scale V2 convergence |
| 11.1 | 本文件（architecture only） |
