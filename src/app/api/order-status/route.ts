import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";
import { paymentDatabase } from "@/lib/payments";
import { grantOrderAccess } from "@/lib/order-access";
export async function GET(request:Request) {
  try {
    if(!await rateLimit("status",40))return NextResponse.json({message:"Please wait."},{status:429});
    const token=z.uuid().safeParse(request.headers.get("authorization")?.replace(/^Bearer /,""));
    if(!token.success)return NextResponse.json({message:"Order unavailable."},{status:404});
    const {data:o}=await paymentDatabase().from("orders").select("id,status,paid_at").eq("checkout_token",token.data).maybeSingle();
    if(!o)return NextResponse.json({message:"Order unavailable."},{status:404});
    if(o.paid_at)await grantOrderAccess(o.id);
    return NextResponse.json({status:o.status,paid:!!o.paid_at},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({message:"Order unavailable."},{status:503});}
}
