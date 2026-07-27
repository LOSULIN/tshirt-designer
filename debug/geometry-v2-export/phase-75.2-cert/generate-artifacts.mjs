#!/usr/bin/env node
/**
 * Phase 75.2 — Generate production artifacts via live Designer (no runtime changes).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import Busboy from "busboy";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "artifacts");
const BASE_URL = process.env.CERT_BASE_URL ?? "http://localhost:3000";

mkdirSync(OUT, { recursive: true });

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

async function saveDesignerGarment(page) {
  const src = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")].filter((img) =>
      /UA35001\/assets\/adult-tshirt-white-front/.test(img.src),
    );
    return imgs[0]?.src ?? null;
  });
  if (!src) throw new Error("Designer garment img not found");
  const res = await page.request.get(src);
  writeFileSync(join(OUT, "designer-garment.png"), await res.body());
  return src;
}

async function downloadProductMockup(page, filename) {
  const btn = page.getByRole("button", { name: "商品圖 PNG" });
  await btn.scrollIntoViewIfNeeded();
  await btn.waitFor({ state: "visible", timeout: 60_000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
  await btn.click();
  const download = await downloadPromise;
  await download.saveAs(join(OUT, filename));
}

function parseMultipart(buffer, contentType) {
  return new Promise((resolve, reject) => {
    const files = {};
    const bb = Busboy({ headers: { "content-type": contentType } });
    bb.on("file", (name, stream) => {
      const chunks = [];
      stream.on("data", (d) => chunks.push(d));
      stream.on("end", () => {
        files[name] = Buffer.concat(chunks);
      });
    });
    bb.on("error", reject);
    bb.on("finish", () => resolve(files));
    bb.end(buffer);
  });
}

async function captureSubmitMockup(page, outfile) {
  let captured = null;
  const handler = async (route) => {
    const req = route.request();
    const body = req.postDataBuffer();
    const ct = req.headers()["content-type"] ?? "";
    if (body && ct.includes("multipart")) {
      const files = await parseMultipart(body, ct);
      captured = files["proof-mockup-front"] ?? null;
    }
    await route.abort();
  };
  await page.route("**/api/designs/submit", handler);

  await page.getByRole("button", { name: "確認送出" }).click();
  const modal = page.locator(".fixed.inset-0");
  await modal.locator('input[type="text"]').fill("Phase752 Cert");
  await modal.locator('input[type="email"]').fill("phase752@test.local");
  const confirm = modal.getByRole("button", { name: "確認發送" });
  await confirm.waitFor({ state: "visible", timeout: 15_000 });
  await confirm.click();
  await page.waitForTimeout(25_000);
  await page.unroute("**/api/designs/submit", handler);

  if (!captured) throw new Error(`Submit mockup not captured (${outfile})`);
  writeFileSync(join(OUT, outfile), captured);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  await page.goto(`${BASE_URL}/designer`, { waitUntil: "networkidle" });
  await dismissEntryModal(page);
  await page.getByRole("button", { name: "白色" }).click();

  const designerUrl = await saveDesignerGarment(page);
  writeFileSync(
    join(OUT, "generation-meta.json"),
    JSON.stringify(
      { designerGarmentUrl: designerUrl, fixture: "UA35001 white M front" },
      null,
      2,
    ),
  );

  await addCertTextLayer(page);
  await downloadProductMockup(page, "download-mockup.png");
  await captureSubmitMockup(page, "submit-mockup.png");

  await browser.close();
  console.log("Artifacts written to", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
