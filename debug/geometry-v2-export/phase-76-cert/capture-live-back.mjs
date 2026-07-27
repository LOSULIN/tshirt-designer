#!/usr/bin/env node
/**
 * Phase 76 — capture back-view designer garment + download mockup (V2 dev).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "live-screenshots");
const BASE_URL = process.env.CERT_BASE_URL ?? "http://localhost:3000";

mkdirSync(OUT, { recursive: true });

async function dismissEntryModal(page) {
  const agree = page.getByRole("button", { name: "我已了解並同意" });
  if (await agree.isVisible({ timeout: 3000 }).catch(() => false)) {
    await agree.click();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.goto(`${BASE_URL}/designer`, { waitUntil: "networkidle" });
  await dismissEntryModal(page);

  const backBtn = page.getByRole("button", { name: /背面|背/ });
  if (await backBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
    await backBtn.first().click();
    await page.waitForTimeout(800);
  }

  await page.screenshot({ path: join(OUT, "designer-back-view.png"), fullPage: false });

  const placement = await page.evaluate(() => {
    const el = document.querySelector("[data-print-area], [data-testid='print-area']");
    const rect = el?.getBoundingClientRect();
    return rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : null;
  });
  writeFileSync(join(OUT, "designer-placement-meta.json"), JSON.stringify({ placement }, null, 2));

  const downloadBtn = page.getByRole("button", { name: "商品圖 PNG" });
  if (await downloadBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await downloadBtn.click();
    const download = await downloadPromise;
    await download.saveAs(join(OUT, "download-mockup-back.png"));
  }

  await browser.close();
  console.log("Live screenshots written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
