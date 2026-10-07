import { AdminShell } from "@/components/admin-shell";
import { adminPage } from "@/lib/admin-core";
import { changePassword } from "@/lib/admin-auth-actions";
export default async function Account({searchParams}:{searchParams:Promise<{error?:string}>}){
  await adminPage();const {error}=await searchParams;
  const messages:Record<string,string>={wait:"Please wait a few minutes before trying again.",details:"Use a new password of at least 12 characters and enter it twice exactly.",current:"Your current password could not be verified.",unavailable:"The password could not be changed. Please try again."};
  return <AdminShell title="Your account"><form className="admin-form admin-card" action={changePassword}><h2>Change password</h2><p>Changing your password signs you out. Sign in again with the new password.</p><label>Current password<input type="password" name="current" autoComplete="current-password" required maxLength={200}/></label><label>New password<input type="password" name="password" autoComplete="new-password" minLength={12} maxLength={200} required/></label><label>Confirm new password<input type="password" name="confirm" autoComplete="new-password" minLength={12} maxLength={200} required/></label>{error&&<p role="alert">{messages[error]??messages.unavailable}</p>}<button>Change password</button></form></AdminShell>;
}
