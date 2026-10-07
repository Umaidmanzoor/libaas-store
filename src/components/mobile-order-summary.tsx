"use client";
import {useState} from "react";
export function MobileOrderSummary({total,children}:{total:string;children:React.ReactNode}){const [open,setOpen]=useState(false);return <aside className="order-summary"><button type="button" className="checkout-summary-toggle" aria-expanded={open} aria-controls="checkout-summary-content" onClick={()=>setOpen(!open)}>Order summary <span>{total} {open?"−":"+"}</span></button><div id="checkout-summary-content" className={`summary-content ${open?"is-open":""}`}>{children}</div></aside>;}
