import nextEnv from '@next/env';
import {chromium,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {ownerSession} from './admin-session.mjs';
import {startNextServer} from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
const preview=await startNextServer(),browser=await chromium.launch(),context=await browser.newContext();
const {db,close}=await ownerSession(context,preview.origin);
const slug='category-check-'+randomUUID().slice(0,8);let categoryId,productId,targetId;
try{
 const page=await context.newPage();await page.goto(preview.origin+'/admin/categories/');
 const form=page.locator('form.admin-form').last();await form.getByLabel('Name',{exact:true}).fill(slug);await form.getByLabel('Slug',{exact:true}).fill(slug);await form.getByRole('button',{name:'Add category'}).click();await expect(page.getByRole('status')).toHaveText('Saved.');
 categoryId=(await db.from('categories').select('id').eq('slug',slug).single()).data?.id;expect(categoryId).toBeTruthy();
 const target=await db.from('categories').insert({slug:slug+'-target',name:slug+' target'}).select('id').single();targetId=target.data?.id;expect(targetId).toBeTruthy();
 const card=()=>page.locator('section.admin-card').filter({has:page.locator(`input[value="${categoryId}"]`)});
 await card().locator('summary').click();
 page.once('dialog',dialog=>dialog.dismiss());await card().getByRole('button',{name:'Confirm removal'}).click();expect((await db.from('categories').select('id').eq('id',categoryId)).data).toHaveLength(1);
 const product=await db.from('products').insert({slug,name:slug,category_id:categoryId,price_paise:100,status:'draft'}).select('id').single();productId=product.data?.id;expect(productId).toBeTruthy();
 page.once('dialog',dialog=>dialog.accept());await card().getByRole('button',{name:'Confirm removal'}).click();await expect(page.getByRole('status')).toContainText('This category still has products');expect((await db.from('categories').select('id').eq('id',categoryId)).data).toHaveLength(1);
 if(!await card().locator('details').evaluate(el=>el.open))await card().locator('summary').click();await card().getByLabel('Move products to').selectOption(targetId);
 page.once('dialog',dialog=>dialog.accept());await card().getByRole('button',{name:'Confirm removal'}).click();await expect(page.getByRole('status')).toHaveText('Deleted.');expect((await db.from('categories').select('id').eq('id',categoryId)).data).toHaveLength(0);
 const moved=(await db.from('products').select('category_id,status,price_paise').eq('id',productId).single()).data;expect(moved).toEqual({category_id:targetId,status:'draft',price_paise:100});
 console.log('PASS category creation, cancellation, in-use protection and removal with product preservation');
}finally{if(productId)await db.from('products').delete().eq('id',productId);if(categoryId)await db.from('categories').delete().eq('id',categoryId);if(targetId)await db.from('categories').delete().eq('id',targetId);await close();await browser.close();preview.server.close();}
