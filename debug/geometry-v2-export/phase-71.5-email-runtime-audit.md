# Phase 71.5 — Email Runtime Audit

## Verdict

**Email 本身不持有 geometry logic。**  
`proof-email.ts` 僅組裝 HTML 通知信並附上已上傳 artifact 的 signed URL；不產生 PDF / ZIP / mockup，不讀取 placement / calibration / snapshot。

**結論：不新增 `export-email-runtime` adapter。**  
Runtime 遷移應發生在 artifact 產生端（client mockup、server PDF）；Email 被動繼承上游輸出。

---

## Flow A: Proof Submit → Admin Email（主要路徑）

```
DesignerApp / SubmitApplicationModal
  ↓
prepareProofSubmission()                  [proof-engine/client.ts]
  ↓
generateProofArtifacts()                  [generate-artifacts.ts]
  ├─ generateMockupsForOrder()            mockup-generator → mockup-export.ts (V1)
  └─ generatePrintsForOrder()             print-generator → print-export-system (V1)
  ↓
appendProofArtifactsToFormData()          mockup-*.png, print-*.png blobs
  ↓
POST /api/designs/submit
  ├─ sync: uploadSubmissionFiles()        上傳 client artifacts
  └─ background: generateProofDocuments() [generate-proof.ts]
       ├─ generateProofPdf()              proof-pdf-generator (V1 — 無 pipelineContext)
       ├─ buildDesignPackageZip()         design-package-zip.ts（純打包）
       ├─ uploadOrderFile + signed URLs
       └─ sendSubmissionAdminEmail()     proof-email.ts（僅連結）
```

Email 在 pipeline **最末端**；所有幾何相關工作已在 PDF 產生與 client artifact 產生階段完成。

---

## Flow B: Email Module（通知層）

```
sendSubmissionAdminEmail({ order, proofPackage })
  ↓
buildSubmissionAdminEmailHtml()
  ├─ 案件 / 商品 / 申請人 metadata（proof-domain, product-metadata）
  ├─ proofPackage.pdf_url   → 已上傳 Proof PDF signed URL
  └─ proofPackage.zip_url   → 已上傳 Design Package ZIP signed URL
  ↓
Resend API（HTML only，無 binary attachment）
```

| 檔案 | Geometry imports | Artifact generation |
|------|------------------|---------------------|
| `lib/proof-engine/proof-email.ts` | **None** | **None** — URL only |
| `lib/email.ts`（pro-upload / legacy） | **None** | **None** — 其他業務通知 |

---

## 附件產生來源（Email 連結指向的 artifacts）

Email 不附帶 bytes；管理員透過 signed URL 下載下列檔案：

| Email 連結 | 產生者 | 幾何來源 | Phase 71.x runtime adapter |
|------------|--------|----------|----------------------------|
| **Proof PDF** | `generateProofDocuments` → `generateProofPdf()` | `export-pdf-runtime`（71.4，經 factory-proof-pdf-template） | ✅ Adapter 存在；**submit path 未傳 `geometryVersion` / `pipelineContext` → 目前 V1** |
| **Design Package ZIP** | `generateProofDocuments` → `buildDesignPackageZip()` | **無** — 僅 JSZip 封裝既有 buffers | ❌ 非 71.3 product bundle；packaging only |
| **Mockup PNG**（ZIP 內） | Client `generateMockupsForOrder` → `renderMockupPreviewPng` | `mockup-export.ts` — flat container + `resolvePrintAreaCm` + legacy visual compensation | ❌ **非** 71.2 `product-mockup-runtime` / `composeProductMockup` |
| **Print PNG**（ZIP 內） | Client `generatePrintsForOrder` → `renderPrintExportPng` | `print-export-system`（V1 garment cm） | 不在本 phase scope |
| **Original / JSON**（ZIP 內） | Form upload / `order-json` | 無 placement | N/A |

### 與 Phase 71.2 / 71.3 的區別

| 概念 | Proof Email ZIP | Product Export（71.2 / 71.3） |
|------|-----------------|-------------------------------|
| 入口 | `buildDesignPackageZip` | `downloadZipExportRuntimeBundle` / `buildProductExportFiles` |
| Mockup 引擎 | `mockup-export.ts`（flat preview） | `composeProductMockup` + `product-mockup-runtime` |
| ZIP 內容 | proof.pdf + mockup/print + order.json | artwork.png + product-mockup.png |
| Geometry | 繼承子檔案 bytes | `resolveZipExportPipelineContext(surface: "zip")` |

Proof submit 路徑**未使用** product export bundle adapter。

---

## Runtime 繼承檢查（要求 3）

| 項目 | Email 是否使用 runtime export？ | 說明 |
|------|--------------------------------|------|
| PDF uses runtime PDF export | **間接 — 尚未在 submit 啟用** | 71.4 adapter 已接 factory template；`generateProofDocuments` 仍呼叫 `generateProofPdf({ order, version, mockupImages, printImages })` 無 context → V1 fallback |
| ZIP uses runtime ZIP export | **否（不同 ZIP）** | Email ZIP = proof design package；71.3 = product export bundle。前者無 geometry，僅封裝 |
| Mockup uses runtime product mockup | **否** | Proof mockup 走 `mockup-export`，非 `ProductMockupEngine` / 71.2 adapter |

**Email 繼承規則（設計意圖）：**  
當上游 artifact 產生者切換至 runtime（例如 submit 傳入 `geometryVersion` + `pipelineContextBySide`），Email **無需修改**即自動反映新 PDF / mockup bytes。

---

## `surface: "email"` Toggle

`GeometryExportSurface` 含 `"email"`；`DEFAULT_GEOMETRY_EXPORT_RUNTIME_TOGGLES.email = false`。

- Toggle 僅用於 `resolveEffectiveExportGeometryVersion(state, "email")` 基礎設施測試
- **無** `resolveExportPipelineContext({ surface: "email" })` consumer
- **無** email-specific artifact generator

建議：email toggle 作為「submit pipeline 全面 runtime 就緒」的閘門預留，非獨立 adapter surface。

---

## Geometry Read Points in Email Stack

```
proof-email.ts          → 0 geometry reads
generate-proof.ts       → 0 direct geometry reads（委派 PDF / ZIP engines）
design-package-zip.ts   → 0 geometry reads
client.ts               → 0 geometry reads
```

幾何讀取發生在：

1. **Client：** `mockup-export.ts`, `print-export-system`
2. **Server PDF：** `factory-proof-pdf-template.ts` → `export-pdf-runtime.ts`（71.4）
3. **ZIP 組裝：** 無

---

## 其他 Email 路徑（Out of Scope）

| 路徑 | 檔案 | 與 Proof geometry 關係 |
|------|------|------------------------|
| Pro Upload 送件 | `lib/email.ts` → `sendProUploadSubmittedEmail` | 無 proof artifacts |
| Contest submit | `app/api/contest/submit/route.ts` | 無 proof pipeline |
| Legacy design submit | `sendDesignSubmittedEmail` | 檔案連結，非 runtime geometry |

---

## 建議後續（非 71.5 範圍 — audit only）

若要讓 Email 連結的 artifacts 全面 runtime-driven，需在上游接線（**不修改 email 模組**）：

1. **PDF：** `generateProofDocuments` 傳入 `geometryVersion` / `pipelineContextBySide`（或 `generateProofPdfWithGeometryRuntime`）
2. **Mockup：** Proof submit 改走 product mockup compose path，或 mockup-generator 接受 `pipelineContext`
3. **ZIP：** 仍僅 packaging；runtime 效果來自 ZIP 內子檔案 bytes 更新

**Phase 71.5 交付：** 本 audit document only — **no adapter, no code changes.**

---

## 禁止項確認

本次 audit 未修改：

- Geometry Runtime core
- `calibration.json`
- PhotoBridge implementation
- `print-export-system`
- Artifact generators（mockup-generator, print-generator, factory-proof-pdf-template 等）
