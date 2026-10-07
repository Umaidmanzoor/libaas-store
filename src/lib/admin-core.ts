import "server-only";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin-auth";
export async function adminPage() { const admin=await requireAdmin();if(!admin)redirect("/admin/login/");return admin; }
export function pageNumber(v:unknown){const n=Number(v);return Number.isSafeInteger(n)&&n>0?Math.min(n,10000):1;}
export function searchTerm(v:unknown){return typeof v==="string"?v.trim().slice(0,80).replace(/[%_,()]/g,""):"";}
export function pageRange(page:number){return {from:(page-1)*25,to:page*25-1};}
export function stamp(v:string|null|undefined){return v?new Date(v).toLocaleDateString("en-IN",{dateStyle:"medium"}):"—";}

export async function requestNow(){return Date.now();}
