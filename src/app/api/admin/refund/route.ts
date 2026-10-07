import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { sameOrigin,rateLimit } from "@/lib/ratelimit";
import { gateway } from "@/lib/razorpay";
import { revalidateStorefront } from "@/lib/revalidation";
import { rupeesToPaise } from "@/lib/money";
const input=z.object({order_id:z.uuid(),refund:z.boolean(),amount_rupees:z.string().optional()});
export async function POST(request:Request) {
  if(!await sameOrigin())return NextResponse.json({message:"Request not allowed."},{status:403});
  const admin=await requireAdmin();if(!admin)return NextResponse.json({message:"Not authorised."},{status:403});
  if(!await rateLimit("admin-refund",10))return NextResponse.json({message:"Please wait."},{status:429});
  const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({message:"Invalid order."},{status:400});
  try {
    const db=admin.db,{data:o}=await db.from("orders").select("id,status,paid_at,razorpay_payment_id,total_paise,razorpay_refund_id,refund_claimed_at").eq("id",parsed.data.order_id).maybeSingle();
    if(!o||o.status==="refunded"||o.status==="cancelled"||o.razorpay_refund_id||o.refund_claimed_at)return NextResponse.json({message:"This order needs review before another change."},{status:409});
    if(!!o.paid_at!==parsed.data.refund)return NextResponse.json({message:"Paid orders require a refund; unpaid orders can be cancelled."},{status:409});
    if(parsed.data.refund){
      let amount;try{amount=rupeesToPaise(parsed.data.amount_rupees??"");}catch{return NextResponse.json({message:"Enter a valid refund amount in rupees."},{status:400});}
      if(amount!==o.total_paise)return NextResponse.json({message:"Only a full refund of the order total is supported."},{status:400});
      if(!o.paid_at||!o.razorpay_payment_id)return NextResponse.json({message:"This payment is not refundable here."},{status:409});
      const claim=await db.from("orders").update({refund_claimed_at:new Date().toISOString()}).eq("id",o.id).is("refund_claimed_at",null).select("id").maybeSingle();
      if(!claim.data||claim.error)return NextResponse.json({message:"This order needs review before another change."},{status:409});
      const result=await gateway<{id:string;payment_id:string;amount:number}>(`payments/${encodeURIComponent(o.razorpay_payment_id)}/refund`,{amount:o.total_paise,notes:{libaas_order_id:o.id}});
      if(result.payment_id!==o.razorpay_payment_id||result.amount!==o.total_paise)throw new Error("Refund needs review");
      const save=await db.from("orders").update({razorpay_refund_id:result.id}).eq("id",o.id).is("razorpay_refund_id",null);
      if(save.error)throw new Error("Refund needs review");
    }
    const cancelled=await db.rpc("cancel_order",{p_order:o.id,p_restock:!!o.paid_at});
    if(cancelled.error)throw new Error("Cancellation needs review");
    if(parsed.data.refund)await db.from("orders").update({status:"refunded"}).eq("id",o.id);
    revalidateStorefront();
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({message:"The request needs review. Check the payment dashboard before retrying."},{status:503});}
}
