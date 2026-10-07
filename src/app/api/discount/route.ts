import { NextResponse } from "next/server";
import { selectionSchema } from "@/lib/payment-validation";
import { sameOrigin,rateLimit } from "@/lib/ratelimit";
import { paymentDatabase } from "@/lib/payments";
export async function POST(request:Request) {
  try {
    if(!await sameOrigin())return NextResponse.json({message:"Request not allowed."},{status:403});
    if(!await rateLimit("quote",30))return NextResponse.json({message:"Please wait before trying again."},{status:429});
    const input=selectionSchema.safeParse(await request.json());
    if(!input.success)return NextResponse.json({message:"Please review your selection."},{status:400});
    const {data,error}=await paymentDatabase().rpc("quote_order",{p_items:input.data.items,p_code:input.data.code});
    if(error)return NextResponse.json({message:"A piece, its stock or this discount is unavailable. Please review your bag."},{status:409});
    return NextResponse.json({quote:data},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({message:"Checkout is not configured yet or is temporarily unavailable."},{status:503});}
}
