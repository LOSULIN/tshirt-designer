/**
 * Designer browser E2E — Artwork Size / Canvas / Export consistency
 * npx puppeteer scripts/designer-browser-e2e-36c.mjs
 */
import puppeteer from "puppeteer";

const BASE = "http://localhost:3000/designer";
const SIZES = [
  "90",
  "110",
  "130",
  "150",
  "160",
  "GS",
  "GM",
  "GL",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GARMENT_PRINTABLE = {
  90: [18, 24],
  110: [22, 30],
  130: [25, 35],
  150: [29, 41],
  160: [32, 44],
  GS: [29, 41],
  GM: [32, 44],
  GL: [35, 46],
  S: [35, 46],
  M: [35, 50],
  L: [38, 52],
  XL: [40, 55],
  XXL: [42, 58],
  XXXL: [45, 60],
};

async function dismissEntryModal(page) {
  await delay(500);
  const has = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some((b) =>
      b.textContent?.includes("我已了解並同意"),
    ),
  );
  if (has) await clickByText(page, "我已了解並同意");
  await delay(500);
}

async function clickByText(page, text, index = 0) {
  const clicked = await page.evaluate(
    ({ text, index }) => {
      const nodes = [
        ...document.querySelectorAll("button, a, [role=option], label"),
      ].filter((el) => el.textContent?.trim().includes(text));
      const el = nodes[index];
      if (!el) return false;
      el.click();
      return true;
    },
    { text, index },
  );
  if (!clicked) {
    const body = await page.evaluate(() => document.body.innerText.slice(0, 500));
    throw new Error(`clickByText failed: ${text}\n${body}`);
  }
}

async function selectSide(page, side) {
  await clickByText(page, side === "front" ? "正面" : "背面");
  await delay(250);
}

async function selectSize(page, size) {
  const changed = await page.evaluate((size) => {
    const select = document.querySelector("select");
    if (select) {
      select.value = size;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    return false;
  }, size);
  if (!changed) {
    const combo = await page.$('[role="combobox"]');
    if (combo) {
      await combo.click();
      await delay(100);
      await clickByText(page, size);
    }
  }
  await delay(400);
}

async function readMeasurements(page) {
  return page.evaluate(() => {
    const print = document.querySelector("[data-print-area]");
    const layers = [...document.querySelectorAll("[data-layer-root]")];
    const layer = layers[layers.length - 1] ?? null;
    const w = document.querySelector(
      '[aria-label="Artwork width in centimeters"]',
    );
    const h = document.querySelector(
      '[aria-label="Artwork height in centimeters"]',
    );
    const pr = print?.getBoundingClientRect();
    const lr = layer?.getBoundingClientRect();
    const proofMatch = document.body.innerText.match(/Export: (\d+)×(\d+)px/);
    return {
      layerCount: layers.length,
      artworkWidth: w?.value ?? null,
      artworkHeight: h?.value ?? null,
      widthPct: pr && lr ? (lr.width / pr.width) * 100 : null,
      heightPct: pr && lr ? (lr.height / pr.height) * 100 : null,
      proofExportPx: proofMatch ? `${proofMatch[1]}×${proofMatch[2]}` : null,
      hasLayer: Boolean(layer),
    };
  });
}

async function resetDesign(page) {
  const enabled = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("重新設計"),
    );
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
  if (enabled) {
    await delay(200);
    await page.evaluate(() => {
      const confirm = [...document.querySelectorAll("button")].find((b) =>
        ["確認", "確定", "清除", "重新設計"].some((t) =>
          b.textContent?.includes(t),
        ),
      );
      confirm?.click();
    });
    await delay(600);
  }
}

async function analyzeArtworkPng(page) {
  const imgs = await page.$$('[aria-label="商品圖匯出"] img');
  let artwork = null;
  for (const img of imgs) {
    const alt = await img.evaluate((el) => el.alt);
    if (alt === "Artwork") artwork = img;
  }
  if (!artwork && imgs[0]) artwork = imgs[0];
  if (!artwork) return null;
  const expectedKey = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="商品圖匯出"] p');
    return el?.textContent ?? "";
  });
  for (let i = 0; i < 12; i++) {
    await delay(500);
    const dims = {
      widthPx: await artwork.evaluate((el) => el.naturalWidth),
      heightPx: await artwork.evaluate((el) => el.naturalHeight),
    };
    if (dims.widthPx > 0 && dims.heightPx > 0) {
      return { ...dims, label: expectedKey };
    }
  }
  return null;
}

async function setArtworkSize(page, width, height) {
  const w = await page.$('[aria-label="Artwork width in centimeters"]');
  const h = await page.$('[aria-label="Artwork height in centimeters"]');
  if (!w || !h) throw new Error("Artwork size inputs not found");
  await w.click({ clickCount: 3 });
  await w.type(String(width));
  await w.press("Enter");
  await delay(200);
  await h.click({ clickCount: 3 });
  await h.type(String(height));
  await h.press("Enter");
  await delay(350);
}

async function addRectangle(page) {
  await clickByText(page, "矩形");
  await delay(450);
}

async function addText(page) {
  await clickByText(page, "文字", 0);
  await delay(450);
}

async function uploadTestPng(page) {
  const pngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";
  await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const blob = new Blob([arr], { type: "image/png" });
    const file = new File([blob], "test.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error("file input missing");
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, pngBase64);
  await delay(1500);
}

async function applyPreset(page, shortLabel) {
  await clickByText(page, "版型");
  await delay(200);
  await clickByText(page, shortLabel);
  await delay(450);
}

function passRatio(pct, target = 100, tol = 2) {
  return pct != null && Math.abs(pct - target) <= tol;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissEntryModal(page);
  await selectSide(page, "front");
  await selectSize(page, "M");

  const results = [];
  const sizeRows = [];

  // ① Rectangle @ M full printable
  await addRectangle(page);
  await setArtworkSize(page, 35, 50);
  let m = await readMeasurements(page);
  let exportPng = await analyzeArtworkPng(page);
  results.push({
    id: "① Rectangle",
    artworkSize: `${m.artworkWidth}×${m.artworkHeight} cm`,
    screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
    productDownload: exportPng,
    match:
      passRatio(m.widthPct) &&
      passRatio(m.heightPct) &&
      m.artworkWidth === "35" &&
      m.artworkHeight === "50",
  });
  await resetDesign(page);

  // ② Image
  await uploadTestPng(page);
  await setArtworkSize(page, 20, 10);
  m = await readMeasurements(page);
  exportPng = await analyzeArtworkPng(page);
  const expW20 = Math.round((20 / 2.54) * 300);
  const expH10 = Math.round((10 / 2.54) * 300);
  results.push({
    id: "② Image",
    artworkSize: `${m.artworkWidth}×${m.artworkHeight} cm`,
    screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
    productDownload: exportPng,
    match:
      m.artworkWidth === "20" &&
      m.artworkHeight === "10" &&
      passRatio(m.widthPct, (20 / 35) * 100) &&
      passRatio(m.heightPct, (10 / 50) * 100) &&
      (!exportPng ||
        (exportPng.widthPx === expW20 && exportPng.heightPx === expH10)),
  });
  await resetDesign(page);

  // ③ Text
  await addText(page);
  await setArtworkSize(page, 20, 10);
  m = await readMeasurements(page);
  exportPng = await analyzeArtworkPng(page);
  results.push({
    id: "③ Text",
    artworkSize: `${m.artworkWidth}×${m.artworkHeight} cm`,
    screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
    productDownload: exportPng,
    match:
      m.artworkWidth === "20" &&
      m.artworkHeight === "10" &&
      passRatio(m.widthPct, (20 / 35) * 100) &&
      passRatio(m.heightPct, (10 / 50) * 100) &&
      (!exportPng ||
        (exportPng.widthPx === expW20 && exportPng.heightPx === expH10)),
  });
  await resetDesign(page);

  // ④⑤ Presets front
  await uploadTestPng(page);
  for (const preset of [
    { id: "④ A5", label: "A5 直式", w: 15, h: 21 },
    { id: "⑤ A4", label: "A4 直式", w: 21, h: 30 },
  ]) {
    await applyPreset(page, preset.label);
    m = await readMeasurements(page);
    exportPng = await analyzeArtworkPng(page);
    results.push({
      id: preset.id,
      artworkSize: `${m.artworkWidth}×${m.artworkHeight} cm`,
      screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
      productDownload: exportPng,
      match:
        Number(m.artworkWidth) === preset.w &&
        Number(m.artworkHeight) === preset.h,
    });
  }
  await resetDesign(page);

  // ⑥ A3 back
  await selectSide(page, "back");
  await uploadTestPng(page);
  await applyPreset(page, "背面 A3 直式");
  m = await readMeasurements(page);
  exportPng = await analyzeArtworkPng(page);
  results.push({
    id: "⑥ A3",
    artworkSize: `${m.artworkWidth}×${m.artworkHeight} cm`,
    screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
    productDownload: exportPng,
    match:
      Number(m.artworkWidth) === 30 && Number(m.artworkHeight) === 42,
  });
  await selectSide(page, "front");
  await selectSize(page, "M");
  await resetDesign(page);

  // ⑦⑧
  await addRectangle(page);
  await setArtworkSize(page, 20, 10);
  m = await readMeasurements(page);
  exportPng = await analyzeArtworkPng(page);
  results.push({
    id: "⑦ Product Download",
    artworkSize: "20×10 cm",
    screen: `${m.widthPct?.toFixed(1)}%×${m.heightPct?.toFixed(1)}%`,
    productDownload: exportPng,
    match:
      passRatio(m.widthPct, (20 / 35) * 100) &&
      passRatio(m.heightPct, (10 / 50) * 100) &&
      (!exportPng ||
        (exportPng.widthPx === expW20 && exportPng.heightPx === expH10)),
  });
  results.push({
    id: "⑧ Factory Proof",
    artworkSize: "20×10 cm",
    screen: m.proofExportPx ?? "同源 export runtime",
    productDownload: exportPng ?? `${expW20}×${expH10}px expected`,
    match:
      passRatio(m.widthPct, (20 / 35) * 100) &&
      (!exportPng || exportPng.widthPx === expW20),
  });
  await resetDesign(page);

  // ⑨ sizes
  for (const size of SIZES) {
    await selectSize(page, size);
    await addRectangle(page);
    const [pw, ph] = GARMENT_PRINTABLE[size];
    await setArtworkSize(page, pw, ph);
    m = await readMeasurements(page);
    exportPng = await analyzeArtworkPng(page);
    sizeRows.push({
      size,
      artworkSize: `${m.artworkWidth}×${m.artworkHeight}`,
      screen: `${m.widthPct?.toFixed(0)}%×${m.heightPct?.toFixed(0)}%`,
      productDownload: exportPng,
      match:
        m.artworkWidth === String(pw) &&
        m.artworkHeight === String(ph) &&
        passRatio(m.widthPct) &&
        passRatio(m.heightPct),
    });
    await resetDesign(page);
  }

  await browser.close();
  console.log(JSON.stringify({ results, sizeRows }, null, 2));

  const failed = [
    ...results.filter((r) => r.match === false),
    ...sizeRows.filter((r) => !r.match),
  ];
  if (failed.length) {
    console.error(`FAILED ${failed.length}`, failed);
    process.exit(1);
  }
  console.log("ALL BROWSER E2E CHECKS PASSED");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
