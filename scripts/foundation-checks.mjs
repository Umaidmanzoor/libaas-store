import { expect } from "@playwright/test";
export async function checkFoundation(browser, origin, shots, report, connected) {
  for (const width of [390,768,1440]) {
    const page = await browser.newPage({viewport:{width,height:900}});
    page.on("pageerror",error=>report.errors.push(`Foundation: ${error.message}`));
    page.on("console",message=>{ if(message.type()==="error") report.errors.push(`Foundation: ${message.text()}`); });
    await page.goto(`${origin}/admin/`,{waitUntil:"networkidle"});
    await expect(page).toHaveURL(/\/admin\/login\//);
    await expect(page.locator("h1")).toHaveText("Welcome back.");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content",/noindex/);
    await expect(page.locator("main")).toContainText(/admin account|not configured/i);
    await page.screenshot({path:`${shots}/admin-login-${width}.png`,fullPage:true});
    report.screenshots.push(`admin-login-${width}.png`);
    await page.close();
  }
  const page = await browser.newPage();
  for (const route of ["/.env.local","/package.json","/supabase/schema.sql","/product/unknown-piece/","/shop/unknown-category/"]) {
    const response = await page.request.get(origin+route);
    expect(response.status(),route).toBe(404);
  }
  if(connected)await page.addInitScript(()=>localStorage.setItem("libaas-cart-v2",JSON.stringify([{slug:"zoon-phiran",size:"S",color:"Walnut",quantity:1}])));
  await page.goto(`${origin}/checkout/`);
  if(connected)await expect(page.getByRole("button",{name:/Pay securely/})).toBeVisible();
  else await expect(page.getByText("Checkout is not configured yet.",{exact:false})).toBeVisible();
  await page.close();
  report.checks.push(`Foundation: guarded owner login at three widths, noindex, ${connected?"connected checkout":"checkout fallback"}, unknown catalogue routes and internal files return 404`);
}
