import { NextResponse } from "next/server";
import { checkoutInput } from "@/lib/payment-validation";
import { sameOrigin,rateLimit,humanTiming } from "@/lib/ratelimit";
import { paymentDatabase } from "@/lib/payments";
import { assertTestPayments } from "@/lib/env";
import { gateway } from "@/lib/razorpay";
import { revalidateStorefront } from "@/lib/revalidation";
import { paymentLog } from "@/lib/payment-log";
export async function POST(request:Request) {
  let stage="origin";
  try {
    if(!await sameOrigin()){paymentLog(stage,"origin_rejected",403);return NextResponse.json({message:"Request not allowed."},{status:403});}
    stage="configuration";
    const env=assertTestPayments();
    stage="rate_limit";
    if(!await rateLimit("checkout",15))return NextResponse.json({message:"Please wait before trying again."},{status:429});
    const input=checkoutInput.safeParse(await request.json());
    if(!input.success)return NextResponse.json({message:"Please check your delivery details.",errors:Object.fromEntries(input.error.issues.map(i=>{
      const last=String(i.path[i.path.length-1]);
      return [last==="line1"?"address":last==="line2"?"address2":last,i.message];
    }))},{status:400});
    const p=input.data;if(!humanTiming(p.started_at))return NextResponse.json({message:"Please take a moment to review your details."},{status:400});
    const db=paymentDatabase();
    stage="create_order";
    const {data:o,error}=await db.rpc("create_order",{p_token:p.checkout_token,p_items:p.items,p_customer:p.customer,p_code:p.code,p_expected_total:p.expected_total,p_is_test:env.NEXT_PUBLIC_RAZORPAY_KEY_ID!.startsWith("rzp_test_")});
    if(error||!o){paymentLog(stage,error?.code,409);return NextResponse.json({message:"Prices, stock or your checkout session changed. Please review your bag and confirm the updated total.",refresh:true},{status:409});}
    let gatewayId=o.razorpay_order_id as string|null;
    if(!gatewayId) {
      const claim=await db.from("orders").update({gateway_claimed_at:new Date().toISOString()}).eq("id",o.id).is("razorpay_order_id",null).or(`gateway_claimed_at.is.null,gateway_claimed_at.lt.${new Date(Date.now()-60000).toISOString()}`).select("id").maybeSingle();
      if(claim.error||!claim.data)return NextResponse.json({message:"Your checkout is being prepared. Please retry in a moment."},{status:409});
      try {
        stage="gateway_order";
        const created=await gateway<{id:string;amount:number;currency:string}>("orders",{amount:o.total_paise,currency:"INR",receipt:o.number,notes:{libaas_order_id:o.id}});
        if(created.amount!==o.total_paise||created.currency!=="INR")throw new Error("Invalid gateway order");
        stage="save_gateway_order";
        const saved=await db.from("orders").update({razorpay_order_id:created.id}).eq("id",o.id).is("razorpay_order_id",null);
        if(saved.error)throw new Error("Order unavailable");gatewayId=created.id;
      }catch{await db.from("orders").update({gateway_claimed_at:null}).eq("id",o.id).is("razorpay_order_id",null);throw new Error("Payment service unavailable");}
    }
    revalidateStorefront();
    return NextResponse.json({orderNumber:o.number,razorpayOrderId:gatewayId,amount:o.total_paise,keyId:env.NEXT_PUBLIC_RAZORPAY_KEY_ID},{headers:{"Cache-Control":"no-store"}});
  }catch{paymentLog(stage);return NextResponse.json({message:"Checkout is not configured yet or is temporarily unavailable. Your bag is safe."},{status:503});}
}
