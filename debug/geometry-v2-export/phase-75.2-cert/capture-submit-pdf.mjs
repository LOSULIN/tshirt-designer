#!/usr/bin/env node
/**
 * Phase 75.2 — Capture production Submit PDF via live server + Supabase poll.
 * Requires: dev server running, .env.local with Supabase credentials.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../../..");
const OUT = join(__dirname, "artifacts");
const BASE_URL = process.env.CERT_BASE_URL ?? "http://localhost:3000";

mkdirSync(OUT, { recursive: true });

function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function dismissEntryModal(page) {
  const agree = page.getByRole("button", { name: "我已了解並同意" });
  if (await agree.isVisible({ timeout: 3000 }).catch(() => false)) {
    await agree.click();
  }
}

async function addCertTextLayer(page) {
  await page.locator("button").filter({ hasText: /^文字$/ }).first().click();
  await page.waitForTimeout(600);
}

async function submitAndCapturePdf(page, supabase) {
  let submitPayload = null;

  page.on("response", async (response) => {
    if (!response.url().includes("/api/designs/submit")) return;
    if (response.request().method() !== "POST") return;
    try {
      submitPayload = await response.json();
    } catch {
      /* ignore */
    }
  });

  await page.getByRole("button", { name: "確認送出" }).click();
  const modal = page.locator(".fixed.inset-0");
  await modal.locator('input[type="text"]').fill("Phase752 PDF Cert");
  await modal.locator('input[type="email"]').fill("phase752pdf@test.local");
  const confirm = modal.getByRole("button", { name: "確認發送" });
  await confirm.waitFor({ state: "visible", timeout: 15_000 });
  await confirm.click();

  await page.getByText("投稿成功").waitFor({ state: "visible", timeout: 120_000 });

  if (!submitPayload?.orderId) {
    throw new Error("Submit response missing orderId");
  }

  const orderId = submitPayload.orderId;
  const submissionNo = submitPayload.submissionNo;
  console.log("Submit OK:", submissionNo, orderId);

  const deadline = Date.now() + 180_000;
  let pdfUrl = null;
  while (Date.now() < deadline) {
    const { data, error } = await supabase
      .from("design_submissions")
      .select("proof_pdf_url, submission_no")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(`Supabase poll failed: ${error.message}`);
    if (data?.proof_pdf_url) {
      pdfUrl = data.proof_pdf_url;
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (!pdfUrl) {
    throw new Error(`proof_pdf_url not ready after 180s for ${submissionNo}`);
  }

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`PDF download failed: ${res.status}`);
  const pdfBuf = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(OUT, "submit-pdf.pdf"), pdfBuf);
  writeFileSync(
    join(OUT, "submit-pdf-meta.json"),
    JSON.stringify({ submissionNo, orderId, pdfUrl, bytes: pdfBuf.length }, null, 2),
  );
  console.log("Wrote submit-pdf.pdf", pdfBuf.length, "bytes");
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.goto(`${BASE_URL}/designer`, { waitUntil: "networkidle" });
  await dismissEntryModal(page);
  await page.getByRole("button", { name: "白色" }).click();
  await addCertTextLayer(page);
  await submitAndCapturePdf(page, supabase);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
