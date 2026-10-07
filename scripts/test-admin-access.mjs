import { testEmail } from './test-fixtures.mjs';
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
import {chromium,expect} from '@playwright/test';
import {randomUUID,randomBytes} from 'node:crypto';
import {startNextServer} from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const preview=await startNextServer(),browser=await chromium.launch();
const email=testEmail(`access-test-${randomUUID()}`),password=randomBytes(24).toString('base64url'),newPassword=randomBytes(24).toString('base64url');let id;
try{
 const created=await db.auth.admin.createUser({email,password,email_confirm:true});if(created.error)throw new Error('Temporary access-test account unavailable');id=created.data.user.id;
 const page=await browser.newPage();
 async function login(pw){await page.goto(preview.origin+'/admin/login/');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(pw);await page.getByRole('button',{name:'Sign in',exact:true}).click();}
 await login(password);await expect(page).toHaveURL(/error=invalid/);console.log('PASS authenticated user outside the admin allowlist is denied');
 const added=await db.from('admins').insert({user_id:id,email});if(added.error)throw new Error('Temporary admin allowlist entry unavailable');
 await login(password);await expect(page).toHaveURL(/\/admin\/$/);console.log('PASS explicitly approved second admin can sign in');
 await page.goto(preview.origin+'/admin/account/');await page.getByLabel('Current password',{exact:true}).fill(password);await page.getByLabel('New password',{exact:true}).fill(newPassword);await page.getByLabel('Confirm new password',{exact:true}).fill(newPassword);await page.getByRole('button',{name:'Change password',exact:true}).click();await expect(page).toHaveURL(/changed=1/,{timeout:15000});
 await login(newPassword);await expect(page).toHaveURL(/\/admin\/$/);console.log('PASS password change requires current password and new password signs in');
 await db.from('admins').delete().eq('user_id',id);await page.goto(preview.origin+'/admin/settings/');await expect(page).toHaveURL(/\/admin\/login\//);const exported=await page.request.get(preview.origin+'/api/admin/export?type=orders');expect(exported.status()).toBe(403);console.log('PASS removing allowlist membership immediately denies pages and exports');
}finally{if(id){await db.from('admins').delete().eq('user_id',id);await db.auth.admin.deleteUser(id)}await browser.close();preview.server.close()}
