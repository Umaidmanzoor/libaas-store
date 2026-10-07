import { testCard, testEmail, testPhone } from './test-fixtures.mjs';
import nextEnv from '@next/env';
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdir,writeFile } from 'node:fs/promises';
import { startNextServer } from './preview.mjs';
nextEnv.loadEnvConfig(process.cwd());
if(!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.startsWith('rzp_test_'))throw new Error('This test requires Razorpay Test Mode');
const target=process.argv.find(v=>/^https?:/.test(v));
const preview=target?null:await startNextServer();const origin=target||preview.origin;
const browser=await chromium.launch();
const context=await browser.newContext(process.argv.includes("--mobile")?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{});
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false}});
const report={checks:[],network:[],errors:[],csp:[]};let checkoutToken;
const redact=text=>Object.values(process.env).filter(v=>v&&v.length>7).reduce((s,v)=>s.split(v).join('[redacted]'),text).replace(/(?:order|pay)_[A-Za-z0-9]+/g,'[provider-id]').slice(0,500);
try{
  await context.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push({directive:e.effectiveDirective,blocked:e.blockedURI.split('?')[0]}))});
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')report.errors.push(redact(m.text()))});
  page.on('pageerror',e=>report.errors.push(redact(e.message)));
  page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/checkout')||u.pathname==='/v1/checkout.js')report.network.push({path:u.pathname,status:r.status()})});
  page.on('request',r=>{if(new URL(r.url()).pathname==='/api/checkout/'&&r.method()==='POST')checkoutToken=r.postDataJSON()?.checkout_token});
  const document=await page.goto(origin+'/product/zoon-phiran/',{waitUntil:'domcontentloaded'});
  const csp=document.headers()['content-security-policy'];
  report.checks.push({documentPolicy:{evalAllowed:csp.includes("'unsafe-eval'"),razorpayAllowed:csp.includes('https://checkout.razorpay.com'),websocketAllowed:csp.includes('ws://localhost:*')}});
  await page.getByRole('button',{name:/Add to Bag/}).click();
  await page.locator('dialog.bag-drawer .checkout-link').click();
  const form=page.locator('form.checkout-form');
  for(const [name,value]of Object.entries({name:'Checkout Test',email:testEmail('checkout'),mobile:testPhone(),address:'12 Test Road',city:'Srinagar',pin:'190001'}))await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="state"]').selectOption('Jammu and Kashmir');
  const pay=form.getByRole('button',{name:/Pay securely/});await expect(pay).toBeEnabled({timeout:15000});
  await page.waitForTimeout(1600);
  const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/checkout/'&&r.request().method()==='POST');
  await pay.click();const response=await responsePromise;expect(response.status()).toBe(200);await response.json();
  const iframe=page.locator('iframe.razorpay-checkout-frame');await expect(iframe).toBeVisible({timeout:15000});
  report.checks.push('Product → bag → checkout → server order → visible Razorpay Test Mode iframe');
  await mkdir('screenshots/checkout-regression',{recursive:true});
  await page.screenshot({path:'screenshots/checkout-regression/payment-window.png'});
  if(process.argv.includes('--capture')){
    const frame=page.frameLocator('iframe.razorpay-checkout-frame');
    // Inspect provider controls without printing prefilled data or request bodies.
    await frame.locator('input[name="card.number"]').waitFor({state:'visible',timeout:15000});
    report.providerControls=await frame.locator('input').evaluateAll(inputs=>inputs.map(i=>({name:i.name,type:i.type,placeholder:i.placeholder})));
    await frame.locator('input[name="card.number"]').fill(testCard('number'));
    await frame.locator('input[name="card.expiry"]').fill(testCard('expiry'));
    await frame.locator('input[name="card.cvv"]').fill(testCard('cvv'));
    const contact=frame.locator('input[name="contact"]');
    if(await contact.isVisible()){
      await contact.fill(testPhone());
      await frame.getByRole('button',{name:'Continue',exact:true}).last().click({timeout:5000}).catch(()=>{});
    }
    await frame.getByRole('button',{name:'Continue',exact:true}).first().click({timeout:5000}).catch(()=>{report.captureStage='Provider overlay requires a further step';});
    await page.waitForTimeout(5000);
    await page.screenshot({path:'screenshots/checkout-regression/after-test-card.png'});
    report.captureStage??='Test card submitted; inspect provider confirmation';
    report.providerControls=await frame.locator('input').evaluateAll(inputs=>inputs.map(i=>({name:i.name,type:i.type,placeholder:i.placeholder})));
    report.providerButtons=await frame.getByRole('button').allTextContents();
    report.popupCount=context.pages().length;
    await writeFile('screenshots/checkout-regression/provider-controls.json',JSON.stringify(report.providerControls,null,2));
  }
  report.csp=await page.evaluate(()=>window.__csp);
  await writeFile('screenshots/checkout-regression/report.json',JSON.stringify(report,null,2));
  report.errors=[...new Set(report.errors)];
  console.log(JSON.stringify({checks:report.checks,network:report.network,errors:report.errors,csp:report.csp,captureStage:report.captureStage,popupCount:report.popupCount}));
}finally{
  if(checkoutToken){const {data}=await db.from('orders').select('id,paid_at').eq('checkout_token',checkoutToken).maybeSingle();if(data&&!data.paid_at){await db.rpc('cancel_order',{p_order:data.id,p_restock:false});await db.from('orders').delete().eq('id',data.id);}}
  await browser.close();preview?.server.close();
}
