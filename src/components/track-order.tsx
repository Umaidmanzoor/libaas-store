"use client";
import { useEffect,useRef,useState } from "react";
import { useCatalogue } from "./catalogue-provider";
type OrderStatus={status:string;created_at:string;paid_at:string|null;shipped_at:string|null;delivered_at:string|null;courier:string|null;tracking_id:string|null};
export function TrackOrder(){
  const {configured}=useCatalogue(),started=useRef(0);
  const [order,setOrder]=useState<OrderStatus|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{started.current=Date.now();},[]);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(busy)return;
    setBusy(true);setMessage("");setOrder(null);
    const form=e.currentTarget,data=new FormData(form);
    try{const result=await fetch("/api/track/",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({number:data.get("number"),phone:data.get("phone"),website:data.get("website"),started_at:started.current})});
      const body=await result.json();if(result.ok)setOrder(body.order);else setMessage("We could not find that order.");
    }catch{setMessage("We could not find that order.");}finally{setBusy(false);}
  }
  return <div className="contact-layout"><form className="enquiry-form" onSubmit={submit}>
    <h2>Follow your piece.</h2>
    <label>Order number<input name="number" placeholder="LB-XXXXXXXX" required maxLength={11} autoComplete="off" /></label>
    <label>Phone number<input name="phone" type="tel" inputMode="numeric" maxLength={10} required autoComplete="tel-national" /></label>
    <div className="honeypot" aria-hidden="true"><label>Leave blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <button className="button primary" disabled={busy||!configured}>{busy?"Checking…":"Track order ↗"}</button>
    <p role="status" className="form-result">{!configured?"Order tracking is not configured yet.":message}</p>
  </form>{order&&<div className="order-summary"><h2>Your journey.</h2><ol className="tracking-timeline">
    <li>Received · {new Date(order.created_at).toLocaleDateString("en-IN")}</li>
    {order.paid_at&&<li>Paid · {new Date(order.paid_at).toLocaleDateString("en-IN")}</li>}
    {order.shipped_at&&<li>Shipped · {new Date(order.shipped_at).toLocaleDateString("en-IN")}{order.courier&&` · ${order.courier}`}{order.tracking_id&&` · ${order.tracking_id}`}</li>}
    {order.delivered_at&&<li>Delivered · {new Date(order.delivered_at).toLocaleDateString("en-IN")}</li>}
    {order.status==="cancelled"&&<li>Cancelled</li>}
    {order.status==="payment_failed"&&<li>Payment not completed</li>}
  </ol></div>}</div>;
}
