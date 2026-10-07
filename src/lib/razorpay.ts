import "server-only";
import { createHmac,timingSafeEqual } from "node:crypto";
import { assertTestPayments } from "./env";
import { paymentLog } from "./payment-log";
export function signatureValid(body:string,signature:string,secret:string) {
  if(!/^[a-f0-9]{64}$/i.test(signature))return false;
  return timingSafeEqual(Buffer.from(signature,"hex"),createHmac("sha256",secret).update(body).digest());
}
export async function gateway<T>(path:string,body?:unknown):Promise<T> {
  const env=assertTestPayments();
  const response=await fetch(`https://api.razorpay.com/v1/${path}`,{
    method:body===undefined?"GET":"POST",cache:"no-store",signal:AbortSignal.timeout(15000),
    headers:{authorization:`Basic ${Buffer.from(`${env.NEXT_PUBLIC_RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,"content-type":"application/json"},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  if(!response.ok){paymentLog("gateway_http","provider_rejected",response.status);throw new Error("Payment service unavailable.");}
  return response.json();
}
export type GatewayPayment={id:string;order_id:string;amount:number;currency:string;status:string;captured:boolean};
