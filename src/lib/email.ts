import "server-only";
import { getEnv } from "./env";
import { createAdminClient } from "./supabase/admin";
import { escapeHtml,orderReceipt } from "./email-template";
import { z } from "zod";
async function businessEmail(){
 const db=createAdminClient();
 const result=db?await db.from("settings").select("store_email").eq("id",1).maybeSingle():null;
 const parsed=z.email().safeParse(result?.data?.store_email);
 return parsed.success?parsed.data:getEnv()?.OWNER_EMAIL;
}
async function send(to:string,subject:string,text:string,key:string,html?:string,replyTo?:string) {
 const env=getEnv();if(!env?.RESEND_API_KEY||!env.EMAIL_FROM){console.info("email unavailable: configuration");return false;}
 try {
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":key},
   signal:AbortSignal.timeout(10000),
   body:JSON.stringify({from:env.EMAIL_FROM,to:[to],subject,text,reply_to:replyTo,
    html:html??`<div style="background:#f4eee2;color:#1b1410;padding:32px;font-family:Arial,sans-serif"><h1>LIBAAS</h1><p style="white-space:pre-line;line-height:1.7">${escapeHtml(text)}</p></div>`})
  });
  // Log HTTP status only; provider error messages can include recipient data.
  if(!response.ok){console.info("email rejected: HTTP",response.status);return false;}
  const result=await response.json();
  return typeof result.id==="string"&&!!result.id;
 }catch{console.info("email delivery unavailable");return false;}
}
export async function orderEmails(id:string) {
 const db=createAdminClient();if(!db)return false;
 const {data:o,error}=await db.from("orders").select("id,number,email,phone,address,customer_name,subtotal_paise,discount_paise,shipping_paise,total_paise,is_test,paid_at,customer_email_sent,owner_email_sent,admin_note,order_items(name,size,colour,qty,unit_price_paise)").eq("id",id).maybeSingle();
 if(error||!o?.paid_at)return false;
 const env=getEnv(),inbox=await businessEmail();let failed=false;
 const site=process.env.URL||env?.NEXT_PUBLIC_SITE_URL||"";
 if(!o.customer_email_sent){
  const receipt=orderReceipt(o,site);
  const ok=await send(o.email,`Libaas · Order confirmation ${o.number}`,receipt.text,`order/${o.id}/customer`,receipt.html,inbox);
  if(ok){const result=await db.from("orders").update({customer_email_sent:true}).eq("id",id);if(result.error)failed=true;}else failed=true;
 }
 if(!o.owner_email_sent){
  const receipt=orderReceipt(o,site,true);
  const ok=!!inbox&&await send(inbox,`Libaas · New order ${o.number}`,receipt.text,`order/${o.id}/owner`,receipt.html,o.email);
  if(ok){const result=await db.from("orders").update({owner_email_sent:true}).eq("id",id);if(result.error)failed=true;}else failed=true;
 }
 // The existing sent flags are authoritative; avoid overwriting an admin's notes.
 if(failed)console.info("order email needs review; inspect recipient status in admin");
 return !failed;
}
export async function contactEmail(id:string,name:string,message:string) {
 const inbox=await businessEmail();if(inbox)await send(inbox,"New Libaas enquiry",`${name}\n\n${message}`,`contact/${id}`);
}
export async function shippedEmail(id:string) {
 const db=createAdminClient();if(!db)return false;
 const {data:o}=await db.from("orders").select("number,email,courier,tracking_id").eq("id",id).maybeSingle();
 return !!o&&send(o.email,`Your Libaas order ${o.number} has shipped`,`${o.number}\nCourier: ${o.courier}\nTracking: ${o.tracking_id}`,`order/${id}/shipped`,undefined,await businessEmail());
}
