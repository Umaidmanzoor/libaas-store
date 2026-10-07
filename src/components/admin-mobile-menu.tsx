"use client";
import Link from "next/link";
import { useEffect,useRef } from "react";
import { logout } from "@/lib/admin-auth-actions";
export function AdminMobileMenu({items}:{items:string[][]}){
 const root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))root.current.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&root.current?.open){root.current.open=false;root.current.querySelector("summary")?.focus();}};
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[]);
 return <details ref={root} className="admin-mobile-nav"><summary>Menu</summary><div className="admin-mobile-menu"><nav aria-label="Owner navigation">{items.map(([label,href])=><Link prefetch={false} key={href} href={href} onClick={()=>{if(root.current)root.current.open=false;}}>{label}</Link>)}</nav><form action={logout}><button type="submit">Sign out</button></form></div></details>;
}
