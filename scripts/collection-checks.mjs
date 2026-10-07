import {expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const products=JSON.parse(await readFile('content/products.json','utf8'));
export async function checkCollection(browser,origin,width,shots,report){
 const context=await browser.newContext({viewport:{width,height:900}});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(`${width} collection: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(`${width} collection: ${m.text()}`)});
 try{
  for(const p of products){
   await page.goto(origin+`/product/${p.slug}/`,{waitUntil:'networkidle'});
   await expect(page.locator('main .placeholder')).toHaveCount(0);
   const seen=new Set();
   for(const color of p.colors){
    await page.getByRole('button',{name:color,exact:true}).click();
    await expect(page.getByRole('button',{name:color,exact:true})).toHaveAttribute('aria-pressed','true');
    const im=page.locator('.product-gallery img').first();
    await expect(im).toHaveAttribute('alt',new RegExp(`in ${color}`));
    await im.evaluate(async im=>await im.decode());
    const src=await im.evaluate(im=>im.currentSrc);
    expect(src).toContain(p.media[color].slot);
    expect(seen.has(src)).toBe(false);seen.add(src);
   }
   report.checks.push(`${width}: ${p.name} — every colour changes to a loaded, distinct image; no placeholders`);
  }
  await page.goto(origin+'/product/zoon-phiran/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Natural',exact:true}).click();
  const opener=page.getByRole('button',{name:'Enlarge Zoon Phiran in Natural'});
  await opener.click();
  await expect(page.locator('.image-dialog')).toBeVisible();
  await expect(page.locator('.image-dialog img')).toHaveAttribute('src',/zoon-phiran\/natural/);
  await page.screenshot({path:`${shots}/zoon-natural-enlarged-${width}.png`});
  report.screenshots.push(`zoon-natural-enlarged-${width}.png`);
  await page.keyboard.press('Escape');await expect(opener).toBeFocused();
  await opener.click();await page.getByRole('button',{name:'Close image',exact:true}).click();
  await expect(page.locator('.image-dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'M',exact:true}).click();
  await page.getByRole('button',{name:'Add to Bag',exact:false}).first().click();
  await expect(page.locator('.bag-drawer img')).toHaveAttribute('src',/zoon-phiran\/natural/);
  await expect(page.locator('.bag-drawer')).toContainText('Natural / M');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Walnut',exact:true}).click();
  await page.getByRole('button',{name:'Add to Bag',exact:false}).first().click();
  await expect(page.locator('.bag-drawer .cart-list li')).toHaveCount(2);
  await expect(page.locator('.bag-drawer img').nth(1)).toHaveAttribute('src',/zoon-phiran\/walnut/);
  await page.keyboard.press('Escape');
  report.checks.push(`${width}: zoom open/close/Escape/focus, size selection and colour-specific bag thumbnails`);
  for(const category of ['shawls','phirans','suits','stoles']){
   await page.goto(origin+`/shop/${category}/`,{waitUntil:'networkidle'});
   await expect(page.locator('.product-card')).toHaveCount(4);
   await expect(page.locator('main .placeholder')).toHaveCount(0);
  }
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  await page.getByRole('link',{name:'Keeping your pieces',exact:true}).click();
  await expect(page.locator('#care')).toHaveAttribute('open','');
  await page.getByRole('link',{name:'Product enquiries',exact:true}).click();
  await expect(page).toHaveURL(/\/contact\//);
  if(width<1024){await page.evaluate(()=>scrollTo(0,0));await page.getByRole('button',{name:'Open menu',exact:true}).click();}
  await page.locator(width<1024?'#mobile-navigation':'#main-nav').getByRole('link',{name:'Collections',exact:true}).click();
  await expect(page).toHaveURL(/\/#collections$/);
  await expect(page.locator('#collections')).toBeInViewport();
  report.checks.push(`${width}: four expanded categories, care disclosure, enquiry navigation and Collections header link`);
 }finally{await context.close()}
}
