import env from '@next/env';
import {chromium,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {ownerSession} from './admin-session.mjs';
import {startNextServer} from './preview.mjs';
env.loadEnvConfig(process.cwd());
const preview=await startNextServer(),browser=await chromium.launch(),context=await browser.newContext({isMobile:true,hasTouch:true});
const {close}=await ownerSession(context,preview.origin);await mkdir('screenshots/mobile',{recursive:true});
try{
 const page=await context.newPage();
 const noOverflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:740});await page.goto(preview.origin+'/admin/');await noOverflow();
  const menu=page.locator('.admin-mobile-nav');await menu.locator('summary').click();await expect(menu.getByRole('link',{name:'Account',exact:true})).toBeVisible();
  const panel=menu.locator('.admin-mobile-menu');await menu.getByRole('button',{name:'Sign out'}).scrollIntoViewIfNeeded();
  const account=await menu.getByRole('link',{name:'Account',exact:true}).boundingBox(),signout=await menu.getByRole('button',{name:'Sign out'}).boundingBox();expect(signout.y).toBeGreaterThanOrEqual(account.y+account.height);
  expect((await panel.boundingBox()).height).toBeLessThan(740);await page.keyboard.press('Escape');await expect(menu).not.toHaveAttribute('open','');
  await menu.locator('summary').click();await menu.getByRole('link',{name:'Settings',exact:true}).click();await expect(page.getByRole('heading',{name:'Store settings'})).toBeVisible();await expect(page.locator('.admin-mobile-nav')).not.toHaveAttribute('open','');await noOverflow();
  expect(await page.getByLabel('Main business email',{exact:true}).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.goto(preview.origin+'/admin/products/new/');await noOverflow();await page.screenshot({path:`screenshots/mobile/product-editor-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.goto(preview.origin+'/');await page.waitForTimeout(1300);expect(await page.locator('html').getAttribute('class')??'').not.toMatch(/\blenis\b/);await noOverflow();
 await page.goto(preview.origin+'/product/gulnaar-shawl/');await expect(page.locator('.image-dialog img')).toHaveCount(0);const gallery=page.locator('.gallery-zoom');await gallery.first().click();await expect(page.locator('.image-dialog')).toBeVisible();await expect(page.locator('.image-dialog img')).toHaveCount(1);await page.getByRole('button',{name:'Close image',exact:true}).click();await expect(page.locator('.image-dialog img')).toHaveCount(0);await noOverflow();
 console.log('PASS mobile admin navigation, sign-out spacing, Escape/link close, 16px inputs, 320/390/768 layouts, native touch scrolling and on-demand product enlargement');
}finally{await close();await browser.close();preview.server.close();}
