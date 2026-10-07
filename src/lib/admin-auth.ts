import "server-only";
import { cache } from "react";
import { createSessionClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
export const requireAdmin = cache(async function requireAdmin() {
  const session=await createSessionClient(),db=createAdminClient();
  if(!session||!db)return null;
  const {data,error}=await session.auth.getClaims();
  const userId=data?.claims?.sub;
  if(error||!userId)return null;
  const member=await db.from("admins").select("user_id").eq("user_id",userId).maybeSingle();
  return member.error||!member.data?null:{userId:userId,db};
});
