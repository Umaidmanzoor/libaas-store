import { testEmail, testPhone, testSecret } from './test-fixtures.mjs';
import assert from 'node:assert/strict';
// Test-only credentials; every request is intercepted and unknown URLs fail.
process.env.NEXT_PUBLIC_SUPABASE_URL='https://database.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=testSecret();
process.env.SUPABASE_SECRET_KEY=testSecret();
process.env.RESEND_API_KEY=testSecret();
process.env.EMAIL_FROM=`Libaas <${testEmail('orders')}>`;
process.env.OWNER_EMAIL=testEmail('fallback');
process.env.NEXT_PUBLIC_SITE_URL='https://store.example.test';
let inbox=testEmail('business'),rejectCustomer=false;
const order={id:'example-order',number:'LB-ABCDEFGH',customer_name:'Buyer',email:testEmail('buyer'),phone:testPhone(),address:{city:'Srinagar'},subtotal_paise:100000,discount_paise:0,shipping_paise:0,total_paise:100000,is_test:true,paid_at:'2026-10-06',customer_email_sent:false,owner_email_sent:false,order_items:[{name:'Shawl',size:'M',colour:'Gold',qty:1,unit_price_paise:100000}]};
const sent:{to:string[];reply_to?:string;html?:string}[]=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 const method=init?.method||'GET';
 if(url.hostname==='database.example.test'){
  if(url.pathname==='/rest/v1/settings')return Response.json({store_email:inbox});
  if(url.pathname==='/rest/v1/orders'){
   if(method==='PATCH'){Object.assign(order,JSON.parse(String(init?.body)));return new Response(null,{status:204});}
   return Response.json(order);
  }
 }
 if(url.hostname==='api.resend.com'&&url.pathname==='/emails'){
  const message=JSON.parse(String(init?.body));sent.push(message);
  if(rejectCustomer&&message.to.includes(order.email))return Response.json({name:'validation_error',message:'Test rejection'},{status:403});
  return Response.json({id:`email-${sent.length}`});
 }
 throw new Error(`Unexpected test request: ${url.hostname}${url.pathname}`);
};
try{
 const {orderEmails,contactEmail,shippedEmail}=await import('../src/lib/email.ts');
 assert(await orderEmails(order.id));assert.equal(sent.length,2);
 assert(sent[0].to?.includes(order.email));assert.equal(sent[0].reply_to,inbox);
 assert(sent[1].to?.includes(inbox));assert.equal(sent[1].reply_to,order.email);
 assert(String(sent[0].html).includes('Shawl'));
 await orderEmails(order.id);assert.equal(sent.length,2,'accepted receipts must not be resent');
 order.customer_email_sent=false;rejectCustomer=true;
 assert.equal(await orderEmails(order.id),false);assert.equal(order.customer_email_sent,false);assert.equal(order.owner_email_sent,true);
 rejectCustomer=false;assert(await orderEmails(order.id));assert(order.customer_email_sent);
 inbox=testEmail('changed');await contactEmail('contact','Name','Message');assert(sent.at(-1)?.to?.includes(inbox));
 await shippedEmail(order.id);assert.equal(sent.at(-1)?.reply_to,inbox);
 inbox='';await contactEmail('fallback-contact','Name','Message');assert(sent.at(-1)?.to?.includes(testEmail('fallback')));
 console.log('PASS customer/business recipients, changed business inbox, reply-to, rejected customer retry, accepted-send deduplication and owner fallback; no real emails sent');
}finally{globalThis.fetch=originalFetch;}
