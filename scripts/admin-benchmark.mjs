import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { startNextServer } from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {auth:{persistSession:false}});
const {server,origin} = await startNextServer();
const browser = await chromium.launch();
const context = await browser.newContext();
let auth;
try {
  // Generate a local test session without sending email or changing the owner's password.
  const {data,error} = await db.auth.admin.generateLink({type:'magiclink',email:process.env.ADMIN_EMAIL});
  if(error) throw new Error('Owner test session unavailable');
  const jar=[];
  auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>jar,setAll:values=>{jar.splice(0,jar.length,...values)}}});
  const verified=await auth.auth.verifyOtp({token_hash:data.properties.hashed_token,type:'magiclink'});
  if(verified.error) throw new Error('Owner test session verification failed');
  await context.addCookies(jar.map(({name,value})=>({name,value,url:origin,httpOnly:true,sameSite:'Lax'})));
  const page=await context.newPage();
  const routes=['/admin/','/admin/products/','/admin/products/new/','/admin/categories/','/admin/orders/','/admin/discounts/','/admin/subscribers/','/admin/messages/','/admin/settings/'];
  const report=[];
  for(const route of routes){
    const samples=[];
    for(let i=0;i<3;i++){
      const start=performance.now();
      await page.goto(origin+route,{waitUntil:'domcontentloaded'});
      await page.locator('.admin-main h1').waitFor();
      if(page.url().includes('/login'))throw new Error('Owner session was not accepted');
      samples.push(Math.round(performance.now()-start));
    }
    report.push({route,samples_ms:samples,median_ms:[...samples].sort((a,b)=>a-b)[1]});
  }
  await mkdir('test-results',{recursive:true});
  const label=process.argv[2]==='after'?'after':'before';
  await writeFile(`test-results/admin-timing-${label}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{if(auth)await auth.auth.signOut({scope:'local'});await browser.close();server.close();}
