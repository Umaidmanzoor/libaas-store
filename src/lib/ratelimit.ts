import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "./supabase/admin";
import { getEnv } from "./env";
import { trustedOrigin } from "./trusted-origin";
export async function rateLimitStatus(scope:string,limit:number,seconds=60,identifier="") {
  const h=await headers(),env=getEnv(),db=createAdminClient();
  if(!db||!env?.SUPABASE_SECRET_KEY)return "unavailable";
  // Netlify supplies its own non-client-controlled connection IP. Local requests
  // share a bucket; never trust arbitrary X-Forwarded-For for this decision.
  const ip=process.env.NETLIFY ? h.get("x-nf-client-connection-ip")||"unknown" : "local";
  const key=createHmac("sha256",env.SUPABASE_SECRET_KEY).update(`${scope}:${ip}:${identifier}`).digest("hex");
  const {data,error}=await db.rpc("hit_rate_limit",{key,limit,window_seconds:seconds});
  return error ? "unavailable" : data===true ? "allowed" : "limited";
}
export async function rateLimit(scope:string,limit:number,seconds=60,identifier="") {
  return await rateLimitStatus(scope,limit,seconds,identifier)==="allowed";
}
export async function sameOrigin() {
  const h=await headers();
  return trustedOrigin(h.get("origin"),[getEnv()?.NEXT_PUBLIC_SITE_URL,process.env.URL,process.env.DEPLOY_PRIME_URL],h.get("host"),!!process.env.NETLIFY);
}
export function humanTiming(started:number) {const age=Date.now()-started;return age>=1500&&age<24*60*60*1000;}
