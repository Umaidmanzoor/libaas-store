import { backendConfigured } from "@/lib/env";
import { requireAdmin } from "@/lib/admin-auth";
import { login } from "@/lib/admin-auth-actions";
import { redirect } from "next/navigation";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;changed?:string}>}){
  if(await requireAdmin())redirect("/admin/");
  const {error,changed}=await searchParams;
  return <main className="admin-login"><img src="/brand/logo-display.webp" alt="Libaas" width="128" height="52"/><p className="admin-eyebrow">OWNER STUDIO</p><h1>Welcome back.</h1>{!backendConfigured()?<p>Owner login is not configured yet. Complete the Supabase setup first.</p>:<><p>Sign in with an approved admin account.</p>{changed&&<p role="status">Password changed. Sign in with your new password.</p>}<form action={login}><label>Email<input type="email" name="email" autoComplete="username" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" required/></label><button type="submit">Sign in</button></form>{error&&<p role="alert">{error==="wait"?"Too many attempts. Wait five minutes after your first attempt, then try again.":error==="origin"?"This site address is not configured for sign-in. Check NEXT_PUBLIC_SITE_URL in Netlify and redeploy.":error==="unavailable"?"Sign-in protection is temporarily unavailable. Check the database connection and rate-limit setup.":"Sign-in is unavailable. Check your details or setup."}</p>}</>}</main>
}
