import { testEmail, testPhone } from './test-fixtures.mjs';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const redact=text=>Object.values(process.env).filter(v=>v&&v.length>7).reduce((s,v)=>s.split(v).join('[redacted]'),text).slice(0,700);
import { chromium } from '@playwright/test';
const origin=process.argv[2]||'http://localhost:3001';
const browser=await chromium.launch();
const context=await browser.newContext();
const report={console:[],network:[],csp:[]};
try{
  await context.addInitScript(()=>{
    localStorage.setItem('libaas-cart-v2',JSON.stringify([{slug:'zoon-phiran',size:'S',color:'Walnut',quantity:1}]));
    window.__violations=[];
    document.addEventListener('securitypolicyviolation',e=>window.__violations.push({directive:e.effectiveDirective,blocked:e.blockedURI.split('?')[0]}));
  });
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')report.console.push(/eval/.test(m.text())?'eval blocked':/hydration|hydrated/i.test(m.text())?'hydration mismatch':redact(m.text()))});
  page.on('pageerror',()=>report.console.push('page error'));
  page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/api/')||u.hostname.includes('razorpay'))report.network.push({host:u.hostname,path:u.pathname,status:r.status()})});
  page.on('requestfailed',r=>{const u=new URL(r.url());if(u.hostname.includes('razorpay'))report.network.push({host:u.hostname,path:u.pathname,failed:r.failure()?.errorText})});
  const navigate=process.argv.includes('--navigate');
  const response=await page.goto(origin+(navigate?'/cart/':'/checkout/'),{waitUntil:'domcontentloaded'});
  report.header=response.headers()['content-security-policy']?.replace(/https:\/\/[^ ;]+\.supabase\.co/g,'[storage-origin]').replace(/nonce-[^']+/g,'nonce-[redacted]');
  if(navigate)await page.locator('.checkout-link').first().click();
  const form=page.locator('form.checkout-form');
  for(const [name,value]of Object.entries({name:'Checkout Test',email:testEmail('checkout'),mobile:testPhone(),address:'Test address 12',city:'Srinagar',pin:'190001'}))await form.locator(`[name="${name}"]`).fill(value);
  await form.locator('[name="state"]').selectOption('Jammu and Kashmir');
  await page.waitForTimeout(12000);
  report.payEnabled=await form.getByRole('button',{name:/Pay securely/}).isEnabled();
  report.scriptPresent=await page.evaluate(()=>typeof window.Razorpay==='function');
  report.status=await form.locator('[role="alert"]').innerText();
  report.csp=await page.evaluate(()=>window.__violations);
  report.csp=[...new Map(report.csp.map(v=>[JSON.stringify(v),v])).values()];
  report.network=report.network.filter(v=>!v.path.startsWith('/build/')&&!v.path.includes('logz'));
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
