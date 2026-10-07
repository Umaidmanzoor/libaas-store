import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin, rateLimit } from "@/lib/ratelimit";
import { paymentLog } from "@/lib/payment-log";
const input=z.object({reason:z.enum(["script_timeout","script_missing","script_blocked","request_timeout","request_failed","window_blocked"])});
export async function POST(request:Request){
  if(!await sameOrigin()||!await rateLimit("checkout-diagnostic",12))return new NextResponse(null,{status:403});
  const parsed=input.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return new NextResponse(null,{status:400});
  paymentLog("browser_report",parsed.data.reason);
  return new NextResponse(null,{status:204});
}
