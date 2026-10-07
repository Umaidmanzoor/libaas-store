import "server-only";
import { createHmac,timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getEnv } from "./env";
import { createAdminClient } from "./supabase/admin";
const cookieName="libaas-order";
export async function grantOrderAccess(id:string) {
  const secret=getEnv()?.SUPABASE_SECRET_KEY;if(!secret)return;
  const body=`${id}.${Date.now()+30*60*1000}`;
  const signature=createHmac("sha256",secret).update(body).digest("hex");
  (await cookies()).set(cookieName,`${body}.${signature}`,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:1800});
}
export async function readConfirmation() {
  const raw=(await cookies()).get(cookieName)?.value,secret=getEnv()?.SUPABASE_SECRET_KEY;
  if(!raw||!secret)return null;
  const [id,expiry,signature]=raw.split(".");
  if(!/^[a-f0-9-]{36}$/.test(id)||!/^\d+$/.test(expiry)||Number(expiry)<Date.now()||!/^[a-f0-9]{64}$/.test(signature||""))return null;
  const expected=createHmac("sha256",secret).update(`${id}.${expiry}`).digest();
  if(!timingSafeEqual(expected,Buffer.from(signature,"hex")))return null;
  const db=createAdminClient();if(!db)return null;
  const {data,error}=await db.from("orders").select("number,status,subtotal_paise,discount_paise,shipping_paise,total_paise,order_items(name,size,colour,unit_price_paise,qty)").eq("id",id).not("paid_at","is",null).maybeSingle();
  return error?null:data;
}
