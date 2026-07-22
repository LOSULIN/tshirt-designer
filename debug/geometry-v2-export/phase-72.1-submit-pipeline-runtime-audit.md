# Phase 72.1 — Submit Pipeline Runtime Context Audit

## Verdict

Submit pipeline **目前與 `ExportPipelineContext` 完全脫鉤**。  
`GeometryRuntimeProvider` 已包覆 `DesignerApp`，但 submit 路徑未讀取 `useGeometryRuntime()`；client artifacts 與 server PDF 皆走 V1 producer 預設。

**建議新增單一 injection point：** `ProofSubmitRuntimeContext`（plumbing only），在 client 解析、經 FormData 傳遞、server orchestrator 轉發至已具備 adapter 的 PDF 路徑。**不修改 artifact producer 本體**（本 phase audit only）。

---

## 1. Submit Flow Audit

### 1.1 Customer Submit（DesignerApp → API）

```
DesignerApp.handleSubmit*()
  │
  ├─ buildProofOrder({ orderId, gender, side, shirtColor, size, layers… })
  │
  ├─ prepareProofSubmission(proofOrder)           [proof-engine/client.ts]
  │     └─ generateProofArtifacts(order)          [generate-artifacts.ts]
  │           ├─ generateMockupsForOrder()        mockup-generator → mockup-export.ts
  │           └─ generatePrintsForOrder()         print-generator → print-export-system
  │
  ├─ appendProofArtifactsToFormData(formData, artifacts)
  │     proof-mockup-front/back, proof-print-front/back (Blob PNG)
  │
  ├─ formData += designJson, textJson, applicantJson, original
  │
  └─ POST /api/designs/submit                     [app/api/designs/submit/route.ts]
        │
        ├─ SYNC (response 前)
        │     parseProofArtifactsFromFormData()
        │     createDesignSubmission() → submission_no
        │     defaultSubmissionUploadManager.uploadFiles()
        │           └─ uploadSubmissionFiles()    mockup/print/json → Supabase
        │     return { submissionNo, proofProcessing: true }
        │
        └─ BACKGROUND (after())
              generateProofDocuments(order, version, artifacts, ctx, internalFiles)
                ├─ generateProofPdf({ order, version, mockupImages, printImages })
                │     ⚠ 無 geometryVersion / pipelineContext → V1
                ├─ buildDesignPackageZip({ proofPdf, mockups, prints, … })
                ├─ upload proof.pdf + zip + proof-package.json
                └─ sendSubmissionAdminEmail({ order, proofPackage })
```

**時序重點：**

| Phase | 執行位置 | Geometry 相關 |
|-------|----------|---------------|
| Artifact 產生 | Browser (sync, submit 前) | mockup-export / print-export V1 |
| Artifact 上傳 | Server sync | 無 — opaque bytes |
| PDF 產生 | Server background | factory-proof-pdf-template → 71.4 adapter（未接線） |
| ZIP 組裝 | Server background | packaging only |
| proofPackage | Server background | URLs + metadata only |
| Email | Server background | 繼承 proofPackage URLs（71.5：無 geometry） |

### 1.2 Admin Submit

**與 customer 共用同一路徑：** `DesignerApp` → `/api/designs/submit`。  
程式庫內無獨立 admin regenerate-proof API；管理員若使用同一 Designer 送件，流程相同。

Contest 路徑：`POST /api/contest/submit` — **不走** proof pipeline，out of scope。

### 1.3 Upload Pipeline

```
defaultSubmissionUploadManager.uploadFiles()
  → uploadSubmissionFiles(ctx, submissionNo, internalFiles, artifacts)
       ├─ design.json, texts.json, applicant.json
       ├─ mockup-front.png / mockup-back.png      (client bytes)
       ├─ print-front.png / print-back.png        (client bytes)
       └─ original-*.png                           (client upload)
```

Upload 層**不解析、不變造** artifact geometry；僅 MIME + path 上傳。

### 1.4 proofPackage Creation

```typescript
// lib/proof-engine/types.ts
interface ProofPackage {
  order_id, submission_no, version,
  storage_path,
  pdf_url,    // signed URL → server-generated proof PDF
  zip_url,    // signed URL → design package ZIP
  created_at
}
```

`proof-package.json` 寫入 storage；**不含 geometryVersion**。  
DB `design_submissions.proof_package` 同步更新（`app/api/designs/submit/route.ts`）。

---

## 2. Artifact Producers — Current Geometry Sources

### 2.1 `generateProofPdf()` — Server PDF

| 項目 | 現況 |
|------|------|
| 呼叫點 | `generateProofDocuments` only |
| Input | `order`, `version`, `mockupImages`, `printImages` |
| Runtime wiring | `ProofPdfInput` **已支援** `geometryVersion`, `pipelineContextBySide`（71.4） |
| Submit 實際傳入 | **皆未傳** → adapter V1 fallback |
| Placement 來源 | `export-pdf-runtime` → `resolveDesignerPreviewLayout` (V1) 或 snapshot (V2) |
| 嵌入 print PNG 位置 | PDF layout + presentation offset（與 print bytes 無關） |

Print images 在 PDF 內為 **embedded artwork**；其 pixel 內容來自 client `print-export-system`，PDF 只負責 **放置矩形**。

### 2.2 `buildDesignPackageZip()` — Design Package ZIP

| 項目 | 現況 |
|------|------|
| 角色 | JSZip 封裝 — **zero geometry reads** |
| 內容 | proof.pdf, order.json, validation-report, mockup/print PNGs, original |
| vs 71.3 | **不同產物** — 非 `downloadZipExportRuntimeBundle` product bundle |
| Runtime 需求 | 僅需上游 bytes 正確；ZIP 本身無 adapter |

### 2.3 `mockup-export.ts` — Client Mockup PNG

| 項目 | 現況 |
|------|------|
| 入口 | `mockup-generator.generateMockupPng` → `renderMockupPreviewPng` |
| 幾何 | `getMockupExportPrintAreaRectPx`, `resolvePrintAreaCm`, legacy `resolveProductPreviewVisualCompensation` |
| vs 71.2 | **不同引擎** — 非 `composeProductMockup` / `product-mockup-runtime` |
| pipelineContext | **未接受** |
| Cache | `artifact-cache.computeExportFingerprint` — **不含 geometryVersion** |

### 2.4 `print-export-system` — Client Print PNG

| 項目 | 現況 |
|------|------|
| 入口 | `print-generator.generatePrintPng` → `renderPrintExportPng` |
| 約束 | **Phase 72+ 禁止修改** |
| Runtime | 維持 V1；submit context 應標記 `print: V1` |

---

## 3. Gap Analysis — ExportPipelineContext vs Submit

### 已就緒（Phase 69–71）

| 元件 | 狀態 |
|------|------|
| `GeometryRuntimeProvider` + `getEffectiveGeometryVersion(surface)` | ✅ DesignerApp 已包覆 |
| `resolveExportPipelineContext({ side, size, surface })` | ✅ png / zip / pdf surfaces |
| `export-pdf-runtime` adapter | ✅ wired in factory-proof-pdf-template |
| `export-artwork-runtime`, `product-mockup-runtime`, `export-zip-runtime` | ✅ ResultPanel download 路徑 |
| `generateProofPdfWithGeometryRuntime` | ✅ dev entry（未接 submit） |

### 未接線（Submit 缺口）

| 缺口 | 說明 |
|------|------|
| DesignerApp submit | 未呼叫 `useGeometryRuntime()` |
| `prepareProofSubmission` / `generateProofArtifacts` | 無 context 參數 |
| FormData transport | 無 runtime metadata 欄位 |
| `parseProofArtifactsFromFormData` | 僅 mockup/print blobs |
| `generateProofDocuments` | 未接受 / 轉發 runtime context |
| `generateProofPdf` 呼叫 | 無 `geometryVersion` |
| Artifact cache fingerprint | 未含 geometry version → V1/V2 切換可能誤用 cache |
| `ProofPackage` schema | 未記錄 submit geometry version（可選） |

### Geometry Runtime State 與 Submit Surfaces

```
getEffectiveGeometryVersion(surface):
  production → always V1
  dev + exportRuntime[surface] OFF → V1
  dev + exportRuntime[surface] ON  → state.geometryVersion
```

Submit 建議對應 surface：

| Submit 步驟 | 建議 surface toggle | Adapter |
|-------------|---------------------|---------|
| Client mockup PNG | `png` 或未來 `mockup` alias | 待 72.3+（mockup-export 替換/包裝） |
| Client print PNG | — | **鎖 V1**（print-export 禁止改） |
| Server proof PDF | `pdf` | 71.4 `export-pdf-runtime` |
| Design package ZIP | `email` 或 `zip` gate | packaging only |
| Admin email | `email` | 無 adapter（71.5） |

---

## 4. Recommended Injection Point

### 4.1 新模組（plumbing only，不碰 producer 內部）

**建議路徑：** `lib/proof-engine/submit-runtime-context.ts`

```typescript
/** Resolved at submit time on client; replayed on server for PDF. */
export interface ProofSubmitRuntimeContext {
  /** Global geometry version selected in dev console */
  geometryVersion: DesignerGeometryVersion;
  /** Per-surface effective version after exportRuntime toggles + production lock */
  effectiveVersions: {
    pdf: DesignerGeometryVersion;
    mockup: DesignerGeometryVersion;
    print: DesignerGeometryVersion; // always V1 until print-export migration
    email: DesignerGeometryVersion; // gate only; no producer
  };
  /** ISO timestamp / build id for audit */
  resolvedAt: string;
}

export function resolveProofSubmitRuntimeContext(
  state: GeometryRuntimeState,
  options?: { productionLocked?: boolean },
): ProofSubmitRuntimeContext;

/** Server: rebuild per-side ExportPipelineContext for PDF (deterministic). */
export function resolveSubmitPdfPipelineContextBySide(
  order: Pick<ProofOrder, "size">,
  ctx: ProofSubmitRuntimeContext,
): Partial<Record<Side, ExportPipelineContext>>;
```

**職責邊界：**

- ✅ 解析 `GeometryRuntimeState` → effective versions
- ✅ 委派 `resolvePdfExportPipelineContext({ side, size, geometryVersion })` per side
- ✅ JSON serialize / deserialize for FormData
- ❌ 不呼叫 mockup-export / print-export / generateProofPdf 內部
- ❌ 不修改 `resolveExportPipelineContext` core

### 4.2 Injection 位置（單一貫穿點）

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT: DesignerApp submit handler                          │
│   runtimeCtx = resolveProofSubmitRuntimeContext(            │
│     geometryRuntime.state                                   │
│   )                                                         │
│   artifacts = await prepareProofSubmission(order, runtimeCtx)│  ← Phase 72.2
│   formData.append("proofRuntimeContext", JSON.stringify())  │  ← Phase 72.2
└──────────────────────────┬──────────────────────────────────┘
                           │ POST
┌──────────────────────────▼──────────────────────────────────┐
│ SERVER SYNC: app/api/designs/submit/route.ts                  │
│   runtimeCtx = parseProofSubmitRuntimeContext(formData)       │  ← Phase 72.2
│   uploadSubmissionFiles(artifacts)  // unchanged                │
│   after(() => generateProofDocuments(..., runtimeCtx))        │  ← Phase 72.2
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ ORCHESTRATOR: generateProofDocuments                            │
│   pdfContextBySide = resolveSubmitPdfPipelineContextBySide()    │
│   generateProofPdf({                                          │
│     ...,                                                      │
│     geometryVersion: runtimeCtx.effectiveVersions.pdf,        │
│     pipelineContextBySide: pdfContextBySide,                  │
│   })                                                          │
│   buildDesignPackageZip(...)  // unchanged                    │
└───────────────────────────────────────────────────────────────┘
```

**為何選此 injection point：**

1. **單一解析** — client 與 server 共用 `resolveProofSubmitRuntimeContext` 型別契約
2. **Producer 不變** — `generateProofPdf` 已有參數；僅 orchestrator 填值
3. **Upload 不變** — bytes 路徑獨立
4. **Email 不變** — 自動繼承新 PDF bytes
5. **Production safe** — `productionLocked` → 全 V1，與現行行為 byte-compatible

### 4.3 Transport 建議

| 方案 | 欄位 | 優點 | 風險 |
|------|------|------|------|
| **A（推薦）** | `proofRuntimeContext` JSON in FormData | 與 designJson 分離；易於 validate | 需 server parse |
| B | 嵌入 `designJson.geometryRuntime` | 單一 payload | designJson 已複雜；快取/版本混淆 |
| C | Server-only 從 env 推斷 | 無 client 改動 | client/server artifact 不一致 |

**不建議傳完整 `ExportPipelineContext` snapshot JSON** — server 可依 `(side, size, effectiveVersions.pdf)` 呼叫 `resolvePdfExportPipelineContext` 重建，避免序列化漂移。

### 4.4 Artifact Cache

`computeExportFingerprint` 應納入 `effectiveVersions.mockup`（及未來 `pdf` 若 client 預產 PDF）：

```typescript
payload.geometryRuntime = { mockup: effectiveVersions.mockup, print: "v1" };
```

否則 dev 切換 V1↔V2 會命中舊 mockup cache。

---

## 5. Migration Recommendation（Phased）

### Phase 72.1（本 phase）✅

- Audit document（本檔）
- 定義 `ProofSubmitRuntimeContext` 契約與 injection 圖
- **不修改** artifact producers

### Phase 72.2 — Submit Plumbing

| 變更 | 檔案 | 性質 |
|------|------|------|
| 新增 | `lib/proof-engine/submit-runtime-context.ts` | plumbing |
| 擴充 | `proof-engine/client.ts` — optional `runtimeCtx` on `prepareProofSubmission` | passthrough（可先 ignore） |
| 擴充 | `parse-artifacts.ts` 或新 `parse-submit-runtime.ts` | parse FormData |
| 擴充 | `generate-proof.ts` — `generateProofDocuments(..., runtimeCtx?)` | orchestrator |
| 擴充 | `app/api/designs/submit/route.ts` | parse + forward |
| 擴充 | `DesignerApp.tsx` submit handler | `useGeometryRuntime` + append FormData |
| 擴充 | `artifact-cache.ts` fingerprint | cache key + geometry version |

**Production 預設行為不變**（V1 byte-compatible）。

### Phase 72.3 — Server PDF Runtime Cutover

- 依 `effectiveVersions.pdf` 驗證 71.4 shadow compare（`EXPORT_PRODUCT_RUNTIME_COMPARE`）
- 可選：proofPackage 記錄 `geometry_runtime_version` 供稽核

### Phase 72.4 — Client Mockup Runtime（獨立）

- 新 `proof-mockup-runtime` adapter 包裝 mockup-generator **或** 切至 product mockup path
- **不修改** `mockup-export.ts` 內部 vs **新增** parallel entry — 待設計決策
- 受 `effectiveVersions.mockup` + `exportRuntime.png` 控制

### Out of Scope / Frozen

| 項目 | 原因 |
|------|------|
| `print-export-system` | 明確禁止修改 |
| `proof-email.ts` | 71.5 — 無 geometry |
| `buildDesignPackageZip` | packaging only |
| Geometry Runtime core | 明確禁止 |
| `calibration.json` / PhotoBridge | 明確禁止 |

---

## 6. Risk Register

| 風險 | 緩解 |
|------|------|
| Client mockup V1 + server PDF V2 → 視覺不一致 | 分 surface toggle；mockup runtime 完成前 pdf toggle 與 mockup 同步 |
| Artifact cache 跨 version 污染 | fingerprint 加 geometry version |
| Server 無 `GeometryRuntimeProvider` | 僅傳 `effectiveVersions`；server 用 `resolvePdfExportPipelineContext` 重建 |
| 惡意 client 傳 v2 in production | server 強制 `isGeometryRuntimeProductionLocked()` → V1 |
| Multi-side PDF | `pipelineContextBySide` per `DESIGN_SIDES`（71.4 已支援） |

---

## 7. File Touch Matrix（72.2 預覽）

| 檔案 | 72.2 變更 | Producer? |
|------|-----------|-----------|
| `submit-runtime-context.ts` | **新增** | No |
| `DesignerApp.tsx` | resolve + FormData | No |
| `app/api/designs/submit/route.ts` | parse + forward | No |
| `generate-proof.ts` | forward to PDF | Orchestrator |
| `proof-pdf-generator.ts` | 不變（已有 params） | Producer — **不修改** |
| `factory-proof-pdf-template.ts` | 不變 | Producer — **不修改** |
| `mockup-export.ts` | 不變 | Producer — **不修改** |
| `print-export-system` | 不變 | Producer — **禁止** |
| `design-package-zip.ts` | 不變 | Packaging |
| `proof-email.ts` | 不變 | Notification |

---

## 8. Summary

| 問題 | 答案 |
|------|------|
| Submit 是否持有 geometry？ | **Orchestrator 層目前無；producers 各自 V1** |
| 最佳 injection point？ | **`ProofSubmitRuntimeContext`** — client resolve → FormData → `generateProofDocuments` → `generateProofPdf` |
| 需新 adapter？ | **72.2 仅需 plumbing**；PDF 用既有 71.4；mockup 待 72.4 |
| Email 要改嗎？ | **否** |
| 本 phase 程式變更？ | **無 — audit + recommendation only** |
