import { after,NextResponse } from "next/server";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { signatureValid,gateway,type GatewayPayment } from "@/lib/razorpay";
import { paymentDatabase,settlePayment,orderEmails } from "@/lib/payments";
const payloadSchema=z.object({event:z.string(),payload:z.object({payment:z.object({entity:z.object({id:z.string().regex(/^pay_[A-Za-z0-9]+$/),order_id:z.string().regex(/^order_[A-Za-z0-9]+$/)})}).optional()})});
export async function POST(request:Request) {
  const secret=getEnv()?.RAZORPAY_WEBHOOK_SECRET;
  if(!secret)return NextResponse.json({ok:false},{status:503});
  const raw=await request.text();
  if(raw.length>262144||!signatureValid(raw,request.headers.get("x-razorpay-signature")||"",secret))return NextResponse.json({ok:false},{status:400});
  try {
    const eventId=z.string().min(1).max(200).parse(request.headers.get("x-razorpay-event-id"));
    const body=payloadSchema.parse(JSON.parse(raw));
    if(!["payment.captured","order.paid","payment.failed"].includes(body.event))return NextResponse.json({ok:true});
    const p=body.payload.payment?.entity;if(!p)return NextResponse.json({ok:false},{status:400});
    if(body.event==="payment.failed") {
      const payment=await gateway<GatewayPayment>(`payments/${p.id}`);
      if(payment.status==="failed"&&payment.order_id===p.order_id) {
        const db=paymentDatabase(),{data:o}=await db.from("orders").select("id").eq("razorpay_order_id",p.order_id).maybeSingle();
        if(o){const result=await db.rpc("mark_order_failed",{p_order:o.id,p_event:eventId});if(result.error)throw new Error("Retry");}
      }
    }else{const id=await settlePayment(p.order_id,p.id,{id:eventId,type:body.event});after(()=>orderEmails(id));}
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false},{status:503});}
}
