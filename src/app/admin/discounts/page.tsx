import { AdminShell,AdminFeedback,AdminNotice,AdminPager } from "@/components/admin-shell";
import { DiscountForm } from "@/components/admin-discount-form";
import { adminPage,pageNumber,pageRange } from "@/lib/admin-core";
export default async function Discounts({searchParams}:{searchParams:Promise<{page?:string;result?:string}>}){
  const {db}=await adminPage(),p=await searchParams,page=pageNumber(p.page),{from,to}=pageRange(page);
  const {data}=await db.from("discount_codes").select("id,code,kind,value,min_subtotal_paise,max_uses,used_count,starts_at,expires_at,active").order("code").range(from,to);
  return <AdminShell title="Discount codes"><AdminFeedback value={p.result}/>{data?.length?<div className="admin-grid">{data.map(d=><DiscountForm key={d.id} discount={d}/>)}</div>:<AdminNotice/>}<AdminPager page={page} hasMore={(data?.length??0)===25} base="/admin/discounts/"/><h2>Add code</h2><DiscountForm/></AdminShell>;
}
