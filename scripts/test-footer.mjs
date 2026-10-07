import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {startNextServer} from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const preview=await startNextServer(),browser=await chromium.launch();
const email=`newsletter-${randomUUID()}@example.invalid`;
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.goto(preview.origin+'/shop/');await page.getByRole('link',{name:'Keeping your pieces',exact:true}).click();await expect(page.locator('#care')).toHaveAttribute('open','');await expect(page).toHaveURL(/\/shop\/#care$/);await expect(page.locator('#care summary')).toBeFocused();
  await page.getByRole('link',{name:'Stay in the loop',exact:true}).click();await expect(page).toHaveURL(/\/shop\/#newsletter$/);await expect(page.locator('#email')).toBeFocused();
  await page.locator('#email').fill(email);await page.getByRole('button',{name:'Join',exact:true}).click();await expect(page.locator('#newsletter-message')).toContainText('consent');
  await page.locator('input[name="consent"]').check();await page.waitForTimeout(1600);await page.getByRole('button',{name:'Join',exact:true}).click();await expect(page.locator('#newsletter-message')).toContainText('saved',{timeout:15000});
  await page.close();
 }
 const stored=await db.from('subscribers').select('email').eq('email',email);expect(stored.data?.length).toBe(1);console.log('PASS mobile/desktop care and newsletter anchors, focus, consent, real signup and duplicate idempotency');
}finally{await db.from('subscribers').delete().eq('email',email);await browser.close();preview.server.close()}
