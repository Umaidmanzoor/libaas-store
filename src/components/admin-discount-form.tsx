"use client";
import { useState } from "react";
import { saveDiscount } from "@/lib/admin-actions";
import { money, paiseToRupees } from "@/lib/money";
type Discount={id:string;code:string;kind:"percent"|"fixed";value:number;min_subtotal_paise:number;max_uses:number|null;used_count:number;starts_at:string|null;expires_at:string|null;active:boolean};
export function DiscountForm({discount:d}:{discount?:Discount}){
  const [kind,setKind]=useState(d?.kind??"percent");
  const [value,setValue]=useState(d?d.kind==="fixed"?paiseToRupees(d.value):String(d.value):"");
  return <form action={saveDiscount} className="admin-form admin-card">
    {d&&<><input type="hidden" name="id" value={d.id}/><h2>{d.code}</h2><p>{d.kind==="fixed"?money(d.value):`${d.value}%`} off · Minimum order {money(d.min_subtotal_paise)}</p></>}
    <div className="admin-row">
      <label>Code<input name="code" defaultValue={d?.code} required/></label>
      <label>Kind<select name="kind" value={kind} onChange={e=>{setKind(e.target.value as "percent"|"fixed");setValue("")}}><option value="percent">Percent</option><option value="fixed">Fixed rupees (₹)</option></select></label>
      <label>{kind==="fixed"?"Discount amount (₹)":"Discount (%)"}<input type="number" name="value" min={kind==="fixed"?"0.01":"1"} step={kind==="fixed"?"0.01":"1"} max={kind==="percent"?100:undefined} value={value} onChange={e=>setValue(e.target.value)} required/></label>
      <label>Minimum order (₹)<input type="number" name="min_subtotal_rupees" min="0" step="0.01" defaultValue={paiseToRupees(d?.min_subtotal_paise??0)} required/></label>
      <label>Max uses<input type="number" name="max_uses" min="1" defaultValue={d?.max_uses??""}/></label>
      {d&&<span>Used: {d.used_count}</span>}
    </div>
    <div className="admin-row"><label>Starts<input type="datetime-local" name="starts_at" defaultValue={d?.starts_at?.slice(0,16)??""}/></label><label>Expires<input type="datetime-local" name="expires_at" defaultValue={d?.expires_at?.slice(0,16)??""}/></label></div>
    <label><input type="checkbox" name="active" defaultChecked={d?.active??true}/> Active</label><button>{d?"Save code":"Add code"}</button>
  </form>;
}
