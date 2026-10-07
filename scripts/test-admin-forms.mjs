import { testEmail, testPhone } from './test-fixtures.mjs';
import nextEnv from '@next/env';
import {chromium,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {ownerSession} from './admin-session.mjs';
import {startNextServer} from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
const preview=await startNextServer(),browser=await chromium.launch(),context=await browser.newContext();
const {db,close}=await ownerSession(context,preview.origin);
const name='Test garment '+randomUUID().slice(0,8);let productId,discountId,originalSettings,testOrderId;
try{
 const page=await context.newPage();await page.goto(preview.origin+'/admin/products/new/');
 await page.getByLabel('Name',{exact:true}).fill(name);await page.getByLabel('Price (₹)',{exact:true}).fill('14800.10');await page.getByLabel('Compare at (₹)').fill('15000.20');
 await page.getByRole('button',{name:'Save product',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]+\//,{timeout:15000});
 productId=new URL(page.url()).pathname.split('/')[3];
 const stored=await db.from('products').select('price_paise,compare_at_paise').eq('id',productId).single();
 expect(stored.data?.price_paise).toBe(1480010);expect(stored.data?.compare_at_paise).toBe(1500020);
 await expect(page.getByLabel('Price (₹)',{exact:true})).toHaveValue('14800.10');console.log('PASS create draft product, exact rupee storage and edit round trip');
 await page.goto(preview.origin+'/admin/discounts/');
 const form=page.locator('form.admin-form').last();
 const code='TEST-'+randomUUID().slice(0,8).toUpperCase();
 await form.getByLabel('Code',{exact:true}).fill(code);await form.getByLabel('Kind').selectOption('fixed');await form.getByLabel('Discount amount (₹)').fill('0.10');await form.getByLabel('Minimum order (₹)').fill('148000.20');await form.getByLabel('Active',{exact:true}).uncheck();
 await form.getByRole('button',{name:'Add code'}).click();await expect(page.getByRole('status')).toContainText('Saved');
 const saved=await db.from('discount_codes').select('id,value,min_subtotal_paise').eq('code',code).single();discountId=saved.data?.id;expect(saved.data?.value).toBe(10);expect(saved.data?.min_subtotal_paise).toBe(14800020);console.log('PASS inactive fixed discount and minimum order save exact decimals');
 await page.goto(preview.origin+'/admin/settings/');
 originalSettings=(await db.from('settings').select('shipping_fee_paise,free_shipping_threshold_paise').eq('id',1).single()).data;
 await page.getByLabel('Shipping fee (₹)').fill('0.10');await page.getByLabel('Free shipping from (₹)').fill('148000.20');await page.getByRole('button',{name:'Save settings'}).click();await expect(page.getByRole('status')).toContainText('Saved');
 const settings=(await db.from('settings').select('shipping_fee_paise,free_shipping_threshold_paise').eq('id',1).single()).data;expect(settings.shipping_fee_paise).toBe(10);expect(settings.free_shipping_threshold_paise).toBe(14800020);
 await page.getByLabel('Shipping fee (₹)').fill((originalSettings.shipping_fee_paise/100).toFixed(2));await page.getByLabel('Free shipping from (₹)').fill((originalSettings.free_shipping_threshold_paise/100).toFixed(2));await page.getByRole('button',{name:'Save settings'}).click();await expect(page.getByRole('status')).toContainText('Saved');console.log('PASS shipping settings accept decimal rupees and original values restored');
 const alphabet='23456789ABCDEFGHJKLMNPQRSTUVWXYZ',number='LB-'+Array.from({length:8},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
 const order=await db.from('orders').insert({number,checkout_token:randomUUID(),status:'paid',customer_name:'Money test',email:testEmail('money'),phone:testPhone(),address:{},subtotal_paise:1480010,total_paise:1480010,paid_at:new Date().toISOString(),is_test:true}).select('id').single();if(order.error)throw new Error('Disposable refund fixture unavailable');testOrderId=order.data.id;
 await page.goto(preview.origin+`/admin/orders/${testOrderId}/`);await expect(page.getByLabel('Refund amount (₹)')).toHaveValue('14800.10');
 const rejected=await page.request.post(preview.origin+'/api/admin/refund/',{headers:{Origin:preview.origin},data:{order_id:testOrderId,refund:true,amount_rupees:'0.10'}});expect(rejected.status()).toBe(400);console.log('PASS refund displays rupees and server rejects a mismatched full-refund amount');
 const csv=await page.request.get(preview.origin+'/api/admin/export?type=orders');expect(csv.status()).toBe(200);const exported=await csv.text();expect(exported).toContain('Total (INR)');expect(exported).toContain('14800.10');console.log('PASS CSV totals labelled INR');
}finally{
 if(!productId){const p=await db.from('products').select('id').eq('name',name).maybeSingle();productId=p.data?.id;}
 if(productId)await db.from('products').delete().eq('id',productId);
 if(originalSettings)await db.from('settings').update(originalSettings).eq('id',1);
 if(testOrderId)await db.from('orders').delete().eq('id',testOrderId);
 if(discountId)await db.from('discount_codes').delete().eq('id',discountId);
 await close();await browser.close();preview.server.close();
}
