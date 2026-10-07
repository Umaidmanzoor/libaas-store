import { testEmail, testPhone } from './test-fixtures.mjs';
import { expect } from "@playwright/test";
export async function checkCommerce(browser, origin, width, shots, report) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) =>
    report.errors.push(`${width} flow: ${e.message}`),
  );
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(`${width} flow: ${m.text()}`);
  });
  const pass = (name) => report.checks.push(`${width}: ${name}`);
  const capture = async (name) => {
    if (name !== "bag-drawer-populated") {
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(350);
    }
    await page.screenshot({
      path: `${shots}/${name}-${width}.png`,
      fullPage: name !== "bag-drawer-populated",
    });
    report.screenshots.push(`${name}-${width}.png`);
  };
  try {
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.locator("#selection").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Shawls", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(2);
    pass("home category filter");
    await page.getByRole("button", { name: "All pieces", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(8);
    await page
      .getByRole("button", { name: "Save Gulnaar Shawl", exact: true })
      .click();
    await page.getByRole("link", { name: "View 1 saved pieces" }).click();
    await expect(page).toHaveURL(/\/wishlist\//);
    await expect(page.locator(".product-card")).toHaveCount(1);
    pass("home wishlist shared across pages");
    await page
      .getByRole("link", { name: "View Gulnaar Shawl", exact: true })
      .click();
    await expect(page.locator("h1")).toHaveText("Gulnaar Shawl");
    await page.getByRole("button", { name: "Size guide", exact: true }).click();
    await expect(page.locator(".size-dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".size-dialog")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Size guide", exact: true }),
    ).toBeFocused();
    pass("size dialog Escape and focus return");
    await page.getByRole("button", {name:"Rose",exact:true}).click();
    await page
      .getByRole("button", { name: "Add to Bag", exact: false })
      .first()
      .click();
    await expect(page.locator(".bag-drawer")).toBeVisible();
    for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest(".bag-drawer"),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(".bag-drawer")).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add to Bag", exact: false }).first(),
    ).toBeFocused();
    pass("bag dialog traps focus and returns focus");
    await page.getByRole("button", { name: "Natural", exact: true }).click();
    await page
      .getByRole("button", { name: "Add to Bag", exact: false })
      .first()
      .click();
    await expect(page.locator(".bag-drawer .cart-list li")).toHaveCount(2);
    await page.getByRole("button", { name: "Close bag", exact: true }).click();
    await page.goto(origin + "/product/zoon-phiran/", {
      waitUntil: "networkidle",
    });
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Natural", exact: true }).click();
    await page
      .getByRole("button", { name: "Add to Bag", exact: false })
      .first()
      .click();
    await page
      .getByRole("button", {
        name: "Increase Zoon Phiran M Natural",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Remove Gulnaar Shawl One size Rose",
        exact: true,
      })
      .click();
    await expect(page.locator(".bag-count")).toHaveText("3");
    pass("variant lines, quantity and removal");
    await capture("bag-drawer-populated");
    await page
      .getByRole("link", { name: "View full bag", exact: false })
      .click();
    await expect(page).toHaveURL(/\/cart\//);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".cart-page .cart-list li")).toHaveCount(2);
    await expect(page.locator(".cart-page")).toContainText("Natural / M");
    await expect(page.locator(".cart-page .total dd")).toHaveText("Rs 26,100");
    await capture("cart-populated");
    pass("persistent variant bag and accurate totals");
    await page
      .getByRole("link", { name: "Continue to checkout", exact: false })
      .click();
    await page
      .getByRole("button", { name: "Review selection", exact: false })
      .click();
    await expect(page.locator('input[name="name"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page.locator('input[name="name"]')).toBeFocused();
    pass("checkout validation and error focus");
    const form = page.locator(".checkout-form");
    for (const [name, value] of Object.entries({
      name: "Sample Buyer",
      email: testEmail('buyer'),
      mobile: testPhone(),
      address: "12 Sample Street",
      city: "Srinagar",
      pin: "190001",
    }))
      await form.locator(`[name="${name}"]`).fill(value);
    await form.locator('[name="state"]').selectOption("Jammu and Kashmir");
    await form.locator('[name="pin"]').fill("000000");
    await page
      .getByRole("button", { name: "Review selection", exact: false })
      .click();
    await expect(form.locator('[name="pin"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await form.locator('[name="pin"]').fill("190001");
    await capture("checkout-filled");
    await page
      .getByRole("button", { name: "Review selection", exact: false })
      .click();
    await expect(page).toHaveURL(/\/order\/confirmation\//);
    await expect(page.locator("h1")).toHaveText("A lovely choice.");
    await expect(page.locator(".receipt")).toContainText("Rs 26,100");
    await expect(page.locator(".bag-count")).toHaveText("0");
    const storage = await page.evaluate(() => ({
      local: JSON.stringify({ ...localStorage }),
      session: JSON.stringify({ ...sessionStorage }),
    }));
    expect(storage.local + storage.session).not.toContain(testEmail('buyer'));
    expect(storage.local + storage.session).not.toContain("12 Sample Street");
    pass("demo checkout, receipt, cleared bag and no saved personal details");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".receipt")).toContainText("REF-");
    await capture("confirmation-success");
    await page.goto(origin + "/shop/", { waitUntil: "networkidle" });
    await page.getByLabel("Search pieces").fill("zz-no-match");
    await expect(page.locator("main .empty-state")).toContainText(
      "No pieces found.",
    );
    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page.locator(".product-card")).toHaveCount(16);
    await page.getByLabel("Sort by").selectOption("low");
    await expect(page.locator(".product-card").first()).toContainText(
      "Morning Stole",
    );
    await page.getByLabel("Sort by").selectOption("high");
    await expect(page.locator(".product-card").first()).toContainText(
      "Chinar Kani Shawl",
    );
    await page.getByRole("button", { name: "Stoles", exact: true }).click();
    await expect(page.locator(".product-card")).toHaveCount(4);
    pass("shop search, empty reset, sorting and filters");
    await page.getByRole("button", { name: /^Add to bag — Dal Stole/ }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".bag-drawer")).toBeVisible();
    await expect(page.locator(".bag-drawer .total dd")).toHaveText("Rs 3,450");
    await page.getByRole("button", { name: "Close bag", exact: true }).click();
    pass("sample shipping below threshold");
    await page.goto(origin + "/contact/", { waitUntil: "networkidle" });
    const contact = page.locator(".contact-layout form");
    await contact
      .getByRole("button", { name: "Send message", exact: false })
      .click();
    await expect(contact.locator('[name="name"]')).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await contact.locator('[name="name"]').fill("Sample Visitor");
    await contact.locator('[name="email"]').fill(testEmail('visitor'));
    await contact
      .locator('[name="message"]')
      .fill("Please tell me more about the collection.");
    await contact
      .getByRole("button", { name: "Send message", exact: false })
      .click();
    await expect(contact.locator('[role="status"]')).toContainText(
      "not been saved or sent",
    );
    pass("contact validation and demo success");
    await capture("contact-success");
    await page.goto(origin + "/product/gulnaar-shawl/", {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("link", { name: "Enquire about this piece", exact: false })
      .click();
    const enquiry = page.locator("#enquiry form");
    await enquiry.locator('[name="name"]').fill("Sample Visitor");
    await enquiry.locator('[name="email"]').fill(testEmail('visitor'));
    await enquiry
      .getByRole("button", { name: "Send message", exact: false })
      .click();
    await expect(enquiry.locator('[role="status"]')).toContainText(
      "not been saved or sent",
    );
    pass("demo enquiry link and submission");
    await page.locator("#email").fill("bad");
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(page.locator("#newsletter-message")).toContainText(
      "valid email",
    );
    await page.locator("#email").fill(testEmail('newsletter'));
    await page.getByRole("button", { name: "Join", exact: true }).click();
    await expect(page.locator("#newsletter-message")).toContainText(
      "not been saved or sent",
    );
    pass("newsletter validation and success");
    if (width === 390) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.locator("#mobile-navigation")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Open menu" }),
      ).toBeFocused();
      pass("mobile menu Escape");
    }
  } finally {
    await context.close();
  }
}
export async function checkEdgeCases(browser, origin, report) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      "libaas-bag",
      JSON.stringify(["dal-stole", "dal-stole", "not-a-piece"]),
    );
    localStorage.setItem(
      "libaas-saved",
      JSON.stringify(["dal-stole", "not-a-piece"]),
    );
  });
  const page = await context.newPage();
  await page.goto(origin + "/cart/", { waitUntil: "networkidle" });
  await expect(page.locator(".bag-count")).toHaveText("2");
  await expect(page.locator(".cart-page .cart-list li")).toHaveCount(1);
  await expect(page.locator(".cart-page .total dd")).toHaveText("Rs 6,400");
  report.checks.push(
    "Legacy bag migration ignores unknown pieces and combines quantities",
  );
  await page.getByRole("button", { name: "Open bag, 2 items" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".bag-drawer")).not.toBeVisible();
  report.checks.push("reduced-motion drawer opens and closes");
  await context.close();
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Disabled", "SecurityError");
    };
  });
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(origin + "/product/dal-stole/", {
    waitUntil: "networkidle",
  });
  await blockedPage
    .getByRole("button", { name: "Add to Bag", exact: false })
    .first()
    .click();
  await expect(blockedPage.locator(".bag-count")).toHaveText("1");
  await blockedPage
    .getByRole("link", { name: "Continue to checkout", exact: false })
    .click();
  const form = blockedPage.locator(".checkout-form");
  for (const [name, value] of Object.entries({
    name: "Sample Buyer",
    email: testEmail('buyer'),
    mobile: testPhone(),
    address: "12 Sample Street",
    city: "Srinagar",
    pin: "190001",
  }))
    await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="state"]').selectOption("Jammu and Kashmir");
  await form
    .getByRole("button", { name: "Review selection", exact: false })
    .click();
  await expect(form.locator('[role="alert"]')).toContainText(
    "your bag has been kept",
  );
  await expect(blockedPage.locator(".bag-count")).toHaveText("1");
  report.checks.push(
    "blocked storage keeps in-memory bag and reports confirmation failure without clearing bag",
  );
  await blocked.close();
}
