"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "./supabase/server";
import { requireAdmin } from "./admin-auth";
import { rateLimit,rateLimitStatus,sameOrigin } from "./ratelimit";
const input=z.object({email:z.email().max(254),password:z.string().min(1).max(200)});
export async function login(form:FormData){
  if(!await sameOrigin())redirect("/admin/login/?error=origin");
  const parsed=input.safeParse({email:String(form.get("email")??"").trim().toLowerCase(),password:form.get("password")});
  if(!parsed.success)redirect("/admin/login/?error=invalid");
  const broad=await rateLimitStatus("admin-login-network",30,300);
  if(broad!=="allowed")redirect(`/admin/login/?error=${broad==="limited"?"wait":"unavailable"}`);
  const limit=await rateLimitStatus("admin-login-account",5,300,parsed.data.email);
  if(limit!=="allowed")redirect(`/admin/login/?error=${limit==="limited"?"wait":"unavailable"}`);
  const session=await createSessionClient();if(!session)redirect("/admin/login/?error=setup");
  const {error}=await session.auth.signInWithPassword(parsed.data);
  if(error||!await requireAdmin()){await session.auth.signOut();redirect("/admin/login/?error=invalid");}
  redirect("/admin/");
}
export async function logout(){const admin=await requireAdmin();if(!admin)redirect("/admin/login/");const session=await createSessionClient();await session?.auth.signOut();redirect("/admin/login/");}

export async function changePassword(form:FormData){
  if(!await requireAdmin())redirect("/admin/login/");
  if(!await sameOrigin()||!await rateLimit("admin-password",5,300))redirect("/admin/account/?error=wait");
  const parsed=z.object({current:z.string().min(1).max(200),password:z.string().min(12).max(200),confirm:z.string()}).refine(v=>v.password===v.confirm&&v.password!==v.current).safeParse(Object.fromEntries(form));
  if(!parsed.success)redirect("/admin/account/?error=details");
  const session=await createSessionClient();if(!session)redirect("/admin/account/?error=unavailable");
  const user=await session.auth.getUser();
  if(!user.data.user?.email)redirect("/admin/login/");
  const verified=await session.auth.signInWithPassword({email:user.data.user.email,password:parsed.data.current});
  if(verified.error)redirect("/admin/account/?error=current");
  const updated=await session.auth.updateUser({password:parsed.data.password});
  if(updated.error)redirect("/admin/account/?error=unavailable");
  await session.auth.signOut({scope:"global"});
  redirect("/admin/login/?changed=1");
}
