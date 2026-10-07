"use client";
import { deleteSubscriber } from "@/lib/admin-actions";
export function DeleteSubscriber({id}:{id:string}){return <form action={deleteSubscriber} onSubmit={event=>{if(!window.confirm("Delete this subscriber? This cannot be undone."))event.preventDefault()}}><input type="hidden" name="id" value={id}/><button className="admin-secondary">Delete</button></form>}
