import { chromium } from "@playwright/test";

const input = process.argv[2];
if (!input) throw new Error("Usage: npm run smoke -- https://your-site.netlify.app");
const origin = new URL(input).origin;
if (!/^https?:$/.test(new URL(origin).protocol)) throw new Error("Use an HTTP(S) URL");
const routes = ["/", "/shop/", "/contact/", "/checkout/", "/admin/login/", "/robots.txt", "/sitemap.xml"];
const failures = [];
for (const route of routes) {
  try {
    const response = await fetch(origin + route, { redirect: "follow" });
    if (!response.ok) failures.push(`${route}: HTTP ${response.status}`);
    if (route === "/checkout/" || route.startsWith("/admin/")) {
      const csp = response.headers.get("content-security-policy") || "";
      if (!csp.includes("'nonce-") || !csp.includes("frame-ancestors 'none'")) failures.push(`${route}: nonce CSP missing`);
      if (!/no-store/.test(response.headers.get("cache-control") || "")) failures.push(`${route}: private cache policy missing`);
    }
    if (route === "/robots.txt" && !(await response.text()).includes("Disallow: /admin/")) failures.push("robots: admin rule missing");
    if (route === "/sitemap.xml" && !(await response.text()).includes("<urlset")) failures.push("sitemap: missing URL set");
  } catch (error) { failures.push(`${route}: ${error.message}`); }
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", error => failures.push(`browser: ${error.message}`));
  for (const route of ["/", "/shop/", "/checkout/", "/admin/login/"]) {
    const response = await page.goto(origin + route, { waitUntil: "networkidle" });
    if (!response?.ok()) failures.push(`${route}: browser HTTP ${response?.status()}`);
    if (!(await page.locator("h1").count())) failures.push(`${route}: no heading`);
  }
  const unknown = await page.goto(origin + "/missing-page-smoke-check/", { waitUntil: "domcontentloaded" });
  if (unknown?.status() !== 404) failures.push(`404: HTTP ${unknown?.status()}`);
} finally { await browser.close(); }
console.log(`${routes.length} routes, mobile browser and 404 checked against ${origin}`);
if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
