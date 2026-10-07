import { AdminShell } from "@/components/admin-shell";
import { adminPage } from "@/lib/admin-core";
import { ProductEditor } from "@/components/admin-product-editor";
export default async function NewProduct(){const {db}=await adminPage();const {data:categories}=await db.from("categories").select("id,name").order("sort_order");return <AdminShell title="New product"><ProductEditor categories={categories??[]}/></AdminShell>}
