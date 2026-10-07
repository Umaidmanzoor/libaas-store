import { testEmail, testPhone } from './test-fixtures.mjs';
import {chromium,expect} from '@playwright/test';
import {startNextServer} from './preview.mjs';
const preview=await startNextServer(),browser=await chromium.launch();
const script='https://checkout.razorpay.com/v1/checkout.js';
async function setup(){
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('libaas-cart-v2',JSON.stringify([{slug:'zoon-phiran',size:'S',color:'Walnut',quantity:1}])));
  return {context,page:await context.newPage()};
}
try{
  {
    const {context,page}=await setup();
    await page.route(script,route=>route.abort());
    await page.goto(preview.origin+'/checkout/',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
    await page.unroute(script);
    await page.getByRole('button',{name:'Retry',exact:true}).click();
    await expect(page.getByRole('button',{name:/Pay securely/})).toBeEnabled({timeout:15000});
    await context.close();console.log('PASS blocked script shows Retry; retry loads a fresh script');
  }
  {
    const {context,page}=await setup();
    await page.route(script,()=>new Promise(()=>{}));
    await page.goto(preview.origin+'/checkout/',{waitUntil:'domcontentloaded'});
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible({timeout:12000});
    await expect(page.locator('.form-result')).toContainText('could not load');
    await context.close();console.log('PASS stalled script stops loading after ten seconds');
  }
  {
    const {context,page}=await setup();
    await page.route('**/api/checkout/',()=>new Promise(()=>{}));
    await page.goto(preview.origin+'/checkout/',{waitUntil:'domcontentloaded'});
    const form=page.locator('form.checkout-form');
    for(const [name,value]of Object.entries({name:'Checkout Test',email:testEmail('checkout'),mobile:testPhone(),address:'12 Test Road',city:'Srinagar',pin:'190001'}))await form.locator(`[name="${name}"]`).fill(value);
    await form.locator('[name="state"]').selectOption('Jammu and Kashmir');
    const pay=page.getByRole('button',{name:/Pay securely/});await expect(pay).toBeEnabled({timeout:15000});await pay.click();
    await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible({timeout:12000});
    await expect(form.locator('[role="alert"]')).toContainText('Your bag is safe');
    await expect(pay).toBeEnabled();
    await context.close();console.log('PASS stalled checkout request times out without clearing the bag');
  }
  {
    const {context,page}=await setup();await page.goto(preview.origin+'/checkout/',{waitUntil:'domcontentloaded'});
    const rejected=await page.request.post(preview.origin+'/api/checkout/',{headers:{Origin:'https://example.invalid'},data:{}});expect(rejected.status()).toBe(403);
    const accepted=await page.request.post(preview.origin+'/api/checkout/',{headers:{Origin:preview.origin},data:{}});expect(accepted.status()).toBe(400);
    await context.close();console.log('PASS foreign origin rejected; matching localhost port reaches validation');
  }
}finally{await browser.close();preview.server.close()}
