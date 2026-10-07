import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import lighthouse from "lighthouse";
import { startNextServer } from "./preview.mjs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
const dir = "screenshots/audit";
await mkdir(dir, { recursive: true });
const { server, origin } = await startNextServer();
const browser = await chromium.launch();
const report = { accessibility: [], lighthouse: [], errors: [] };
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
  const routes = [...new Set([...Object.keys(manifest.routes), "/checkout/", "/admin/login/"])]
    .filter(p => !p.startsWith("/_") && !p.includes("."));
  for (const route of routes) {
    await page.goto(origin + route, { waitUntil: "networkidle" });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    report.accessibility.push({
      route,
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    console.log(`axe ${route}: ${result.violations.length}`);
  }
  await browser.close();
  // Chromium's debugging port lets Lighthouse use the same installed test browser.
  const chrome = await chromium.launch({
    args: ["--remote-debugging-port=9223"],
  });
  try {
    for (let i = 0; i < 50; i++) {
      try {
        await fetch("http://127.0.0.1:9223/json/version");
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    for (const route of [
      "/",
      "/shop/",
      "/product/gulnaar-shawl/",
      "/contact/",
      "/checkout/",
    ]) {
      const result = await lighthouse(origin + route, {
        port: 9223,
        output: ["json", "html"],
        logLevel: "error",
        maxWaitForFcp: 45000,
        maxWaitForLoad: 60000,
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
      });
      const slug =
        route === "/"
          ? "home"
          : route.replaceAll("/", "-").replace(/^-|-$/g, "");
      await writeFile(`${dir}/lighthouse-${slug}.json`, result.report[0]);
      await writeFile(`${dir}/lighthouse-${slug}.html`, result.report[1]);
      const l = result.lhr;
      if (l.runtimeError)
        throw new Error(`${route}: ${l.runtimeError.message}`);
      const entry = {
        route,
        scores: Object.fromEntries(
          Object.entries(l.categories).map(([k, v]) => [
            k,
            Math.round(v.score * 100),
          ]),
        ),
        lcp: l.audits["largest-contentful-paint"].numericValue,
        cls: l.audits["cumulative-layout-shift"].numericValue,
        tbt: l.audits["total-blocking-time"].numericValue,
        issues: Object.values(l.audits)
          .filter((a) => a.score !== null && a.score < 1)
          .map((a) => ({
            id: a.id,
            title: a.title,
            displayValue: a.displayValue,
          })),
      };
      report.lighthouse.push(entry);
      console.log(JSON.stringify(entry));
    }
  } finally {
    await chrome.close();
  }
} catch (error) {
  report.errors.push(error.stack);
} finally {
  await browser.close();
  server.close();
  await writeFile(`${dir}/audit.json`, JSON.stringify(report, null, 2));
}
if (
  report.errors.length ||
  report.accessibility.some((p) => p.violations.length)
)
  process.exitCode = 1;
