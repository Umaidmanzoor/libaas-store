"use client";
import { useFormStatus } from "react-dom";
import { deleteCategory } from "@/lib/admin-actions";
function DeleteButton(){const {pending}=useFormStatus();return <button className="admin-category-remove" type="submit" disabled={pending}>{pending?"Removing…":"Confirm removal"}</button>}
export function DeleteCategory({id,name,categories}:{id:string;name:string;categories:{id:string;name:string}[]}){
 const alternatives=categories.filter(c=>c.id!==id);
 return <details className="admin-category-removal"><summary>Remove category</summary><form className="admin-form" action={deleteCategory} onSubmit={event=>{
 const data=new FormData(event.currentTarget),destination=categories.find(c=>c.id===data.get("destination"));
 if(!window.confirm(destination?`Move every product in ${name} to ${destination.name}, then remove ${name}? Products, stock and order history will be kept.`:`Remove ${name}? This cannot be undone. Removal will be blocked if it contains products.`))event.preventDefault();
 }}><input type="hidden" name="id" value={id}/><p>Keep your products by moving them to another collection before this category is removed.</p><label>Move products to<select name="destination" defaultValue=""><option value="">Remove only if empty</option>{alternatives.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{!alternatives.length&&<p>Create another category first if this one has products.</p>}<DeleteButton/></form></details>;
}
