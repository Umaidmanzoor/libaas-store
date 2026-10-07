import { after,NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin,rateLimit } from "@/lib/ratelimit";
import { paymentDatabase,settlePayment,orderEmails } from "@/lib/payments";
import { signatureValid } from "@/lib/razorpay";
import { assertTestPayments } from "@/lib/env";
import { grantOrderAccess } from "@/lib/order-access";
const schema=z.object({razorpay_order_id:z.string().regex(/^order_[A-Za-z0-9]+$/),razorpay_payment_id:z.string().regex(/^pay_[A-Za-z0-9]+$/),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/),checkout_token:z.uuid()});
export async function POST(request:Request) {
  try {
    if(!await sameOrigin())return NextResponse.json({message:"Request not allowed."},{status:403});
    if(!await rateLimit("verify",40))return NextResponse.json({message:"Please wait before trying again."},{status:429});
    const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({message:"Payment could not be verified."},{status:400});
    const p=input.data,env=assertTestPayments();
    const {data:o}=await paymentDatabase().from("orders").select("razorpay_order_id").eq("checkout_token",p.checkout_token).maybeSingle();
    if(!o||o.razorpay_order_id!==p.razorpay_order_id||!signatureValid(`${o.razorpay_order_id}|${p.razorpay_payment_id}`,p.razorpay_signature,env.RAZORPAY_KEY_SECRET!))return NextResponse.json({message:"Payment could not be verified."},{status:400});
    const id=await settlePayment(o.razorpay_order_id,p.razorpay_payment_id);
    await grantOrderAccess(id);after(()=>orderEmails(id));
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({message:"We are confirming your payment. Please use Track order if this takes a moment."},{status:202});}
}
