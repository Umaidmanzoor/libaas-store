import { notFound } from "next/navigation";
import { AdminShell,AdminFeedback } from "@/components/admin-shell";
import { adminPage } from "@/lib/admin-core";
import { ProductEditor } from "@/components/admin-product-editor";
export default async function EditProduct({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{result?:string}>}){const {db}=await adminPage(),{id}=await params,{result}=await searchParams;const [{data:p},{data:categories}]=await Promise.all([db.from("products").select("*,variants(id,sku,size,colour,stock,active,sort_order)").eq("id",id).maybeSingle(),db.from("categories").select("id,name").order("sort_order")]);if(!p)notFound();return <AdminShell title="Edit product"><AdminFeedback value={result}/><ProductEditor product={p} categories={categories??[]}/></AdminShell>}
