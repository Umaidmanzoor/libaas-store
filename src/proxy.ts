import { NextRequest,NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import { contentSecurityPolicy } from "@/lib/csp";
export async function proxy(request:NextRequest){
  const admin=request.nextUrl.pathname.startsWith("/admin/")||request.nextUrl.pathname==="/admin";
  const nonce=Buffer.from(crypto.randomUUID()).toString("base64");
  const env=getEnv();
  let storageOrigin="";try{storageOrigin=new URL(env?.NEXT_PUBLIC_SUPABASE_URL||"").origin;}catch{}
  const csp=contentSecurityPolicy({nonce,storageOrigin,development:process.env.NODE_ENV==="development"});
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set("x-nonce",nonce);
  requestHeaders.set("Content-Security-Policy",csp);
  let response=NextResponse.next({request:{headers:requestHeaders}});
  if(admin&&env?.NEXT_PUBLIC_SUPABASE_URL&&env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY){
    const client=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
      cookieOptions:{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/"},
      cookies:{getAll(){return request.cookies.getAll();},setAll(values,cacheHeaders){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request:{headers:requestHeaders}});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));if(cacheHeaders)for(const [key,value] of Object.entries(cacheHeaders))response.headers.set(key,value);}}
    });
    // Refresh cookies here only. requireAdmin verifies claims and membership
    // before any access; no identity or authorization is trusted from getSession.
    await client.auth.getSession();
  }
  response.headers.set("Content-Security-Policy",csp);
  response.headers.set("Cache-Control","private, no-store");
  return response;
}
export const config={matcher:["/admin/:path*","/checkout/:path*"]};
