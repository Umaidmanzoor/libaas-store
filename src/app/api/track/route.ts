import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin,rateLimit,humanTiming } from "@/lib/ratelimit";
import { paymentDatabase } from "@/lib/payments";
const input=z.object({number:z.string().regex(/^LB-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/),phone:z.string().regex(/^\d{10}$/),website:z.string().max(0),started_at:z.number().int()});
const missing=()=>NextResponse.json({message:"We could not find that order."},{status:404});
export async function POST(request:Request) {
  if(!await sameOrigin())return missing();
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success||!humanTiming(parsed.data.started_at))return missing();
  if(!await rateLimit("track",8,60,parsed.data.number))return missing();
  try {
    const {data:o}=await paymentDatabase().from("orders").select("status,created_at,paid_at,shipped_at,delivered_at,courier,tracking_id").eq("number",parsed.data.number).eq("phone",parsed.data.phone).maybeSingle();
    return o?NextResponse.json({order:o},{headers:{"Cache-Control":"no-store"}}):missing();
  }catch{return missing();}
}
