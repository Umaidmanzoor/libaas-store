import { testEmail, testPhone } from './test-fixtures.mjs';
import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
export async function checkAccessibility(browser, origin, report) {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) =>
      report.errors.push(`keyboard ${reducedMotion}: ${e.message}`),
    );
    page.on("console", (m) => {
      if (m.type() === "error")
        report.errors.push(`keyboard ${reducedMotion}: ${m.text()}`);
    });
    // Find controls only by pressing Tab; no programmatic focus, mouse clicks or filled inputs.
    async function tabTo(selector) {
      for (let i = 0; i < 100; i++) {
        if (
          await page.evaluate(
            (s) => document.activeElement?.matches(s),
            selector,
          )
        )
          return;
        await page.keyboard.press("Tab");
      }
      throw Error(`Keyboard cannot reach ${selector}`);
    }
    await page.goto(origin + "/product/zoon-phiran/", {
      waitUntil: "networkidle",
    });
    await tabTo(".variant-options button:nth-of-type(2)");
    await page.keyboard.press("Enter");
    await tabTo(".product-buttons button.primary");
    await page.keyboard.press("Enter");
    await expect(page.locator(".bag-drawer")).toBeVisible();
    await tabTo('.bag-drawer a[href="/checkout/"]');
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/checkout\//);
    for (const [name, value] of Object.entries({
      name: "Keyboard Buyer",
      email: testEmail('keyboard'),
      mobile: testPhone(),
      address: "12 Sample Street",
      city: "Srinagar",
      pin: "190001",
    })) {
      await tabTo(`.checkout-form input[name="${name}"]`);
      await page.keyboard.type(value);
    }
    await tabTo('.checkout-form select[name="state"]');
    await page.keyboard.press("j");
    await page.keyboard.press("Tab");
    await tabTo(".checkout-form button.primary");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/order\/confirmation\//);
    await expect(page.locator(".confirmation")).toContainText(
      "No payment or order has been processed",
    );
    await expect(page.locator(".bag-count")).toHaveText("0");
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      a.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    report.checks.push(
      `Keyboard-only purchase, ${reducedMotion}: real Tab/Enter/typing; confirmation and cleared bag`,
    );
    await context.close();
  }
  const page = await browser.newPage();
  const missing = await page.goto(origin + "/this-page-does-not-exist/", {
    waitUntil: "networkidle",
  });
  expect(missing.status()).toBe(404);
  await expect(page.locator("h1")).toContainText("A thread");
  expect(missing.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  // Dynamic routes receive nonce policies; cached pages use the public policy.
  await page
    .getByRole("link", { name: "Shop the Collection", exact: false })
    .first()
    .click();
  await expect(page).toHaveURL(/\/shop\//);
  report.checks.push(
    "Unknown URL returns styled 404 with security headers and working recovery",
  );
  await page.close();
}
