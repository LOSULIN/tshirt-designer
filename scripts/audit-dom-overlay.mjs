/**
 * DOM overlay audit — run in browser console on /designer
 * Usage: paste output or load via bookmarklet
 */
(async () => {
  const sizes = [
    "90", "110", "130", "150", "160",
    "GS", "GM", "GL",
    "S", "M", "L", "XL", "XXL", "XXXL",
  ];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = document.querySelector("[data-canvas-root]");
  const pick = (name) =>
    [...document.querySelectorAll("button")].filter(
      (b) => b.textContent.trim() === name,
    );

  const measure = () => {
    const container = root?.querySelector("[data-shirt-container]");
    const template = container?.querySelector("img");
    const blue = root?.querySelector("[data-print-area]");
    const orange = root?.querySelector("[data-garment-safe-zone]");
    const r = (el) => {
      const b = el?.getBoundingClientRect();
      return b
        ? {
            top: Math.round(b.top * 100) / 100,
            left: Math.round(b.left * 100) / 100,
            width: Math.round(b.width * 100) / 100,
            height: Math.round(b.height * 100) / 100,
          }
        : null;
    };
    return { template: r(template), blue: r(blue), orange: r(orange) };
  };

  const row = (size, m) => {
    const t = m.template;
    const b = m.blue;
    const o = m.orange;
    if (!t || !b) return { size, error: "missing element", ...m };
    return {
      size,
      template: t,
      blue: b,
      orange: o,
      delta: {
        blueTopMinusTemplateTop: Math.round((b.top - t.top) * 100) / 100,
        blueLeftMinusTemplateLeft: Math.round((b.left - t.left) * 100) / 100,
        orangeTopMinusBlueTop: o ? Math.round((o.top - b.top) * 100) / 100 : null,
        blueWOverTemplateW: Math.round((b.width / t.width) * 10000) / 10000,
        blueHOverTemplateH: Math.round((b.height / t.height) * 10000) / 10000,
        orangeWOverBlueW: o ? Math.round((o.width / b.width) * 10000) / 10000 : null,
        orangeHOverBlueH: o ? Math.round((o.height / b.height) * 10000) / 10000 : null,
      },
    };
  };

  const getCanvasSideBtn = (label) => {
    const all = pick(label);
    return (
      all.find((b) => {
        const r = b.getBoundingClientRect();
        return r.top > 400;
      }) ?? all[all.length - 1]
    );
  };

  const out = { front: [], back: [] };

  getCanvasSideBtn("正面")?.click();
  await sleep(300);
  for (const size of sizes) {
    pick(size)[0]?.click();
    await sleep(200);
    out.front.push(row(size, measure()));
  }

  getCanvasSideBtn("背面")?.click();
  await sleep(300);
  for (const size of sizes) {
    pick(size)[0]?.click();
    await sleep(200);
    out.back.push(row(size, measure()));
  }

  const ancestors = [];
  let el = root?.querySelector("[data-print-area]");
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    ancestors.push({
      tag: el.tagName.toLowerCase(),
      data: [...el.attributes]
        .filter((a) => a.name.startsWith("data-"))
        .map((a) => a.name)
        .join(","),
      position: cs.position,
      display: cs.display,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      transform: cs.transform,
      transformOrigin: cs.transformOrigin,
      aspectRatio: cs.aspectRatio,
      objectFit: cs.objectFit || "-",
      overflow: cs.overflow,
    });
    el = el.parentElement;
  }

  return { viewport: { w: innerWidth, h: innerHeight }, canvasRoot: !!root, out, ancestors };
})();
