import { testEmail, testPhone } from './test-fixtures.mjs';
import { expect } from "@playwright/test";

export async function checkConnectedCheckout(browser, origin, report) {
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => localStorage.setItem("libaas-cart-v2", JSON.stringify([{ slug: "zoon-phiran", size: "S", color: "Walnut", quantity: 1 }])));
    const page = await context.newPage();
    page.on("pageerror", e => report.errors.push(`Checkout ${width}: ${e.message}`));
    page.on("console", m => { if (m.type() === "error" && !m.text().includes("status of 400 (Bad Request)")) report.errors.push(`Checkout ${width}: ${m.text()}`); });
    try {
      await page.goto(origin + "/checkout/", { waitUntil: "networkidle" });
      const form = page.locator("form.checkout-form");
      const pay = form.getByRole("button", { name: /Pay securely/ });
      await expect(pay).toBeEnabled();
      if(width<1024){
        const summary=page.locator(".checkout-summary-toggle");
        await expect(summary).toHaveAttribute("aria-expanded","false");
        await summary.click();
        await expect(summary).toHaveAttribute("aria-expanded","true");
      }
      await expect(page.locator(".order-summary .totals")).toBeVisible();
      for (const [name, value] of Object.entries({ name: "Checkout Test", email: testEmail('checkout'), mobile: testPhone(), city: "Srinagar", pin: "190001" }))
        await form.locator(`[name="${name}"]`).fill(value);
      await pay.click();
      await expect(form.locator('[name="address"]')).toHaveAttribute("aria-invalid", "true");
      await expect(form.locator('[name="state"]')).toHaveAttribute("aria-invalid", "true");
      await expect(form.locator('[name="address"]')).toBeFocused();
      report.checks.push(`Connected checkout ${width}: price and script ready; invalid details visible and focused without creating an order`);
    } finally { await context.close(); }
  }
}
