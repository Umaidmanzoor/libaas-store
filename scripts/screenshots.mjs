import { checkCollection } from "./collection-checks.mjs";
import { checkFoundation } from "./foundation-checks.mjs";
import { checkAccessibility } from "./accessibility-checks.mjs";
import { chromium, expect } from "@playwright/test";
import { startNextServer } from "./preview.mjs";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import { checkConnectedCheckout } from "./connected-checks.mjs";
import { checkCommerce, checkEdgeCases } from "./commerce-checks.mjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const shots = path.resolve("screenshots/responsive");
nextEnv.loadEnvConfig(process.cwd());
const connected = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && process.env.SUPABASE_SECRET_KEY && process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
await mkdir(shots, { recursive: true });
const { server, origin } = await startNextServer();
const manifest = JSON.parse(await readFile(".next/prerender-manifest.json", "utf8"));
const pages = [...new Set([...Object.keys(manifest.routes),"/order/confirmation"])]
  .filter(p => !p.includes(".") && !p.startsWith("/admin") && !p.startsWith("/_"))
  .map(p => p === "/" ? p : p.replace(/\/$/, "") + "/");
const report = {
  suite: "responsive",
  pages,
  errors: [],
  brokenLinks: [],
  checks: [],
  screenshots: [],
};
let browser;
const titles = new Set();
const descriptions = new Set();
async function imagesReady(page) {
  await page.locator("img").evaluateAll(async (images) => {
    images.forEach((im) => (im.loading = "eager"));
    await Promise.all(images.map((im) => im.decode().catch(() => {})));
  });
}
try {
  browser = await chromium.launch();
  await checkFoundation(browser, origin, shots, report, connected);
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      report.errors.push(`${width} ${page.url()}: ${e.message}`),
    );
    page.on("console", (m) => {
      if (m.type() === "error")
        report.errors.push(`${width} ${page.url()}: ${m.text()}`);
    });
    for (const route of pages) {
      console.log(`Screenshot ${width}: ${route}`);
      try {
        await page.goto(origin + route, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        await imagesReady(page);
        if (route === "/") {
          await page.waitForTimeout(1400);
          for (
            let y = 0;
            y <
            (await page.evaluate(() => document.documentElement.scrollHeight));
            y += 750
          ) {
            await page.evaluate((y) => scrollTo(0, y), y);
            await page.waitForTimeout(100);
          }
          await page.evaluate(() => scrollTo(0, 0));
          await page.waitForTimeout(900);
        }
        await expect(page.locator("h1")).toHaveCount(1);
        if (width === 390) {
          const title = await page.title();
          const description = await page
            .locator('meta[name="description"]')
            .getAttribute("content");
          expect(titles.has(title)).toBe(false);
          titles.add(title);
          expect(descriptions.has(description)).toBe(false);
          descriptions.add(description);
          const canonical = await page
            .locator('link[rel="canonical"]')
            .getAttribute("href");
          expect(canonical).toContain(
            route === "/_not-found/" ? "/404/" : route,
          );
          await expect(
            page.locator('meta[property="og:image"]'),
          ).toHaveAttribute("content", /\/og.png$/);
          await expect(
            page.locator('meta[name="twitter:card"]'),
          ).toHaveAttribute("content", "summary_large_image");
          const schemas = await page
            .locator('script[type="application/ld+json"]')
            .allTextContents();
          const parsed = schemas.map((s) => JSON.parse(s));
          expect(parsed.some((s) => s["@type"] === "Organization")).toBe(true);
          if (route.startsWith("/product/")) {
            expect(
              parsed.some(
                (s) =>
                  s["@type"] === "Product" && s.offers.priceCurrency === "INR",
              ),
            ).toBe(true);
            expect(parsed.some((s) => s["@type"] === "BreadcrumbList")).toBe(
              true,
            );
          }
          report.checks.push(
            `${route}: unique metadata, canonical, social cards and valid structured data`,
          );
        }

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .locator("img")
            .evaluateAll((images) =>
              images.every((im) => im.complete && im.naturalWidth > 0),
            ),
        ).toBe(true);
        const name =
          route === "/"
            ? "home"
            : route.replace(/^\//, "").replace(/\/$/, "").replaceAll("/", "-");
        await page.screenshot({
          path: `${shots}/${name}-${width}.png`,
          fullPage: true,
        });
        report.screenshots.push(`${name}-${width}.png`);
        report.checks.push(
          `${width} ${route}: one h1, no overflow, images loaded`,
        );
        const links = await page
          .locator("a[href]")
          .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
        for (const href of new Set(links)) {
          const url = new URL(href, origin + route);
          if (url.origin !== origin) continue;
          if (url.pathname === route && url.hash) {
            expect(
              await page.evaluate(
                (id) => !!document.getElementById(id),
                decodeURIComponent(url.hash.slice(1)),
              ),
            ).toBe(true);
          } else {
            const response = await page.request.get(url.href);
            if (!response.ok()) report.brokenLinks.push(`${route}: ${href}`);
            else if (url.hash) {
              const html = await response.text();
              const hash = decodeURIComponent(url.hash.slice(1));
              if (!html.includes(`id="${hash}"`))
                report.brokenLinks.push(`${route}: missing anchor ${href}`);
            }
          }
        }
      } catch (error) {
        report.errors.push(`${width} ${route}: ${error.message}`);
      }
    }
    await context.close();
    try {
      if(!connected)await checkCommerce(browser, origin, width, shots, report);
      await checkCollection(browser, origin, width, shots, report);
    } catch (error) {
      report.errors.push(`${width} commerce flow: ${error.message}`);
    }
  }
  try {
    if(connected)await checkConnectedCheckout(browser, origin, report);
    else await checkAccessibility(browser, origin, report);
  } catch (error) {
    report.errors.push(`Accessibility: ${error.message}`);
  }
  try {
    if(!connected)await checkEdgeCases(browser, origin, report);
  } catch (error) {
    report.errors.push(`Edge cases: ${error.message}`);
  }
  for (const mode of ["reduced-motion", "no-js"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: "reduce",
      javaScriptEnabled: mode !== "no-js",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) =>
      report.errors.push(`${mode}: ${error.message}`),
    );
    for (const route of ["/", "/product/gulnaar-shawl/"]) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      await imagesReady(page);
      await expect(page.locator("h1")).toBeVisible();
      if (mode === "no-js")
        await expect(page.locator("form").first()).toHaveAttribute("inert", "");
      await expect(page.locator(".pin-spacer")).toHaveCount(0);
      const name = route === "/" ? "home" : "product-gulnaar-shawl";
      await page.screenshot({
        path: `${shots}/${name}-390-${mode}.png`,
        fullPage: true,
      });
      report.screenshots.push(`${name}-390-${mode}.png`);
    }
    report.checks.push(`${mode}: home and product content visible, no pin`);
    await context.close();
  }
} catch (error) {
  report.errors.push(error.stack ?? error.message);
} finally {
  if (browser) await browser.close();
  server.close();
  await writeFile(
    `${shots}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        pages: pages.length,
        checks: report.checks.length,
        screenshots: report.screenshots.length,
        errors: report.errors,
        brokenLinks: report.brokenLinks,
      },
      null,
      2,
    ),
  );
}
if (report.errors.length || report.brokenLinks.length) process.exitCode = 1;
